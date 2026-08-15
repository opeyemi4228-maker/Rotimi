import { currentSession } from "@/lib/session";
import { appoint, candidates, release, seatForAdmin } from "@/lib/appointments";
import { isApproverFor } from "@/lib/permissions";
import { limitShared, tooMany } from "@/lib/ratelimit";
import { report } from "@/lib/report";

export const runtime = "nodejs";

/**
 * Fill a seat, or empty one.
 *
 *   GET  ?seat=<id>&q=<name>   who this actor may appoint to that seat
 *   POST { seatId, memberId }  appoint
 *   POST { seatId, release }   end the current appointment
 *
 * Every path goes through canAdminister() in lib/permissions — strictly lower
 * tier, inside your territory — and none of them re-implements it. A seat the
 * actor may not touch answers 404 rather than 403: learning that a seat exists
 * in a territory you do not hold is itself something you are not entitled to.
 */
export async function GET(request) {
  const { member, scope } = await currentSession();
  if (!member) return Response.json({ error: "Sign in." }, { status: 401 });
  if (!scope) return Response.json({ error: "Not found." }, { status: 404 });

  const url = new URL(request.url);
  const seatId = url.searchParams.get("seat");
  if (!seatId || !/^\d+$/.test(seatId)) {
    return Response.json({ error: "Which seat?" }, { status: 400 });
  }

  const seat = await seatForAdmin(seatId);
  if (!seat || !isApproverFor(scope, seat)) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const rows = await candidates(scope, seat, { q: url.searchParams.get("q") ?? "" });

  return Response.json(
    {
      seat: {
        id: String(seat.id),
        title: seat.role.title,
        tier: seat.role.tier,
        unit:
          seat.pollingUnit?.name ??
          seat.ward?.name ??
          seat.lga?.name ??
          seat.state?.name ??
          seat.zone?.name ??
          "Nationwide",
        status: seat.status,
      },
      candidates: rows.map((row) => ({
        id: String(row.id),
        name: `${row.firstName} ${row.surname}`,
        membershipNo: row.membershipNo,
        verification: row.verification,
        photoUrl: row.photoUrl,
        ward: row.ward.name,
        phone: row.user.phone,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request) {
  const { member, scope } = await currentSession();
  if (!member) return Response.json({ error: "Sign in." }, { status: 401 });
  if (!scope) return Response.json({ error: "Not found." }, { status: 404 });

  const quota = await limitShared("appoint", `member:${member.id}`);
  if (!quota.ok) return tooMany(quota.retryAfter);

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const seatId = String(body?.seatId ?? "");
  if (!/^\d+$/.test(seatId)) return Response.json({ error: "Which seat?" }, { status: 400 });

  try {
    const result = body?.release
      ? await release({
          scope,
          actorId: member.id,
          seatId,
          reason: body.reason,
          note: body.note,
        })
      : await appoint({
          scope,
          actorId: member.id,
          seatId,
          memberId: String(body?.memberId ?? ""),
        });

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status ?? 422 });
    }
    return Response.json(result);
  } catch (error) {
    report(error, { context: "appointments", seatId, release: Boolean(body?.release) });
    return Response.json({ error: "That could not be saved. Try again." }, { status: 503 });
  }
}
