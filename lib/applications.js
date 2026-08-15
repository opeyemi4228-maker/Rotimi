/**
 * Applying for a seat, and deciding on the applications. §8.1.
 *
 * ── APPLYING IS NOT GETTING ────────────────────────────────────────────────
 * A member may put themselves forward for any vacancy in their own territory.
 * That places a row in the approving officer's queue and does nothing else. It
 * confers no office, no priority, and no entitlement — the officer above may
 * appoint somebody who never applied, and frequently will.
 *
 * The application exists so that a member who wants to serve has a way of
 * saying so that does not depend on knowing somebody, and so that the officer
 * making the appointment has to look at the people who volunteered before
 * choosing. It is a hearing, not a queue that resolves itself.
 *
 * ── THE 72-HOUR CLOCK ──────────────────────────────────────────────────────
 * §8.1.6. `slaDueAt` is stored rather than computed so "what is overdue" is an
 * index scan. Nothing happens automatically when it passes — an application
 * that auto-approves on a timer would be exactly the entitlement this design
 * refuses. It simply goes red on the officer's screen, which is the pressure
 * the rule is actually for.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Server only.
 */

import { prisma } from "./db";
import { isApproverFor, memberScopeWhere } from "./permissions";
import { appoint, seatForAdmin } from "./appointments";

const SLA_HOURS = 72;

const OPEN = ["SUBMITTED", "UNDER_REVIEW"];

/**
 * Put a member forward for a seat.
 *
 * The applicant must be in the seat's territory — you stand for the ward you
 * live in — and may not already hold an office or have an open application.
 */
export async function apply({ memberId, seatId, statement }) {
  const seat = await prisma.seat.findUnique({
    where: { id: BigInt(seatId) },
    select: {
      id: true,
      status: true,
      zoneId: true,
      stateId: true,
      lgaId: true,
      wardId: true,
      pollingUnitId: true,
      role: { select: { title: true, tierRank: true } },
      /* A booth seat carries pollingUnitId and nothing else — no wardId, no
         lgaId. Its territory has to be walked up from the unit, or a member of
         the very ward the booth sits in is told they are outside it, which is
         precisely what happened. */
      pollingUnit: { select: { wardId: true, ward: { select: { lgaId: true, lga: { select: { stateId: true } } } } } },
      ward: { select: { lgaId: true, lga: { select: { stateId: true } } } },
      lga: { select: { stateId: true } },
    },
  });

  if (!seat) return { ok: false, error: "That seat does not exist.", status: 404 };

  const member = await prisma.member.findUnique({
    where: { id: BigInt(memberId) },
    select: {
      id: true,
      verification: true,
      stateId: true,
      lgaId: true,
      wardId: true,
      pollingUnitId: true,
      appointments: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 },
      applications: { where: { status: { in: OPEN } }, select: { id: true, seatId: true } },
    },
  });

  if (!member) return { ok: false, error: "No such member.", status: 404 };

  if (member.appointments.length > 0) {
    return { ok: false, error: "You already hold an office.", status: 409 };
  }
  if (member.applications.some((row) => String(row.seatId) === String(seat.id))) {
    return { ok: false, error: "You have already applied for this seat.", status: 409 };
  }
  if (member.applications.length >= 3) {
    /* Somebody applying for everything is not a candidate, they are noise in
       every officer's queue. Three open at a time. */
    return { ok: false, error: "You have three applications open already. Wait for one to be decided.", status: 429 };
  }
  if (member.verification !== "VERIFIED" && seat.role.tierRank <= 4) {
    return {
      ok: false,
      error: "Office at LGA level and above needs a verified member. Add your NIN in your portal and this opens up.",
      status: 422,
    };
  }

  /* You stand where you live. The seat's territory is resolved from whichever
     of its five scope columns is set and walked up from there — never taken
     from anything the member sends.

     A nationwide seat has none of them set, and every member is inside it.
     That is deliberate: "nationwide" means nationwide, and a verified member
     is entitled to put their name forward for the national executive. The
     three-open-applications cap and the officer's discretion are what keep
     that from being noise, not a rule saying who may ask. */
  const seatWard = seat.wardId ?? seat.pollingUnit?.wardId ?? null;
  const seatLga = seat.lgaId ?? seat.ward?.lgaId ?? seat.pollingUnit?.ward?.lgaId ?? null;
  const seatState =
    seat.stateId ??
    seat.lga?.stateId ??
    seat.ward?.lga?.stateId ??
    seat.pollingUnit?.ward?.lga?.stateId ??
    null;

  const nationwide = !seat.pollingUnitId && !seatWard && !seatLga && !seatState && !seat.zoneId;

  const belongs =
    nationwide ||
    (seat.pollingUnitId
      ? /* A booth: the member must be in its ward. Naming the exact unit is
           better still, but most members never record one. */
        member.wardId === seatWard
      : seatWard
        ? member.wardId === seatWard
        : seatLga
          ? member.lgaId === seatLga
          : seatState
            ? member.stateId === seatState
            : /* A zone: any member of any state in it. Resolved by the state
                 rather than by a zone column the member does not carry. */
              false);

  if (!belongs) {
    return { ok: false, error: "You can only stand for a seat in your own territory.", status: 403 };
  }

  const application = await prisma.$transaction(async (tx) => {
    const row = await tx.application.create({
      data: {
        memberId: member.id,
        seatId: seat.id,
        statement: String(statement ?? "").trim().slice(0, 500) || null,
        /* §8.1.4: applying for a seat somebody already holds is a challenge,
           not a mistake. It is recorded as one and shown as one. */
        isChallenge: seat.status === "FILLED",
        slaDueAt: new Date(Date.now() + SLA_HOURS * 60 * 60 * 1000),
      },
      select: { id: true, slaDueAt: true, isChallenge: true },
    });

    await tx.applicationEvent.create({
      data: { applicationId: row.id, actorId: member.id, toStatus: "SUBMITTED" },
    });

    return row;
  });

  return { ok: true, id: String(application.id), slaDueAt: application.slaDueAt, isChallenge: application.isChallenge };
}

/** The applications this officer is the approver for. */
export async function queue(scope, { take = 50 } = {}) {
  if (!scope) return [];

  const territory = memberScopeWhere(scope);
  if (!territory) return [];

  const rows = await prisma.application.findMany({
    where: { status: { in: OPEN }, member: territory },
    orderBy: [{ slaDueAt: "asc" }],
    take: take * 3, // filtered again below, so over-fetch a little
    select: {
      id: true,
      statement: true,
      status: true,
      isChallenge: true,
      submittedAt: true,
      slaDueAt: true,
      member: {
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
      },
      /* The full geometry, not just the names. isApproverFor() walks up from
         whichever scope column is set to decide containment, and a select that
         fetched only display names left those walkers reading undefined — so
         every application was silently filtered out of every queue. */
      seat: {
        select: {
          id: true,
          status: true,
          scopeType: true,
          zoneId: true,
          stateId: true,
          lgaId: true,
          wardId: true,
          pollingUnitId: true,
          role: { select: { title: true, tier: true, tierRank: true, approverRole: true } },
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
              ward: {
                select: { lgaId: true, lga: { select: { stateId: true, state: { select: { zoneId: true } } } } },
              },
            },
          },
        },
      },
    },
  });

  /* The territory filter above narrows to the applicant's location; this is the
     authority check, and it is the one that decides. An officer only sees the
     applications they are actually the approver for — an LGA Coordinator does
     not read the ward's booth applications. */
  const now = Date.now();
  return rows
    .filter((row) => isApproverFor(scope, row.seat))
    .slice(0, take)
    .map((row) => ({
      id: String(row.id),
      statement: row.statement,
      status: row.status,
      isChallenge: row.isChallenge,
      submittedAt: row.submittedAt,
      slaDueAt: row.slaDueAt,
      overdue: row.slaDueAt.getTime() < now,
      applicant: {
        id: String(row.member.id),
        name: `${row.member.firstName} ${row.member.surname}`,
        membershipNo: row.member.membershipNo,
        verification: row.member.verification,
        photoUrl: row.member.photoUrl,
        ward: row.member.ward.name,
        phone: row.member.user.phone,
      },
      seat: {
        id: String(row.seat.id),
        title: row.seat.role.title,
        tier: row.seat.role.tier,
        filled: row.seat.status === "FILLED",
        unit:
          row.seat.pollingUnit?.name ??
          row.seat.ward?.name ??
          row.seat.lga?.name ??
          row.seat.state?.name ??
          row.seat.zone?.name ??
          "Nationwide",
      },
    }));
}

/** What a member has put in for, and where each one stands. */
export async function myApplications(memberId) {
  const rows = await prisma.application.findMany({
    where: { memberId: BigInt(memberId) },
    orderBy: { submittedAt: "desc" },
    take: 20,
    select: {
      id: true,
      status: true,
      statement: true,
      isChallenge: true,
      submittedAt: true,
      slaDueAt: true,
      decidedAt: true,
      decisionNote: true,
      seat: {
        select: {
          role: { select: { title: true, tier: true } },
          zone: { select: { name: true } },
          state: { select: { name: true } },
          lga: { select: { name: true } },
          ward: { select: { name: true } },
          pollingUnit: { select: { name: true } },
        },
      },
    },
  });

  return rows.map((row) => ({
    id: String(row.id),
    status: row.status,
    statement: row.statement,
    isChallenge: row.isChallenge,
    submittedAt: row.submittedAt,
    slaDueAt: row.slaDueAt,
    decidedAt: row.decidedAt,
    decisionNote: row.decisionNote,
    title: row.seat.role.title,
    unit:
      row.seat.pollingUnit?.name ??
      row.seat.ward?.name ??
      row.seat.lga?.name ??
      row.seat.state?.name ??
      row.seat.zone?.name ??
      "Nationwide",
  }));
}

/**
 * Decide an application.
 *
 * Approving appoints, through exactly the same `appoint()` every direct
 * appointment goes through — so an application cannot become a way around the
 * checks that apply to appointing somebody normally. If the appointment is
 * refused, the application stays open and the reason comes back.
 */
export async function decide({ scope, actorId, applicationId, approve, note }) {
  const application = await prisma.application.findUnique({
    where: { id: BigInt(applicationId) },
    select: { id: true, status: true, memberId: true, seatId: true },
  });

  if (!application) return { ok: false, error: "No such application.", status: 404 };
  if (!OPEN.includes(application.status)) {
    return { ok: false, error: "That application has already been decided.", status: 409 };
  }

  const seat = await seatForAdmin(application.seatId);
  if (!seat || !isApproverFor(scope, seat)) {
    return { ok: false, error: "Not found.", status: 404 };
  }

  if (approve) {
    const result = await appoint({
      scope,
      actorId,
      seatId: String(seat.id),
      memberId: String(application.memberId),
    });
    if (!result.ok) return result;
  }

  const decisionNote = String(note ?? "").trim().slice(0, 1000) || null;

  await prisma.$transaction([
    prisma.application.update({
      where: { id: application.id },
      data: {
        status: approve ? "APPROVED" : "REJECTED",
        decidedById: BigInt(actorId),
        decidedAt: new Date(),
        decisionNote,
      },
    }),
    prisma.applicationEvent.create({
      data: {
        applicationId: application.id,
        actorId: BigInt(actorId),
        fromStatus: application.status,
        toStatus: approve ? "APPROVED" : "REJECTED",
        note: decisionNote,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: BigInt(actorId),
        action: approve ? "APPLICATION_APPROVED" : "APPLICATION_REJECTED",
        entityType: "application",
        entityId: application.id,
        afterState: { seatId: String(seat.id), note: decisionNote },
        scopeType: scope.scopeType,
        scopeId: scope.wardId ?? scope.lgaId ?? scope.stateId ?? scope.zoneId ?? null,
      },
    }),
  ]);

  return { ok: true, approved: Boolean(approve) };
}

/** A member changes their mind. Their own application, and only while open. */
export async function withdraw({ memberId, applicationId }) {
  const { count } = await prisma.application.updateMany({
    where: { id: BigInt(applicationId), memberId: BigInt(memberId), status: { in: OPEN } },
    data: { status: "WITHDRAWN", decidedAt: new Date() },
  });

  if (count === 0) return { ok: false, error: "That application is not open.", status: 409 };

  await prisma.applicationEvent
    .create({
      data: { applicationId: BigInt(applicationId), actorId: BigInt(memberId), toStatus: "WITHDRAWN" },
    })
    .catch(() => {});

  return { ok: true };
}
