import { after } from "next/server";

import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { audienceNumbers, audience } from "@/lib/broadcast";
import { segments, sendBulk, smsProvider } from "@/lib/sms";
import { callerKey, limit, tooMany } from "@/lib/ratelimit";

export const runtime = "nodejs";

/* Long enough for a national send to finish inside one invocation, and short
   enough that a wedged gateway does not hold a function open all afternoon. */
export const maxDuration = 300;

const MAX_BODY = 1600; // ten GSM-7 segments. Past that it is a letter, not a text.

/**
 * Send a bulk SMS to the members in your own territory.
 *
 * ── WHAT IS TRUSTED ────────────────────────────────────────────────────────
 * The session cookie and the seat it resolves to. That is where the recipients
 * come from. The request body carries the message and two booleans, and nothing
 * else — there is no recipient list in it, so there is nothing to tamper with.
 *
 * ── WHY THE RESPONSE COMES BACK BEFORE THE SEND FINISHES ───────────────────
 * A National Coordinator's audience is the whole register. Handing a hundred
 * thousand numbers to a gateway takes minutes, and a browser tab that waits for
 * it will be closed, refreshed, or double-submitted long before it returns. So
 * the broadcast row is written and returned immediately, and the sending runs
 * in `after()` — the composer polls the row and watches the numbers move.
 *
 * The row is the source of truth throughout. If the invocation dies mid-send
 * the row stays SENDING with a real delivered count, which is the honest record
 * of what happened, rather than a success message for a job that stopped.
 * ───────────────────────────────────────────────────────────────────────────
 */
export async function POST(request) {
  const { member, scope } = await currentSession();

  if (!member) {
    return Response.json({ error: "Sign in." }, { status: 401 });
  }
  /* §6.11: `broadcast` is an admin capability. A functional director reads
     nationwide but does not speak for a territory, and a booth agent has no
     territory to speak for. */
  if (!scope || !can(scope, "broadcast")) {
    return Response.json(
      { error: "Your office does not carry the authority to send a broadcast." },
      { status: 403 }
    );
  }

  /* Rate limited by member, not by address: two coordinators on one office wifi
     must not exhaust each other's allowance, and one coordinator on four
     devices must not get four allowances. */
  const quota = limit("broadcast", `member:${member.id}`);
  if (!quota.ok) {
    return tooMany(
      quota.retryAfter,
      "You have sent several broadcasts recently. Wait before sending another."
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const body = String(payload?.body ?? "").trim();
  const verifiedOnly = payload?.verifiedOnly === true;

  if (!body) {
    return Response.json({ errors: { body: "Write the message first." } }, { status: 422 });
  }
  if (body.length > MAX_BODY) {
    return Response.json(
      { errors: { body: `That is ${body.length} characters. The limit is ${MAX_BODY}.` } },
      { status: 422 }
    );
  }

  const gateway = smsProvider();
  if (!gateway.configured) {
    /* Refused before a row is written. A broadcast recorded as QUEUED that can
       never leave is a lie in the history table. */
    return Response.json({ error: gateway.reason }, { status: 503 });
  }

  const numbers = await audienceNumbers(scope, { verifiedOnly });
  if (!numbers || numbers.length === 0) {
    return Response.json(
      { error: "There is nobody in your territory to send to." },
      { status: 422 }
    );
  }

  /* The sender confirms the count they were shown, and the server checks it
     against the count it just computed. If somebody registered in the ward
     while the message was being typed, the send stops and the coordinator is
     shown the new number — because "send to 412 people" must mean 412. */
  const confirmed = Number(payload?.confirmedRecipients);
  if (Number.isFinite(confirmed) && confirmed !== numbers.length) {
    return Response.json(
      {
        error: `The audience changed while you were writing: it is now ${numbers.length}, not ${confirmed}. Check the message and send again.`,
        recipients: numbers.length,
      },
      { status: 409 }
    );
  }

  const cost = segments(body);

  const broadcast = await prisma.broadcast.create({
    data: {
      senderId: BigInt(member.id),
      scopeType: scope.scopeType,
      scopeId: scope.wardId ?? scope.lgaId ?? scope.stateId ?? scope.zoneId ?? null,
      scopeLabel: scope.label,
      body,
      segments: cost.segments,
      recipients: numbers.length,
      status: "QUEUED",
      provider: gateway.name,
    },
    select: { id: true },
  });

  /* Written now, not when the send finishes. The authorising act is pressing
     send, and it belongs in the trail whether or not the gateway cooperates. */
  await prisma.auditLog
    .create({
      data: {
        actorId: BigInt(member.id),
        action: "BROADCAST",
        entityType: "broadcast",
        entityId: broadcast.id,
        scopeType: scope.scopeType,
        scopeId: scope.wardId ?? scope.lgaId ?? scope.stateId ?? scope.zoneId ?? null,
        afterState: {
          recipients: numbers.length,
          segments: cost.segments,
          verifiedOnly,
          provider: gateway.name,
        },
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
          request.headers.get("x-real-ip") ??
          null,
      },
    })
    .catch((error) => console.error("[broadcast] audit write failed", error));

  after(async () => {
    try {
      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: { status: "SENDING" },
      });

      const result = await sendBulk({
        numbers,
        body,
        /* Every batch, so a coordinator watching a national send sees it move
           rather than staring at zero for four minutes. */
        onProgress: async ({ accepted, failed }) => {
          await prisma.broadcast
            .update({
              where: { id: broadcast.id },
              data: { delivered: accepted, failed },
            })
            .catch(() => {});
        },
      });

      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: {
          delivered: result.accepted,
          failed: result.failed,
          rejected: result.rejected.length ? result.rejected : undefined,
          error: result.error,
          status:
            result.accepted === 0 ? "FAILED" : result.failed > 0 ? "PARTIAL" : "SENT",
          completedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("[broadcast] send failed", error);
      await prisma.broadcast
        .update({
          where: { id: broadcast.id },
          data: {
            status: "FAILED",
            error: error?.message?.slice(0, 500) ?? "The send failed.",
            completedAt: new Date(),
          },
        })
        .catch(() => {});
    }
  });

  return Response.json(
    {
      id: String(broadcast.id),
      recipients: numbers.length,
      segments: cost.segments,
      encoding: cost.encoding,
      credits: cost.segments * numbers.length,
      provider: gateway.name,
      status: "QUEUED",
    },
    { status: 202 }
  );
}

/** The audience count, for the composer to refresh when the filter changes. */
export async function GET(request) {
  const { member, scope } = await currentSession();
  if (!member) return Response.json({ error: "Sign in." }, { status: 401 });
  if (!scope || !can(scope, "broadcast")) {
    return Response.json({ error: "Not permitted." }, { status: 403 });
  }

  const verifiedOnly = new URL(request.url).searchParams.get("verifiedOnly") === "true";
  const counts = await audience(scope, { verifiedOnly });

  return Response.json(counts, { headers: { "Cache-Control": "no-store" } });
}
