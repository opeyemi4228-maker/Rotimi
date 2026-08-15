import QRCode from "qrcode";

import { prisma } from "@/lib/db";
import { currentMember } from "@/lib/session";
import { beginEnrolment, completeEnrolment, disable, mfaState } from "@/lib/mfa";
import { limitShared, tooMany } from "@/lib/ratelimit";

export const runtime = "nodejs";

/**
 * Turn two-factor authentication on and off.
 *
 *   GET                          what state this account is in
 *   POST { action: "begin" }     a secret and a QR to scan
 *   POST { action: "confirm" }   prove the app has it, switch it on, get the
 *                                recovery codes — once, and never again
 *   POST { action: "disable" }   requires a current code, not just a session
 *
 * Everything here is about the signed-in account and no other. There is no
 * member id in any payload, so there is nothing to tamper with: an
 * administrator cannot enrol or disarm somebody else's second factor from this
 * route, and deliberately so — a support path that can remove MFA is a support
 * path an attacker will use.
 */
export async function GET() {
  const member = await currentMember();
  if (!member) return Response.json({ error: "Sign in first." }, { status: 401 });

  return Response.json(await mfaState(member.userId), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  const member = await currentMember();
  if (!member) return Response.json({ error: "Sign in first." }, { status: 401 });

  const quota = await limitShared("mfa", `member:${member.id}`);
  if (!quota.ok) return tooMany(quota.retryAfter);

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const trail = (action, extra) =>
    prisma.auditLog
      .create({
        data: {
          actorId: BigInt(member.id),
          action,
          entityType: "user",
          entityId: BigInt(member.userId),
          afterState: extra ?? undefined,
          ipAddress:
            request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
            request.headers.get("x-real-ip") ??
            null,
        },
      })
      .catch((error) => console.error("[mfa] audit write failed", error));

  switch (body?.action) {
    case "begin": {
      const { secret, uri } = await beginEnrolment(member.userId, member.phone ?? member.name);
      /* The QR is rendered here rather than in the browser so the secret never
         has to be handed to a client library — though it is also returned as
         text, because a coordinator on a phone cannot scan a code with the same
         phone and has to type it. */
      const qr = await QRCode.toDataURL(uri, { margin: 1, width: 320, errorCorrectionLevel: "M" });
      return Response.json({ secret, uri, qr });
    }

    case "confirm": {
      const result = await completeEnrolment(member.userId, body.code);
      if (!result.ok) return Response.json({ error: result.error }, { status: 422 });
      await trail("MFA_ENABLED");
      /* The only time these are ever readable. */
      return Response.json({ ok: true, codes: result.codes });
    }

    case "disable": {
      const result = await disable(member.userId, body.code);
      if (!result.ok) return Response.json({ error: result.error }, { status: 422 });
      await trail("MFA_DISABLED");
      return Response.json({ ok: true });
    }

    default:
      return Response.json({ error: "Unknown action." }, { status: 400 });
  }
}
