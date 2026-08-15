import { currentSession } from "@/lib/session";
import { apply, decide, myApplications, withdraw } from "@/lib/applications";
import { limitShared, tooMany } from "@/lib/ratelimit";
import { report } from "@/lib/report";

export const runtime = "nodejs";

/**
 * Standing for office, and deciding who gets it.
 *
 *   GET                                    what I have applied for
 *   POST { seatId, statement }             apply
 *   POST { applicationId, withdraw }       withdraw my own
 *   POST { applicationId, approve, note }  decide — approver only
 *
 * Applying is not getting. An approved application appoints through exactly the
 * same appoint() a direct appointment uses, so it cannot become a way around
 * the checks that apply to appointing somebody normally — and an officer is
 * free to appoint somebody who never applied at all.
 */
export async function GET() {
  const { member } = await currentSession();
  if (!member) return Response.json({ error: "Sign in." }, { status: 401 });

  return Response.json(
    { applications: await myApplications(member.id) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request) {
  const { member, scope } = await currentSession();
  if (!member) return Response.json({ error: "Sign in." }, { status: 401 });

  const quota = await limitShared("apply", `member:${member.id}`);
  if (!quota.ok) return tooMany(quota.retryAfter);

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  try {
    /* ── withdraw my own ─────────────────────────────────────────────── */
    if (body?.withdraw) {
      const result = await withdraw({ memberId: member.id, applicationId: body.applicationId });
      return result.ok
        ? Response.json(result)
        : Response.json({ error: result.error }, { status: result.status });
    }

    /* ── decide somebody else's ──────────────────────────────────────── */
    if (body?.applicationId) {
      if (!scope) return Response.json({ error: "Not found." }, { status: 404 });
      const result = await decide({
        scope,
        actorId: member.id,
        applicationId: body.applicationId,
        approve: body.approve === true,
        note: body.note,
      });
      return result.ok
        ? Response.json(result)
        : Response.json({ error: result.error }, { status: result.status ?? 422 });
    }

    /* ── apply ───────────────────────────────────────────────────────── */
    const result = await apply({
      memberId: member.id,
      seatId: String(body?.seatId ?? ""),
      statement: body?.statement,
    });

    return result.ok
      ? Response.json(result, { status: 201 })
      : Response.json({ error: result.error }, { status: result.status ?? 422 });
  } catch (error) {
    report(error, { context: "applications", memberId: member.id });
    return Response.json({ error: "That could not be saved. Try again." }, { status: 503 });
  }
}
