import { prisma } from "./db";

/**
 * Reading the returns.
 *
 * ── WHAT THESE NUMBERS ARE ─────────────────────────────────────────────────
 * MAP's own agents' returns from the polling units they were appointed to — a
 * parallel vote tabulation. They are not INEC's results, and every surface
 * built on this module says so in words, not in a footnote.
 *
 * Where an agent could also read INEC's declared figure it is stored in its own
 * columns, so `reported` and `inec` are always two separate numbers here and
 * the gap between them is available rather than averaged away.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * ── WHY GROUPBY AND NOT A JOIN PER LEVEL ───────────────────────────────────
 * Every result row carries its ward, LGA and state denormalised, written by the
 * server from the polling unit. So "votes per party in Rivers" is one grouped
 * scan of an indexed column rather than a four-table join over 176,623 rows,
 * and the same query shape serves all five levels by changing one field name.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Server only.
 */

/* The five levels a result can be read at, and the column that groups it.
   `unit` is what the level's rows are counted in. */
const LEVELS = {
  nation: { column: null, unit: "state" },
  state: { column: "stateId", unit: "lga" },
  lga: { column: "lgaId", unit: "ward" },
  ward: { column: "wardId", unit: "pollingUnit" },
  pollingUnit: { column: "pollingUnitId", unit: null },
};

/** Only counted returns. A disputed one stays in the table and out of the sum. */
const COUNTED = { status: { in: ["SUBMITTED", "VERIFIED"] } };

/**
 * A `where` for results inside one place.
 *
 * `null` for the nation, which is not a filter — it is the absence of one, and
 * that distinction matters because `{}` and `null` mean different things to
 * every caller below.
 */
export function resultsWhere({ electionId, stateId, lgaId, wardId, pollingUnitId }) {
  const where = { electionId, ...COUNTED };
  if (pollingUnitId) where.pollingUnitId = pollingUnitId;
  else if (wardId) where.wardId = wardId;
  else if (lgaId) where.lgaId = lgaId;
  else if (stateId) where.stateId = stateId;
  return where;
}

/* ------------------------------------------------------------------ totals */

/**
 * Party totals for one place, plus the turnout arithmetic around them.
 *
 * Returned sorted, leader first, with each party's share — because every
 * caller wants the leader and nobody wants to sort this twice.
 */
export async function tally(where) {
  const [votes, aggregate, reporting] = await Promise.all([
    prisma.resultVote.groupBy({
      by: ["partyId"],
      where: { result: where },
      _sum: { votes: true },
    }),
    prisma.pollingUnitResult.aggregate({
      where,
      _sum: {
        registeredVoters: true,
        accreditedVoters: true,
        rejectedBallots: true,
        inecTotalVotes: true,
      },
      _count: { _all: true },
    }),
    prisma.pollingUnitResult.count({ where: { ...where, status: "VERIFIED" } }),
  ]);

  const parties = await partyLookup();
  const total = votes.reduce((sum, row) => sum + (row._sum.votes ?? 0), 0);

  const rows = votes
    .map((row) => {
      const party = parties.get(row.partyId);
      const count = row._sum.votes ?? 0;
      return {
        partyId: row.partyId,
        code: party?.code ?? "—",
        name: party?.name ?? "Unknown party",
        colour: party?.colour ?? "#6B6660",
        votes: count,
        share: total ? Math.round((count / total) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.votes - a.votes);

  return {
    parties: rows,
    leader: rows[0] ?? null,
    /* The margin over second place, which is the number that says whether a
       place is decided or still moving. */
    margin: rows.length > 1 ? rows[0].votes - rows[1].votes : rows[0]?.votes ?? 0,
    total,
    registered: aggregate._sum.registeredVoters ?? 0,
    accredited: aggregate._sum.accreditedVoters ?? 0,
    rejected: aggregate._sum.rejectedBallots ?? 0,
    /* INEC's declared total for the same units, where agents could read it.
       Never added to `total`; the point of holding it is the difference. */
    inecTotal: aggregate._sum.inecTotalVotes ?? 0,
    unitsReported: aggregate._count._all,
    unitsVerified: reporting,
    turnout:
      aggregate._sum.registeredVoters && aggregate._sum.accreditedVoters
        ? Math.round((aggregate._sum.accreditedVoters / aggregate._sum.registeredVoters) * 1000) / 10
        : null,
  };
}

/* Parties are a table of six rows that changes between elections, not between
   requests. Read once per process. */
let partiesPromise = null;

function partyLookup() {
  partiesPromise ??= prisma.party
    .findMany({ select: { id: true, code: true, name: true, colour: true } })
    .then((rows) => new Map(rows.map((row) => [row.id, row])))
    .catch((error) => {
      partiesPromise = null; // never poison the cache
      throw error;
    });
  return partiesPromise;
}

/** Drop the cache — for the seeder and for tests, not for request handling. */
export function forgetParties() {
  partiesPromise = null;
}

/* ------------------------------------------------------------- breakdowns */

/**
 * The same tally, broken down by the units one level below.
 *
 * This is what colours the map: every state, or every LGA in a state, with its
 * own leader. One grouped query for the votes and one for the coverage, rather
 * than a tally per unit — 774 sequential tallies would be 1,548 round trips.
 */
export async function breakdown({ electionId, level, parentId }) {
  const config = LEVELS[level];
  if (!config?.unit) return [];

  const childColumn = { state: "stateId", lga: "lgaId", ward: "wardId", pollingUnit: "pollingUnitId" }[
    config.unit
  ];

  const where = resultsWhere({
    electionId,
    ...(level === "state" ? { stateId: parentId } : {}),
    ...(level === "lga" ? { lgaId: parentId } : {}),
    ...(level === "ward" ? { wardId: parentId } : {}),
  });

  const [votes, coverage] = await Promise.all([
    /* Grouping votes by (child unit, party) needs the child column, which lives
       on the result rather than the vote — so this is a raw grouped join. It is
       one query, and it is the hot path for the map. */
    prisma.$queryRawUnsafe(
      `SELECT r."${childColumn}" AS unit, v."partyId" AS party, SUM(v.votes)::int AS votes
         FROM "result_votes" v
         JOIN "polling_unit_results" r ON r.id = v."resultId"
        WHERE r."electionId" = $1
          AND r.status IN ('SUBMITTED','VERIFIED')
          ${parentId ? `AND r."${LEVELS[level].column}" = $2` : ""}
        GROUP BY 1, 2`,
      ...(parentId ? [electionId, parentId] : [electionId])
    ),
    prisma.pollingUnitResult.groupBy({
      by: [childColumn],
      where,
      _count: { _all: true },
      _sum: { accreditedVoters: true },
    }),
  ]);

  const parties = await partyLookup();
  const byUnit = new Map();

  for (const row of votes) {
    const unit = Number(row.unit);
    if (!byUnit.has(unit)) byUnit.set(unit, { unitId: unit, parties: [], total: 0 });
    const entry = byUnit.get(unit);
    const party = parties.get(row.party);
    const count = Number(row.votes);
    entry.parties.push({
      partyId: row.party,
      code: party?.code ?? "—",
      colour: party?.colour ?? "#6B6660",
      votes: count,
    });
    entry.total += count;
  }

  for (const row of coverage) {
    const unit = row[childColumn];
    if (!byUnit.has(unit)) byUnit.set(unit, { unitId: unit, parties: [], total: 0 });
    byUnit.get(unit).unitsReported = row._count._all;
  }

  return [...byUnit.values()].map((entry) => {
    entry.parties.sort((a, b) => b.votes - a.votes);
    const leader = entry.parties[0] ?? null;
    return {
      ...entry,
      leader,
      leaderShare: leader && entry.total ? Math.round((leader.votes / entry.total) * 1000) / 10 : 0,
      margin:
        entry.parties.length > 1 ? entry.parties[0].votes - entry.parties[1].votes : leader?.votes ?? 0,
    };
  });
}

/* -------------------------------------------------------------- reporting */

/**
 * How much of a place has actually reported.
 *
 * The most important number on the whole results page, and the one a results
 * page most often hides: a leader with 4% of units in is not a leader. It is
 * shown next to every total this module produces.
 */
export async function reporting({ electionId, stateId, lgaId, wardId }) {
  const where = resultsWhere({ electionId, stateId, lgaId, wardId });

  const boothWhere = wardId
    ? { wardId }
    : lgaId
      ? { ward: { lgaId } }
      : stateId
        ? { ward: { lga: { stateId } } }
        : {};

  const [reported, booths] = await Promise.all([
    prisma.pollingUnitResult.count({ where }),
    prisma.pollingUnit.count({ where: boothWhere }),
  ]);

  return {
    reported,
    booths,
    share: booths ? Math.round((reported / booths) * 1000) / 10 : 0,
  };
}

/** The most recent returns, for the live ticker. */
export async function latestReturns(electionId, { take = 12 } = {}) {
  const rows = await prisma.pollingUnitResult.findMany({
    where: { electionId, ...COUNTED },
    orderBy: { submittedAt: "desc" },
    take,
    select: {
      id: true,
      submittedAt: true,
      status: true,
      pollingUnit: { select: { name: true, code: true } },
      ward: { select: { name: true } },
      lga: { select: { name: true } },
      state: { select: { name: true, code: true } },
      votes: { select: { partyId: true, votes: true } },
    },
  });

  const parties = await partyLookup();

  return rows.map((row) => {
    const sorted = [...row.votes].sort((a, b) => b.votes - a.votes);
    const top = sorted[0];
    return {
      id: String(row.id),
      at: row.submittedAt.toISOString(),
      status: row.status,
      pollingUnit: row.pollingUnit.name,
      code: row.pollingUnit.code,
      ward: row.ward.name,
      lga: row.lga.name,
      state: row.state.name,
      stateCode: row.state.code,
      leader: top
        ? {
            code: parties.get(top.partyId)?.code ?? "—",
            colour: parties.get(top.partyId)?.colour ?? "#6B6660",
            votes: top.votes,
          }
        : null,
      total: row.votes.reduce((sum, vote) => sum + vote.votes, 0),
    };
  });
}

/** The election a public page should show by default. */
export async function currentElection(type = "PRESIDENTIAL") {
  return prisma.election.findFirst({
    where: { type, status: { in: ["OPEN", "CLOSED"] } },
    orderBy: [{ status: "asc" }, { year: "desc" }],
  });
}

export async function electionsOnOffer() {
  return prisma.election.findMany({
    where: { status: { in: ["OPEN", "CLOSED"] } },
    orderBy: [{ year: "desc" }, { type: "asc" }],
    select: { id: true, type: true, name: true, year: true, status: true },
  });
}
