/**
 * The seats an officer may fill, and the seats a member may stand for.
 *
 * Two questions with two different answers, deliberately kept apart: an officer
 * sees the vacancies they are the approver for, and a member sees the vacancies
 * in the place they actually live. A National Coordinator is the approver for
 * eight national seats and no ward in the country; a member in Diobu can stand
 * for Diobu and its booths and nothing else.
 *
 * Server only.
 */

import { prisma } from "./db";
import { isApproverFor } from "./permissions";

const SEAT_SELECT = {
  id: true,
  status: true,
  seatIndex: true,
  scopeType: true,
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
    select: { name: true, lgaId: true, lga: { select: { stateId: true, state: { select: { zoneId: true } } } } },
  },
  pollingUnit: {
    select: {
      name: true,
      wardId: true,
      ward: { select: { lgaId: true, lga: { select: { stateId: true, state: { select: { zoneId: true } } } } } },
    },
  },
  appointments: {
    where: { status: "ACTIVE" },
    take: 1,
    select: {
      startDate: true,
      member: { select: { id: true, firstName: true, surname: true, membershipNo: true, photoUrl: true } },
    },
  },
  _count: { select: { applications: { where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } } } },
};

function shape(seat) {
  const held = seat.appointments[0];
  return {
    id: String(seat.id),
    title: seat.role.title,
    tier: seat.role.tier,
    seatIndex: seat.seatIndex,
    status: seat.status,
    unit:
      seat.pollingUnit?.name ??
      seat.ward?.name ??
      seat.lga?.name ??
      seat.state?.name ??
      seat.zone?.name ??
      "Nationwide",
    holder: held
      ? {
          id: String(held.member.id),
          name: `${held.member.firstName} ${held.member.surname}`,
          membershipNo: held.member.membershipNo,
          photoUrl: held.member.photoUrl,
          since: held.startDate,
        }
      : null,
    applications: seat._count.applications,
  };
}

/**
 * Every seat this officer appoints to — filled and vacant both, because the
 * power to fill a seat and the power to empty one are the same power and
 * hiding the filled ones would hide half the job.
 */
export async function seatsIAppointTo(scope, { take = 200 } = {}) {
  if (!scope) return [];

  /* Narrowed by the approver relationship, which is a role code rather than a
     column — so the candidates are fetched by territory and filtered by
     authority. The territory bound keeps that from being a full table scan:
     the widest case, a National Coordinator, is a handful of national seats. */
  const where = scope.isSuperAdmin
    ? {}
    : scope.scopeType === "NATION"
      ? {}
      : scope.scopeType === "ZONE"
        ? { OR: [{ zoneId: scope.zoneId }, { state: { zoneId: scope.zoneId } }] }
        : scope.scopeType === "STATE"
          ? { OR: [{ stateId: scope.stateId }, { lga: { stateId: scope.stateId } }] }
          : scope.scopeType === "LGA"
            ? { OR: [{ lgaId: scope.lgaId }, { ward: { lgaId: scope.lgaId } }] }
            : scope.scopeType === "WARD"
              ? { OR: [{ wardId: scope.wardId }, { pollingUnit: { wardId: scope.wardId } }] }
              : { id: BigInt(-1) };

  const rows = await prisma.seat.findMany({
    where,
    orderBy: [{ roleId: "asc" }, { seatIndex: "asc" }],
    take: take * 4,
    select: SEAT_SELECT,
  });

  return rows.filter((seat) => isApproverFor(scope, seat)).slice(0, take).map(shape);
}

/**
 * The vacancies a member may put themselves forward for: the ones in the place
 * they are registered, at their own ward and booth, plus their LGA and state.
 */
export async function vacanciesForMember(member) {
  const rows = await prisma.seat.findMany({
    where: {
      status: "VACANT",
      OR: [
        { wardId: member.wardId },
        { pollingUnit: { wardId: member.wardId } },
        { lgaId: member.lgaId },
        { stateId: member.stateId },
      ],
    },
    orderBy: [{ roleId: "asc" }, { seatIndex: "asc" }],
    take: 60,
    select: SEAT_SELECT,
  });

  return rows.map(shape);
}
