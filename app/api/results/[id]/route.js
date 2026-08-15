import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/session";
import { scopeContains, TIER_RANK } from "@/lib/permissions";
import { limitShared, tooMany } from "@/lib/ratelimit";
import { report } from "@/lib/report";

export const runtime = "nodejs";

const ALLOWED = new Set(["VERIFIED", "DISPUTED", "SUBMITTED"]);

/**
 * Check a return against the sheet, and say so.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * The schema has had VERIFIED and DISPUTED since the results tables were built
 * and nothing could set them. A return arrived as SUBMITTED and stayed there
 * for ever, which made the status column decoration and left the movement with
 * no way to say "we have looked at the photograph and the numbers match" — or,
 * more importantly, "we have looked and they do not".
 *
 * ── WHO MAY DO IT ──────────────────────────────────────────────────────────
 * A coordinator strictly above the booth whose territory contains it. Ward and
 * up, because the agent who filed it is the Polling Unit Coordinator and the
 * one person who must never mark their own work verified is the person who
 * wrote it. That is checked explicitly as well as structurally: even a National
 * Coordinator cannot verify a return they filed themselves.
 *
 * ── WHY DISPUTED IS NOT DELETED ────────────────────────────────────────────
 * A disputed return stays in the table, keeps its sheet, and stops counting.
 * Deleting it would be the single most suspicious thing this system could do,
 * and the note explaining the dispute is the part somebody will want to read a
 * year later.
 * ───────────────────────────────────────────────────────────────────────────
 */
export async function PATCH(request, { params }) {
  const { member, scope } = await currentSession();
  if (!member) return Response.json({ error: "Sign in." }, { status: 401 });
  if (!scope) return Response.json({ error: "Not permitted." }, { status: 403 });

  const quota = await limitShared("verifyReturn", `member:${member.id}`);
  if (!quota.ok) return tooMany(quota.retryAfter);

  const { id } = await params;
  if (!/^\d+$/.test(id)) return Response.json({ error: "Not found." }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const status = String(body?.status ?? "");
  if (!ALLOWED.has(status)) {
    return Response.json({ error: "Unknown status." }, { status: 422 });
  }

  const note = String(body?.note ?? "").trim().slice(0, 1000) || null;
  /* A dispute without a reason is an accusation nobody can act on. Verifying
     needs no note; disputing does. */
  if (status === "DISPUTED" && !note) {
    return Response.json(
      { errors: { note: "Say what is wrong with it. A dispute with no reason cannot be acted on." } },
      { status: 422 }
    );
  }

  const result = await prisma.pollingUnitResult.findUnique({
    where: { id: BigInt(id) },
    select: {
      id: true,
      status: true,
      submittedById: true,
      note: true,
      pollingUnit: {
        select: {
          id: true,
          name: true,
          wardId: true,
          ward: { select: { lgaId: true, lga: { select: { stateId: true, state: { select: { zoneId: true } } } } } },
        },
      },
    },
  });

  if (!result) return Response.json({ error: "Not found." }, { status: 404 });

  /* Containment, expressed as a seat-shaped object so the same scopeContains()
     every other check uses can answer it. Nothing here invents its own
     territory logic. */
  const asSeat = {
    scopeType: "POLLING_UNIT",
    pollingUnitId: result.pollingUnit.id,
    wardId: result.pollingUnit.wardId,
    lgaId: result.pollingUnit.ward.lgaId,
    stateId: result.pollingUnit.ward.lga.stateId,
    zoneId: result.pollingUnit.ward.lga.state.zoneId,
    pollingUnit: { wardId: result.pollingUnit.wardId },
  };

  const above = scope.tierRank < TIER_RANK.POLLING_UNIT;
  if (!above || !scopeContains(scope, asSeat)) {
    /* 404 rather than 403: a coordinator in Edo learning that a Rivers booth
       exists and has filed is itself information they are not entitled to. */
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  if (String(result.submittedById) === String(member.id)) {
    return Response.json(
      { error: "You filed this return. Somebody else has to check it." },
      { status: 403 }
    );
  }

  if (result.status === status) {
    return Response.json({ ok: true, unchanged: true, status });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.pollingUnitResult.update({
        where: { id: result.id },
        data: {
          status,
          /* Only a verification records a verifier. Re-opening a return clears
             it, because the person who checked it is no longer standing behind
             the numbers. */
          verifiedById: status === "VERIFIED" ? BigInt(member.id) : null,
          verifiedAt: status === "VERIFIED" ? new Date() : null,
          note,
        },
        select: { id: true, status: true, verifiedAt: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: BigInt(member.id),
          action: `RESULT_${status}`,
          entityType: "polling_unit_result",
          entityId: result.id,
          beforeState: { status: result.status, note: result.note },
          afterState: { status, note },
          scopeType: scope.scopeType,
          scopeId: scope.wardId ?? scope.lgaId ?? scope.stateId ?? scope.zoneId ?? null,
          ipAddress:
            request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
            request.headers.get("x-real-ip") ??
            null,
        },
      });

      return row;
    });

    return Response.json({
      ok: true,
      status: updated.status,
      unit: result.pollingUnit.name,
      verifiedAt: updated.verifiedAt,
    });
  } catch (error) {
    report(error, { context: "result-review", resultId: id, status });
    return Response.json({ error: "That could not be saved. Try again." }, { status: 503 });
  }
}
