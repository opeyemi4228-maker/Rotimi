/**
 * Filling a seat, and emptying one. §6.9 and §8.4.
 *
 * ── WHY THIS COULD NOT BE DONE THROUGH THE APP UNTIL NOW ───────────────────
 * It could not be done at all. Seats were filled by seed script, which meant
 * the entire structure — 92,184 organisational seats — was maintainable only by
 * somebody with a terminal and the database URL. A movement whose Ward
 * Coordinators cannot appoint their own booth agents does not have a structure,
 * it has a spreadsheet somebody else owns.
 *
 * ── THE TWO RULES, BOTH ENFORCED HERE ──────────────────────────────────────
 * canAdminister(): strictly lower tier, and inside your territory. Already
 * written, already tested, and this file does not get its own opinion.
 *
 * One active appointment per member: a person holds one office. Enforced by a
 * partial unique index in the migration as well as checked here, because the
 * check has a race in it and the index does not.
 *
 * ── AND WHY NOTHING IS EVER DELETED ────────────────────────────────────────
 * Ending an appointment sets endDate, endReason and status. The row stays, so
 * the history of who held what and when is reconstructable — which is the whole
 * point of §8.4 and the only way a succession dispute can be settled by looking
 * rather than by arguing.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Server only.
 */

import { prisma } from "./db";
import { canAdminister, isApproverFor, memberScopeWhere } from "./permissions";

/* The EndReason enum, as a set the route can validate against. Anything else
   becomes OTHER rather than throwing — an appointment that cannot be ended
   because a dropdown sent an unexpected string is a worse failure than an
   imprecise reason. */
export const END_REASONS = new Set([
  "INACTIVITY",
  "MISCONDUCT",
  "ANTI_PARTY_ACTIVITY",
  "RESTRUCTURING",
  "RESIGNATION",
  "TRANSFER",
  "OTHER",
]);

const SEAT_FOR_CHECK = {
  id: true,
  status: true,
  scopeType: true,
  seatIndex: true,
  zoneId: true,
  stateId: true,
  lgaId: true,
  wardId: true,
  pollingUnitId: true,
  role: { select: { code: true, title: true, tier: true, tierRank: true, approverRole: true } },
  zone: { select: { name: true } },
  state: { select: { name: true, zoneId: true } },
  lga: { select: { name: true, stateId: true, state: { select: { zoneId: true } } } },
  ward: {
    select: {
      name: true,
      lgaId: true,
      lga: { select: { stateId: true, state: { select: { zoneId: true } } } },
    },
  },
  pollingUnit: {
    select: {
      name: true,
      wardId: true,
      ward: { select: { lgaId: true, lga: { select: { stateId: true, state: { select: { zoneId: true } } } } } },
    },
  },
};

/** The seat, shaped the way canAdminister() expects to read it. */
export async function seatForAdmin(seatId) {
  return prisma.seat.findUnique({ where: { id: BigInt(seatId) }, select: SEAT_FOR_CHECK });
}

/** Who this actor could appoint to this seat: members in the seat's own
    territory, not already holding an office. */
export async function candidates(scope, seat, { q = "", take = 20 } = {}) {
  const territory = memberScopeWhere(scope);
  if (!territory) return [];

  /* Narrowed to the seat's own unit, not merely the actor's territory. A Ward
     Coordinator appointing a booth agent should be choosing from that ward, and
     a State Coordinator filling an LGA seat from that LGA — offering the whole
     state would make the common case a search problem. */
  const place = seat.pollingUnitId
    ? { OR: [{ pollingUnitId: seat.pollingUnitId }, { wardId: seat.pollingUnit.wardId }] }
    : seat.wardId
      ? { wardId: seat.wardId }
      : seat.lgaId
        ? { lgaId: seat.lgaId }
        : seat.stateId
          ? { stateId: seat.stateId }
          : seat.zoneId
            ? { state: { zoneId: seat.zoneId } }
            : {};

  const search = q.trim();

  return prisma.member.findMany({
    where: {
      AND: [
        territory,
        place,
        { verification: { not: "REJECTED" } },
        /* Somebody already holding an office cannot take a second one. Shown
           as absent from the list rather than offered and then refused. */
        { appointments: { none: { status: "ACTIVE" } } },
        search
          ? {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { surname: { contains: search, mode: "insensitive" } },
                { membershipNo: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    orderBy: [{ verification: "asc" }, { surname: "asc" }],
    take,
    select: {
      id: true,
      firstName: true,
      surname: true,
      membershipNo: true,
      verification: true,
      photoUrl: true,
      ward: { select: { name: true } },
      user: { select: { phone: true } },
    },
  });
}

/**
 * Appoint a member to a seat.
 *
 * Returns `{ ok }` or `{ ok: false, error }`. Everything that could go wrong is
 * a sentence somebody can act on rather than a constraint name.
 */
export async function appoint({ scope, actorId, seatId, memberId }) {
  /* Validated before anything is read. BigInt("") throws, which turned a
     missing field into a 503 and an entry in the error log rather than the
     sentence the caller needed. */
  if (!/^\d+$/.test(String(memberId ?? ""))) {
    return { ok: false, error: "Choose somebody to appoint.", status: 422 };
  }

  const seat = await seatForAdmin(seatId);
  if (!seat) return { ok: false, error: "That seat does not exist.", status: 404 };

  /* Appointment follows the chain: the office named as this seat's approver,
     and nobody else. A National Coordinator does not reach past four tiers into
     a ward — the State Coordinator appoints the LGA, the LGA appoints the ward,
     the ward appoints the booth, so every officer is answerable to whoever put
     them there. */
  if (!isApproverFor(scope, seat)) {
    return {
      ok: false,
      error: "That seat is not yours to fill — it is filled by the office directly above it.",
      status: 404,
    };
  }

  const territory = memberScopeWhere(scope);
  const member = await prisma.member.findFirst({
    where: { AND: [{ id: BigInt(memberId) }, territory ?? {}] },
    select: {
      id: true,
      firstName: true,
      surname: true,
      verification: true,
      appointments: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 },
    },
  });

  if (!member) {
    return { ok: false, error: "That member is not in your territory.", status: 404 };
  }
  if (member.appointments.length > 0) {
    return {
      ok: false,
      error: "That member already holds an office. End it before appointing them to another.",
      status: 409,
    };
  }
  /* §7.2 ties verification to office above the ward. A rejected member is out
     entirely; a pending one may hold a ward or booth seat and nothing higher. */
  if (member.verification !== "VERIFIED" && seat.role.tierRank <= 4) {
    return {
      ok: false,
      error: "Office at LGA level and above needs a verified member. They can verify themselves with their NIN in a minute.",
      status: 422,
    };
  }
  if (seat.status === "FILLED") {
    return { ok: false, error: "Somebody already holds that seat.", status: 409 };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.appointment.create({
        data: {
          seatId: seat.id,
          memberId: member.id,
          appointedById: BigInt(actorId),
          status: "ACTIVE",
        },
      });
      await tx.seat.update({ where: { id: seat.id }, data: { status: "FILLED" } });
      await tx.auditLog.create({
        data: {
          actorId: BigInt(actorId),
          action: "APPOINTED",
          entityType: "seat",
          entityId: seat.id,
          afterState: {
            member: `${member.firstName} ${member.surname}`,
            memberId: String(member.id),
            role: seat.role.title,
          },
          scopeType: scope.scopeType,
          scopeId: scope.wardId ?? scope.lgaId ?? scope.stateId ?? scope.zoneId ?? null,
        },
      });
    });
  } catch (error) {
    /* The partial unique index caught what the check above raced past. */
    if (error?.code === "P2002") {
      return { ok: false, error: "That seat or that member was taken a moment ago. Reload and try again.", status: 409 };
    }
    throw error;
  }

  return { ok: true, member: `${member.firstName} ${member.surname}`, role: seat.role.title };
}

/** End an appointment. The row stays; only its status and end date change. */
export async function release({ scope, actorId, seatId, reason, note }) {
  const seat = await seatForAdmin(seatId);
  if (!seat) return { ok: false, error: "That seat does not exist.", status: 404 };

  if (!canAdminister(scope, seat)) {
    return { ok: false, error: "That seat is not yours to empty.", status: 404 };
  }

  const active = await prisma.appointment.findFirst({
    where: { seatId: seat.id, status: "ACTIVE" },
    select: { id: true, member: { select: { id: true, firstName: true, surname: true } } },
  });

  if (!active) {
    /* Self-healing: a seat marked FILLED with nobody in it is one of the
       integrity checks on the console, and this is where it gets fixed. */
    await prisma.seat.update({ where: { id: seat.id }, data: { status: "VACANT" } });
    return { ok: true, alreadyEmpty: true };
  }

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id: active.id },
      data: {
        status: "ENDED",
        endDate: new Date(),
        endReason: END_REASONS.has(reason) ? reason : "OTHER",
        endNote: note?.trim()?.slice(0, 500) || null,
      },
    });
    await tx.seat.update({ where: { id: seat.id }, data: { status: "VACANT" } });
    await tx.auditLog.create({
      data: {
        actorId: BigInt(actorId),
        action: "APPOINTMENT_ENDED",
        entityType: "seat",
        entityId: seat.id,
        beforeState: {
          member: `${active.member.firstName} ${active.member.surname}`,
          memberId: String(active.member.id),
        },
        afterState: { reason: END_REASONS.has(reason) ? reason : "OTHER", note: note ?? null },
        scopeType: scope.scopeType,
        scopeId: scope.wardId ?? scope.lgaId ?? scope.stateId ?? scope.zoneId ?? null,
      },
    });
  });

  return { ok: true, member: `${active.member.firstName} ${active.member.surname}` };
}
