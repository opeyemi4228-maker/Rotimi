import crypto from "node:crypto";

import { prisma } from "./db";

/**
 * Filing a return from a polling unit.
 *
 * ── THE ONE RULE THIS FILE ENFORCES ────────────────────────────────────────
 * An agent files for the polling unit their seat is at, and for no other. The
 * unit is never read from the request — it is read from the appointment, on
 * the server, on every submission. A form field naming the booth would be a
 * form field somebody could change.
 *
 * That is also why the location tick is not the security control. It is a
 * declaration by a named person that they are standing where the system
 * already believes they are, and it is stored as evidence of that declaration.
 * The two together are what makes a return attributable.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Server only.
 */

/** The seat an agent files under, with everywhere it rolls up to. */
export async function agentPost(memberId) {
  const appointment = await prisma.appointment.findFirst({
    where: {
      memberId: BigInt(memberId),
      status: "ACTIVE",
      seat: { scopeType: "POLLING_UNIT" },
    },
    select: {
      seat: {
        select: {
          pollingUnit: {
            select: {
              id: true,
              code: true,
              name: true,
              ward: {
                select: {
                  id: true,
                  name: true,
                  lga: {
                    select: { id: true, name: true, state: { select: { id: true, name: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const unit = appointment?.seat.pollingUnit;
  if (!unit) return null;

  return {
    pollingUnitId: unit.id,
    code: unit.code,
    name: unit.name,
    wardId: unit.ward.id,
    ward: unit.ward.name,
    lgaId: unit.ward.lga.id,
    lga: unit.ward.lga.name,
    stateId: unit.ward.lga.state.id,
    state: unit.ward.lga.state.name,
  };
}

/** Every election currently accepting returns, with this agent's so far. */
export async function agentElections(pollingUnitId) {
  const [elections, filed] = await Promise.all([
    prisma.election.findMany({
      where: { status: "OPEN" },
      orderBy: [{ heldOn: "asc" }, { type: "asc" }],
      select: { id: true, type: true, name: true, heldOn: true },
    }),
    prisma.pollingUnitResult.findMany({
      where: { pollingUnitId },
      select: {
        id: true,
        electionId: true,
        status: true,
        submittedAt: true,
        votes: { select: { partyId: true, votes: true } },
        sheet: { select: { version: true } },
      },
    }),
  ]);

  const byElection = new Map(filed.map((row) => [row.electionId, row]));

  return elections.map((election) => {
    const result = byElection.get(election.id);
    return {
      id: election.id,
      type: election.type,
      name: election.name,
      heldOn: election.heldOn.toISOString(),
      filed: result
        ? {
            id: String(result.id),
            status: result.status,
            at: result.submittedAt.toISOString(),
            total: result.votes.reduce((sum, vote) => sum + vote.votes, 0),
            hasSheet: Boolean(result.sheet),
          }
        : null,
    };
  });
}

/** The ballot: every party, in the order they appear on the form. */
export function ballot() {
  return prisma.party.findMany({
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    select: { id: true, code: true, name: true, colour: true },
  });
}

/* ------------------------------------------------------------------ filing */

/**
 * Check a return before it is written.
 *
 * These are arithmetic facts about a ballot box, not opinions: you cannot cast
 * more votes than were accredited, and you cannot accredit more people than
 * are registered. A return that breaks either is far more likely to be a
 * mistyped figure than a discovery, and catching it at the booth is the only
 * place it can still be checked against the sheet in the agent's hand.
 */
export function validateReturn({ votes, accredited, registered, rejected }) {
  const errors = {};
  const cast = Object.values(votes).reduce((sum, value) => sum + value, 0);

  if (registered != null && registered < 0) errors.registered = "Cannot be negative.";
  if (accredited != null && accredited < 0) errors.accredited = "Cannot be negative.";
  if (rejected != null && rejected < 0) errors.rejected = "Cannot be negative.";

  /* A party cannot score a negative number of votes.
     The route that feeds this strips everything but digits, so nothing can
     arrive negative through the form today — which is exactly why this was
     missing, and exactly why it belongs here anyway. `validateReturn` is the
     guard, not the parser: the day a second caller appears, or the day that
     regex is relaxed to accept a minus sign by accident, this is the check that
     has to hold. A negative vote also makes the accreditation test below pass
     by cancelling out a real one, so its absence was not merely untidy. */
  if (Object.values(votes).some((value) => !Number.isFinite(value) || value < 0)) {
    errors.votes = "A party's votes cannot be negative.";
  }

  if (registered != null && accredited != null && accredited > registered) {
    errors.accredited = `More accredited (${accredited.toLocaleString()}) than registered (${registered.toLocaleString()}).`;
  }

  if (accredited != null && cast + (rejected ?? 0) > accredited) {
    errors.votes = `${(cast + (rejected ?? 0)).toLocaleString()} ballots accounted for, but only ${accredited.toLocaleString()} people were accredited.`;
  }

  if (cast === 0) errors.votes = "Enter the votes from the sheet. A return of nothing is not a return.";

  return { ok: Object.keys(errors).length === 0, errors, cast };
}

/**
 * Write the return.
 *
 * Upsert on (election, polling unit): a booth reports once, and a correction
 * amends that row rather than adding a second. Two returns from one booth is
 * exactly the ambiguity this table exists to prevent.
 *
 * A verified return that is amended drops back to SUBMITTED — the check it
 * passed was against numbers that have since changed.
 */
export async function fileReturn({ post, electionId, memberId, values, sheet }) {
  const { votes, registered, accredited, rejected, inecAccredited, inecTotalVotes, note } = values;

  return prisma.$transaction(async (tx) => {
    const result = await tx.pollingUnitResult.upsert({
      where: { electionId_pollingUnitId: { electionId, pollingUnitId: post.pollingUnitId } },
      create: {
        electionId,
        pollingUnitId: post.pollingUnitId,
        // Denormalised from the seat, never from the request.
        wardId: post.wardId,
        lgaId: post.lgaId,
        stateId: post.stateId,
        registeredVoters: registered,
        accreditedVoters: accredited,
        rejectedBallots: rejected,
        inecAccredited,
        inecTotalVotes,
        locationConfirmed: true,
        termsAccepted: true,
        submittedById: BigInt(memberId),
        note,
      },
      update: {
        registeredVoters: registered,
        accreditedVoters: accredited,
        rejectedBallots: rejected,
        inecAccredited,
        inecTotalVotes,
        note,
        status: "SUBMITTED",
        verifiedById: null,
        verifiedAt: null,
        submittedById: BigInt(memberId),
        submittedAt: new Date(),
      },
    });

    /* Replace rather than merge. A party the agent has removed from the return
       has to disappear from it, and an update-only path would leave the old
       figure behind. */
    await tx.resultVote.deleteMany({ where: { resultId: result.id } });
    await tx.resultVote.createMany({
      data: Object.entries(votes)
        .filter(([, count]) => count > 0)
        .map(([partyId, count]) => ({
          resultId: result.id,
          partyId: Number(partyId),
          votes: count,
        })),
    });

    if (sheet) {
      const version = crypto.createHash("sha256").update(sheet.bytes).digest("hex").slice(0, 16);
      await tx.resultSheet.upsert({
        where: { resultId: result.id },
        create: { resultId: result.id, ...sheet, version },
        update: { ...sheet, version },
      });
    }

    return result;
  });
}

/** One agent's own return, for showing back to them. */
export async function ownReturn(pollingUnitId, electionId) {
  const row = await prisma.pollingUnitResult.findUnique({
    where: { electionId_pollingUnitId: { electionId, pollingUnitId } },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      registeredVoters: true,
      accreditedVoters: true,
      rejectedBallots: true,
      inecAccredited: true,
      inecTotalVotes: true,
      note: true,
      votes: { select: { partyId: true, votes: true } },
      sheet: { select: { version: true, width: true, height: true } },
    },
  });

  if (!row) return null;

  return {
    id: String(row.id),
    status: row.status,
    at: row.submittedAt.toISOString(),
    registered: row.registeredVoters,
    accredited: row.accreditedVoters,
    rejected: row.rejectedBallots,
    inecAccredited: row.inecAccredited,
    inecTotalVotes: row.inecTotalVotes,
    note: row.note,
    votes: Object.fromEntries(row.votes.map((vote) => [vote.partyId, vote.votes])),
    total: row.votes.reduce((sum, vote) => sum + vote.votes, 0),
    sheet: row.sheet ? { version: row.sheet.version } : null,
  };
}
