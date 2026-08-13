/**
 * The administrator's console — every figure the platform holds, in one place.
 *
 * ── HOW THIS DIFFERS FROM lib/dashboard.js ─────────────────────────────────
 * lib/dashboard.js answers "what is happening in MY territory", and every
 * query in it takes a scope because a State Coordinator must never see Delta.
 * This file answers "what is the state of the entire platform", which is a
 * different question with a different audience: the National Coordinator, the
 * Director of Media & IT, and whoever is awake at 3am on election night.
 *
 * So there are no scope filters here, and that is the whole risk of the file.
 * Nothing in it may be rendered to anybody who has not passed
 * `can(scope, "viewNationwide")` at the page. There is exactly one caller —
 * app/admin/console — and one export route, and both check.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Every function is independent and returns plain JSON-safe values: no BigInt
 * escapes this module, because a BigInt crossing into a React tree throws at
 * render and the error names the component rather than the query.
 *
 * Server only.
 */

import { prisma } from "./db";

const DAY = 24 * 60 * 60 * 1000;

/** Postgres COUNT() comes back as BigInt. Nothing downstream wants that. */
const n = (value) => (value == null ? 0 : Number(value));

const pct = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

/* ──────────────────────────────────────────────────────────────── register */

/**
 * The register, counted every way somebody is likely to ask.
 *
 * One raw statement rather than eighteen `count()` calls: eighteen round trips
 * to Neon is most of a second of latency for numbers that all come off the same
 * sequential scan.
 */
export async function registerSnapshot() {
  const now = Date.now();
  const [row] = await prisma.$queryRaw`
    SELECT
      count(*)                                                        AS total,
      count(*) FILTER (WHERE m."verification" = 'VERIFIED')           AS verified,
      count(*) FILTER (WHERE m."verification" = 'PENDING')            AS pending,
      count(*) FILTER (WHERE m."verification" = 'REJECTED')           AS rejected,
      count(*) FILTER (WHERE m."membershipNo" IS NOT NULL)            AS numbered,
      count(*) FILTER (WHERE m."photoUrl" IS NOT NULL)                AS photographed,
      count(*) FILTER (WHERE m."vinEncrypted" IS NOT NULL)            AS with_vin,
      count(*) FILTER (WHERE m."ninEncrypted" IS NOT NULL)            AS with_nin,
      count(*) FILTER (WHERE m."pollingUnitId" IS NOT NULL)           AS with_unit,
      count(*) FILTER (WHERE m."referredById" IS NOT NULL)            AS referred,
      count(*) FILTER (WHERE m."referralCode" IS NOT NULL)            AS coded,
      count(*) FILTER (WHERE m."gender" = 'MALE')                     AS male,
      count(*) FILTER (WHERE m."gender" = 'FEMALE')                   AS female,
      count(*) FILTER (WHERE m."gender" IS NULL)                      AS gender_unknown,
      count(*) FILTER (WHERE m."dateOfBirth" IS NOT NULL)             AS with_dob,
      count(*) FILTER (WHERE m."joinedAt" >= ${new Date(now - DAY)})       AS today,
      count(*) FILTER (WHERE m."joinedAt" >= ${new Date(now - 7 * DAY)})   AS week,
      count(*) FILTER (WHERE m."joinedAt" >= ${new Date(now - 30 * DAY)})  AS month,
      count(*) FILTER (WHERE m."joinedAt" >= ${new Date(now - 60 * DAY)}
                         AND m."joinedAt" <  ${new Date(now - 30 * DAY)})  AS prev_month,
      min(m."joinedAt")                                               AS first_joined,
      /* Age bands, off the same scan. The under-35 share is the figure a youth
         movement is judged on, and a second query for it would mean reading
         the whole table twice for four numbers. */
      count(*) FILTER (WHERE m."dateOfBirth" IS NOT NULL
        AND date_part('year', age(now(), m."dateOfBirth")) < 25)      AS u25,
      count(*) FILTER (WHERE date_part('year', age(now(), m."dateOfBirth")) >= 25
        AND date_part('year', age(now(), m."dateOfBirth")) < 35)      AS a25,
      count(*) FILTER (WHERE date_part('year', age(now(), m."dateOfBirth")) >= 35
        AND date_part('year', age(now(), m."dateOfBirth")) < 50)      AS a35,
      count(*) FILTER (WHERE date_part('year', age(now(), m."dateOfBirth")) >= 50) AS a50
    FROM "members" m`;

  const total = n(row.total);
  const month = n(row.month);
  const prev = n(row.prev_month);

  return {
    total,
    verified: n(row.verified),
    pending: n(row.pending),
    rejected: n(row.rejected),
    numbered: n(row.numbered),
    photographed: n(row.photographed),
    withVin: n(row.with_vin),
    withNin: n(row.with_nin),
    withUnit: n(row.with_unit),
    referred: n(row.referred),
    coded: n(row.coded),
    male: n(row.male),
    female: n(row.female),
    genderUnknown: n(row.gender_unknown),
    withDob: n(row.with_dob),
    today: n(row.today),
    week: n(row.week),
    month,
    prevMonth: prev,
    growth: month - prev,
    firstJoined: row.first_joined ?? null,
    verifiedShare: pct(n(row.verified), total),
    referredShare: pct(n(row.referred), total),
    photoShare: pct(n(row.photographed), total),
    ages: {
      under25: n(row.u25),
      to34: n(row.a25),
      to49: n(row.a35),
      over50: n(row.a50),
    },
  };
}

/**
 * Members per day, for the console's chart. Gap-filled in SQL so a day with no
 * registrations is a zero on the line rather than a missing point — a chart
 * that silently closes its gaps flatters a quiet week.
 */
export async function growthByDay(days = 90) {
  const rows = await prisma.$queryRaw`
    SELECT d::date AS day, coalesce(c.total, 0) AS total
      FROM generate_series(
             (now() AT TIME ZONE 'Africa/Lagos')::date - (${days}::int - 1),
             (now() AT TIME ZONE 'Africa/Lagos')::date,
             '1 day'
           ) d
      LEFT JOIN (
        SELECT ("joinedAt" AT TIME ZONE 'Africa/Lagos')::date AS day, count(*) AS total
          FROM "members" GROUP BY 1
      ) c ON c.day = d::date
     ORDER BY d`;

  return rows.map((row) => ({
    date: row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day),
    value: n(row.total),
  }));
}

/* ──────────────────────────────────────────────────────────────── coverage */

/**
 * How much of Nigeria the register actually touches.
 *
 * Denominators are the INEC delimitation — 37 states, 774 LGAs, 8,809 wards,
 * 176,623 polling units — so "42% of wards" means 42% of the wards that exist,
 * not 42% of the wards somebody has already registered in.
 */
export async function coverage() {
  const [row] = await prisma.$queryRaw`
    SELECT
      (SELECT count(*) FROM "states")                                     AS states,
      (SELECT count(*) FROM "lgas")                                       AS lgas,
      (SELECT count(*) FROM "wards")                                      AS wards,
      (SELECT count(*) FROM "polling_units")                              AS units,
      (SELECT count(DISTINCT "stateId")       FROM "members")             AS states_live,
      (SELECT count(DISTINCT "lgaId")         FROM "members")             AS lgas_live,
      (SELECT count(DISTINCT "wardId")        FROM "members")             AS wards_live,
      (SELECT count(DISTINCT "pollingUnitId") FROM "members"
        WHERE "pollingUnitId" IS NOT NULL)                                AS units_live`;

  const build = (live, all) => ({ live: n(live), all: n(all), share: pct(n(live), n(all)) });

  return {
    states: build(row.states_live, row.states),
    lgas: build(row.lgas_live, row.lgas),
    wards: build(row.wards_live, row.wards),
    units: build(row.units_live, row.units),
  };
}

/**
 * Every state, every figure, one row each — the table the console is really
 * for. Sorted by member count because the question is nearly always "who is
 * behind", and the answer should be at one end or the other, not scattered.
 */
export async function stateTable() {
  const rows = await prisma.$queryRaw`
    WITH seat_state AS (
      /* Every seat, resolved to the state it sits in. A seat carries exactly
         one of five scope columns, so the state has to be walked up from
         whichever one is set — the same walk seatStateId() does in JS, done
         once here so the two figures below can group by it. */
      SELECT se."id",
             se."status",
             se."scopeType",
             coalesce(se."stateId", l1."stateId", l2."stateId", l3."stateId") AS state_id
        FROM "seats" se
        LEFT JOIN "lgas"  l1 ON l1."id" = se."lgaId"
        LEFT JOIN "wards" w2 ON w2."id" = se."wardId"
        LEFT JOIN "lgas"  l2 ON l2."id" = w2."lgaId"
        LEFT JOIN "polling_units" p3 ON p3."id" = se."pollingUnitId"
        LEFT JOIN "wards" w3 ON w3."id" = p3."wardId"
        LEFT JOIN "lgas"  l3 ON l3."id" = w3."lgaId"
    )
    SELECT
      s."id",
      s."name",
      s."code",
      z."name"                                                     AS zone,
      coalesce(m.total, 0)                                         AS members,
      coalesce(m.verified, 0)                                      AS verified,
      coalesce(m.month, 0)                                         AS month,
      coalesce(m.wards_live, 0)                                    AS wards_live,
      coalesce(w.total, 0)                                         AS wards,
      coalesce(l.total, 0)                                         AS lgas,
      coalesce(pu.total, 0)                                        AS units,
      coalesce(st.total, 0)                                        AS seats,
      coalesce(st.filled, 0)                                       AS filled,
      coalesce(ag.total, 0)                                        AS agent_seats,
      coalesce(ag.filled, 0)                                       AS agents,
      coalesce(r.total, 0)                                         AS returns
    FROM "states" s
    JOIN "zones" z ON z."id" = s."zoneId"
    LEFT JOIN (
      SELECT "stateId",
             count(*)                                              AS total,
             count(*) FILTER (WHERE "verification" = 'VERIFIED')   AS verified,
             count(*) FILTER (WHERE "joinedAt" >= now() - interval '30 days') AS month,
             count(DISTINCT "wardId")                              AS wards_live
        FROM "members" GROUP BY 1
    ) m ON m."stateId" = s."id"
    LEFT JOIN (SELECT "stateId", count(*) AS total FROM "lgas" GROUP BY 1) l
           ON l."stateId" = s."id"
    LEFT JOIN (
      SELECT l."stateId", count(*) AS total FROM "wards" w
        JOIN "lgas" l ON l."id" = w."lgaId" GROUP BY 1
    ) w ON w."stateId" = s."id"
    LEFT JOIN (
      SELECT l."stateId", count(*) AS total FROM "polling_units" p
        JOIN "wards" w ON w."id" = p."wardId"
        JOIN "lgas" l ON l."id" = w."lgaId" GROUP BY 1
    ) pu ON pu."stateId" = s."id"
    LEFT JOIN (
      SELECT state_id,
             count(*)                                    AS total,
             count(*) FILTER (WHERE "status" = 'FILLED')  AS filled
        FROM seat_state
       WHERE "scopeType" <> 'POLLING_UNIT' AND state_id IS NOT NULL
       GROUP BY 1
    ) st ON st.state_id = s."id"
    LEFT JOIN (
      SELECT state_id,
             count(*)                                    AS total,
             count(*) FILTER (WHERE "status" = 'FILLED')  AS filled
        FROM seat_state
       WHERE "scopeType" = 'POLLING_UNIT' AND state_id IS NOT NULL
       GROUP BY 1
    ) ag ON ag.state_id = s."id"
    LEFT JOIN (
      SELECT "stateId", count(*) AS total FROM "polling_unit_results" GROUP BY 1
    ) r ON r."stateId" = s."id"
    ORDER BY members DESC, s."name"`;

  return rows.map((row) => ({
    id: n(row.id),
    name: row.name,
    code: row.code,
    zone: row.zone,
    members: n(row.members),
    verified: n(row.verified),
    month: n(row.month),
    wardsLive: n(row.wards_live),
    wards: n(row.wards),
    lgas: n(row.lgas),
    units: n(row.units),
    seats: n(row.seats),
    filled: n(row.filled),
    agentSeats: n(row.agent_seats),
    agents: n(row.agents),
    returns: n(row.returns),
    wardShare: pct(n(row.wards_live), n(row.wards)),
    seatShare: pct(n(row.filled), n(row.seats)),
    agentShare: pct(n(row.agents), n(row.agent_seats)),
  }));
}

/* ─────────────────────────────────────────────────────────────── structure */

/** Seats by tier: how much of the organisation exists on paper, and how much
    of it is a person. */
export async function structureSnapshot() {
  const rows = await prisma.$queryRaw`
    SELECT r."tier"::text                                     AS tier,
           count(*)                                           AS total,
           count(*) FILTER (WHERE s."status" = 'FILLED')      AS filled
      FROM "seats" s JOIN "role_definitions" r ON r."id" = s."roleId"
     GROUP BY 1`;

  const order = ["NATIONAL", "ZONAL", "STATE", "LGA", "WARD", "POLLING_UNIT"];
  const byTier = order.map((tier) => {
    const row = rows.find((candidate) => candidate.tier === tier);
    const total = n(row?.total);
    const filled = n(row?.filled);
    return { tier, total, filled, vacant: total - filled, share: pct(filled, total) };
  });

  const [appointments] = await prisma.$queryRaw`
    SELECT count(*) FILTER (WHERE "status" = 'ACTIVE') AS active,
           count(*) FILTER (WHERE "status" <> 'ACTIVE') AS ended,
           count(*) FILTER (WHERE "createdAt" >= now() - interval '30 days') AS recent
      FROM "appointments"`;

  return {
    byTier,
    /* The booth tier is reported apart from the rest everywhere else in this
       app, and for the same reason: 176,623 against 92,184 would swamp the
       organisational figure entirely. */
    organisation: byTier.filter((row) => row.tier !== "POLLING_UNIT"),
    booths: byTier.find((row) => row.tier === "POLLING_UNIT"),
    appointments: {
      active: n(appointments.active),
      ended: n(appointments.ended),
      recent: n(appointments.recent),
    },
  };
}

/** The vacancies that matter most: an unfilled seat at the top of the tree
    blocks everything under it. */
export async function topVacancies(take = 12) {
  const rows = await prisma.$queryRaw`
    SELECT s."id",
           r."title",
           r."tier"::text AS tier,
           s."scopeType"::text AS scope_type,
           coalesce(z."name", st."name", l."name", w."name", 'Nationwide') AS unit
      FROM "seats" s
      JOIN "role_definitions" r ON r."id" = s."roleId"
      LEFT JOIN "zones"  z  ON z."id"  = s."zoneId"
      LEFT JOIN "states" st ON st."id" = s."stateId"
      LEFT JOIN "lgas"   l  ON l."id"  = s."lgaId"
      LEFT JOIN "wards"  w  ON w."id"  = s."wardId"
     WHERE s."status" = 'VACANT' AND s."scopeType" <> 'POLLING_UNIT'
     ORDER BY CASE r."tier"
                WHEN 'NATIONAL' THEN 1 WHEN 'ZONAL' THEN 2 WHEN 'STATE' THEN 3
                WHEN 'LGA' THEN 4 ELSE 5 END,
              unit, r."title"
     LIMIT ${take}`;

  return rows.map((row) => ({
    id: String(row.id),
    title: row.title,
    tier: row.tier,
    unit: row.unit,
  }));
}

/* ──────────────────────────────────────────────────────────────── election */

/** Every election, with how much of the country has actually reported. */
export async function electionSnapshot() {
  const rows = await prisma.$queryRaw`
    SELECT e."id", e."name", e."type"::text AS type, e."status"::text AS status, e."heldOn",
           coalesce(r.total, 0)      AS returns,
           coalesce(r.verified, 0)   AS verified,
           coalesce(r.disputed, 0)   AS disputed,
           coalesce(r.sheets, 0)     AS sheets,
           coalesce(r.accredited, 0) AS accredited,
           coalesce(v.votes, 0)      AS votes,
           r.last_at                 AS last_at
      FROM "elections" e
      LEFT JOIN (
        SELECT "electionId",
               count(*)                                            AS total,
               count(*) FILTER (WHERE "status" = 'VERIFIED')        AS verified,
               count(*) FILTER (WHERE "status" = 'DISPUTED')        AS disputed,
               sum(coalesce("accreditedVoters", 0))                 AS accredited,
               count(sh."resultId")                                 AS sheets,
               max("submittedAt")                                   AS last_at
          FROM "polling_unit_results" pr
          LEFT JOIN "result_sheets" sh ON sh."resultId" = pr."id"
         GROUP BY 1
      ) r ON r."electionId" = e."id"
      LEFT JOIN (
        SELECT pr."electionId", sum(rv."votes") AS votes
          FROM "result_votes" rv JOIN "polling_unit_results" pr ON pr."id" = rv."resultId"
         GROUP BY 1
      ) v ON v."electionId" = e."id"
     ORDER BY e."heldOn" DESC, e."name"`;

  const [units] = await prisma.$queryRaw`SELECT count(*) AS total FROM "polling_units"`;
  const booths = n(units.total);

  return rows.map((row) => ({
    id: n(row.id),
    name: row.name,
    type: row.type,
    status: row.status,
    heldOn: row.heldOn,
    returns: n(row.returns),
    verified: n(row.verified),
    disputed: n(row.disputed),
    sheets: n(row.sheets),
    /* A return with no photograph of the sheet is a number with nothing behind
       it. It is counted separately because it is the queue somebody has to
       work through, not a statistic. */
    unevidenced: n(row.returns) - n(row.sheets),
    accredited: n(row.accredited),
    votes: n(row.votes),
    lastAt: row.last_at ?? null,
    reporting: pct(n(row.returns), booths),
  }));
}

/* ─────────────────────────────────────────────────────────────── referrals */

export async function referralSnapshot() {
  const [row] = await prisma.$queryRaw`
    SELECT count(*)                                          AS members,
           count(*) FILTER (WHERE "referralCode" IS NOT NULL) AS coded,
           count(*) FILTER (WHERE "referredById" IS NOT NULL) AS referred,
           count(DISTINCT "referredById")                     AS recruiters
      FROM "members"`;

  const [best] = await prisma.$queryRaw`
    SELECT max(c) AS best, avg(c)::float AS mean FROM (
      SELECT count(*) AS c FROM "members" WHERE "referredById" IS NOT NULL GROUP BY "referredById"
    ) s`;

  return {
    members: n(row.members),
    coded: n(row.coded),
    uncoded: n(row.members) - n(row.coded),
    referred: n(row.referred),
    recruiters: n(row.recruiters),
    share: pct(n(row.referred), n(row.members)),
    best: n(best?.best),
    mean: best?.mean ? Math.round(best.mean * 10) / 10 : 0,
  };
}

/* ─────────────────────────────────────────────────────────────── integrity */

/**
 * The things that are wrong.
 *
 * Every entry is a count of rows that should not exist, with the words for what
 * it means and where to go. A console that only shows totals tells an
 * administrator the platform is fine; this is the part that tells them it is
 * not, and it is deliberately the section that cannot be satisfied by a big
 * number going up.
 */
export async function integrity() {
  const [row] = await prisma.$queryRaw`
    SELECT
      (SELECT count(*) FROM "members" WHERE "referralCode" IS NULL)                AS no_code,
      (SELECT count(*) FROM "members"
        WHERE "verification" = 'VERIFIED' AND "membershipNo" IS NULL)              AS verified_unnumbered,
      (SELECT count(*) FROM "members" m
         JOIN "wards" w ON w."id" = m."wardId"
        WHERE w."lgaId" <> m."lgaId")                                              AS ward_lga_mismatch,
      (SELECT count(*) FROM "members" m
         JOIN "lgas" l ON l."id" = m."lgaId"
        WHERE l."stateId" <> m."stateId")                                          AS lga_state_mismatch,
      (SELECT count(*) FROM "members" m
         JOIN "polling_units" p ON p."id" = m."pollingUnitId"
        WHERE p."wardId" <> m."wardId")                                            AS unit_ward_mismatch,
      (SELECT count(*) FROM "users" u
        LEFT JOIN "members" m ON m."userId" = u."id" WHERE m."id" IS NULL)         AS orphan_users,
      (SELECT count(*) FROM "users" WHERE "passwordHash" IS NULL)                  AS no_password,
      (SELECT count(*) FROM "users" WHERE "phoneVerified" = false)                 AS unverified_phone,
      (SELECT count(*) FROM "seats" s
         JOIN "appointments" a ON a."seatId" = s."id" AND a."status" = 'ACTIVE'
        WHERE s."status" = 'VACANT')                                               AS vacant_but_held,
      (SELECT count(*) FROM "seats" s
        WHERE s."status" = 'FILLED' AND NOT EXISTS (
          SELECT 1 FROM "appointments" a
           WHERE a."seatId" = s."id" AND a."status" = 'ACTIVE'))                   AS filled_but_empty,
      (SELECT count(*) FROM "polling_unit_results" pr
        LEFT JOIN "result_sheets" sh ON sh."resultId" = pr."id"
        WHERE sh."resultId" IS NULL)                                               AS returns_no_sheet,
      (SELECT count(*) FROM "polling_unit_results"
        WHERE "locationConfirmed" = false OR "termsAccepted" = false)              AS returns_unaffirmed,
      (SELECT count(*) FROM (
         SELECT pr."id"
           FROM "polling_unit_results" pr JOIN "result_votes" rv ON rv."resultId" = pr."id"
          GROUP BY pr."id", pr."accreditedVoters", pr."rejectedBallots"
         HAVING sum(rv."votes") + coalesce(pr."rejectedBallots", 0)
                > coalesce(pr."accreditedVoters", 2147483647)
       ) s)                                                                        AS returns_over_accredited,
      (SELECT count(*) FROM "polling_unit_results"
        WHERE "accreditedVoters" > "registeredVoters")                             AS returns_over_registered`;

  const checks = [
    {
      key: "no_code",
      count: n(row.no_code),
      label: "Members with no referral code",
      meaning: "They cannot invite anybody. Run the backfill in lib/referrals.",
      href: "/admin/referrals",
    },
    {
      key: "verified_unnumbered",
      count: n(row.verified_unnumbered),
      label: "Verified members with no membership number",
      meaning: "§7.3 issues the number on verification. These were missed.",
      href: "/admin/members?verification=VERIFIED",
    },
    {
      key: "ward_lga_mismatch",
      count: n(row.ward_lga_mismatch),
      label: "Members whose ward is not in their LGA",
      meaning: "Impossible through the form. Corrupt rows, or a bad import.",
      href: "/admin/members",
    },
    {
      key: "lga_state_mismatch",
      count: n(row.lga_state_mismatch),
      label: "Members whose LGA is not in their state",
      meaning: "As above. Every one of these breaks a scope filter.",
      href: "/admin/members",
    },
    {
      key: "unit_ward_mismatch",
      count: n(row.unit_ward_mismatch),
      label: "Members whose polling unit is not in their ward",
      meaning: "Their return would be filed against the wrong ward.",
      href: "/admin/polling-units",
    },
    {
      key: "orphan_users",
      count: n(row.orphan_users),
      label: "Accounts with no member record",
      meaning: "A registration that died halfway. They can sign in to nothing.",
      href: null,
    },
    {
      key: "no_password",
      count: n(row.no_password),
      label: "Accounts with no password set",
      meaning: "Seeded or imported. They cannot sign in until one is issued.",
      href: null,
    },
    {
      key: "unverified_phone",
      count: n(row.unverified_phone),
      label: "Phone numbers never verified",
      meaning: "§7.2 requires OTP at registration. The flow is not yet wired.",
      href: null,
    },
    {
      key: "vacant_but_held",
      count: n(row.vacant_but_held),
      label: "Seats marked vacant with somebody still in them",
      meaning: "The seat status and the appointment disagree.",
      href: "/admin/leadership",
    },
    {
      key: "filled_but_empty",
      count: n(row.filled_but_empty),
      label: "Seats marked filled with nobody in them",
      meaning: "They will not appear as vacancies, so nobody will fill them.",
      href: "/admin/leadership",
    },
    {
      key: "returns_no_sheet",
      count: n(row.returns_no_sheet),
      label: "Returns with no photograph of the sheet",
      meaning: "A number with no evidence behind it. Chase the agent.",
      href: "/admin/election",
    },
    {
      key: "returns_unaffirmed",
      count: n(row.returns_unaffirmed),
      label: "Returns filed without both affirmations",
      meaning: "The form refuses these, so they predate it or bypassed it.",
      href: "/admin/election",
    },
    {
      key: "returns_over_accredited",
      count: n(row.returns_over_accredited),
      label: "Returns where votes exceed accreditation",
      meaning: "Arithmetically impossible. Dispute them.",
      href: "/admin/election",
    },
    {
      key: "returns_over_registered",
      count: n(row.returns_over_registered),
      label: "Returns where accreditation exceeds the register",
      meaning: "Also impossible, and the classic signature of a stuffed booth.",
      href: "/admin/election",
    },
  ];

  return {
    checks,
    failing: checks.filter((check) => check.count > 0),
    clean: checks.filter((check) => check.count === 0).length,
  };
}

/* ──────────────────────────────────────────────────────────────── accounts */

export async function accountSnapshot() {
  const [row] = await prisma.$queryRaw`
    SELECT count(*)                                                     AS total,
           count(*) FILTER (WHERE "status" = 'ACTIVE')                  AS active,
           count(*) FILTER (WHERE "status" <> 'ACTIVE')                 AS restricted,
           count(*) FILTER (WHERE "mfaEnabled")                         AS mfa,
           count(*) FILTER (WHERE "phoneVerified")                      AS phone_verified,
           count(*) FILTER (WHERE "email" IS NOT NULL)                  AS with_email,
           count(*) FILTER (WHERE "lastLoginAt" >= now() - interval '1 day')  AS today,
           count(*) FILTER (WHERE "lastLoginAt" >= now() - interval '7 days') AS week,
           count(*) FILTER (WHERE "lastLoginAt" >= now() - interval '30 days') AS month,
           count(*) FILTER (WHERE "lastLoginAt" IS NULL)                AS never
      FROM "users"`;

  /* MFA is mandatory at state level and above (§13.2). Counting the accounts
     that are subject to that rule and do not satisfy it is the only honest way
     to report on it while the TOTP flow is still unbuilt. */
  const [mfa] = await prisma.$queryRaw`
    SELECT count(*) AS owed, count(*) FILTER (WHERE u."mfaEnabled") AS met
      FROM "appointments" a
      JOIN "seats" s ON s."id" = a."seatId"
      JOIN "role_definitions" r ON r."id" = s."roleId"
      JOIN "members" m ON m."id" = a."memberId"
      JOIN "users" u ON u."id" = m."userId"
     WHERE a."status" = 'ACTIVE'
       AND r."tier" IN ('NATIONAL', 'ZONAL', 'STATE')`;

  return {
    total: n(row.total),
    active: n(row.active),
    restricted: n(row.restricted),
    mfa: n(row.mfa),
    phoneVerified: n(row.phone_verified),
    withEmail: n(row.with_email),
    today: n(row.today),
    week: n(row.week),
    month: n(row.month),
    never: n(row.never),
    mfaOwed: n(mfa.owed),
    mfaMet: n(mfa.met),
  };
}

/* ────────────────────────────────────────────────────────────── broadcasts */

/**
 * Every bulk SMS the movement has sent, nationwide.
 *
 * On the console rather than only on /admin/broadcast because a broadcast is
 * the one action in this system that reaches people who are not looking at it.
 * A ward coordinator texting their ward is routine; forty of them texting the
 * same ward in a week is a thing somebody at the centre needs to be able to
 * see, and they cannot see it from inside any one territory.
 */
export async function broadcastSnapshot(take = 10) {
  const [totals] = await prisma.$queryRaw`
    SELECT count(*)                                                    AS sends,
           count(*) FILTER (WHERE "createdAt" >= now() - interval '30 days') AS month,
           coalesce(sum("recipients"), 0)                              AS recipients,
           coalesce(sum("delivered"), 0)                               AS delivered,
           coalesce(sum("failed"), 0)                                  AS failed,
           coalesce(sum("segments" * "recipients"), 0)                 AS credits,
           count(*) FILTER (WHERE "status" IN ('FAILED', 'PARTIAL'))   AS troubled,
           count(DISTINCT "senderId")                                  AS senders
      FROM "broadcasts"`;

  const rows = await prisma.broadcast.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      body: true,
      recipients: true,
      delivered: true,
      failed: true,
      status: true,
      provider: true,
      scopeLabel: true,
      createdAt: true,
      sender: { select: { firstName: true, surname: true } },
    },
  });

  return {
    sends: n(totals.sends),
    month: n(totals.month),
    recipients: n(totals.recipients),
    delivered: n(totals.delivered),
    failed: n(totals.failed),
    credits: n(totals.credits),
    troubled: n(totals.troubled),
    senders: n(totals.senders),
    latest: rows.map((row) => ({
      id: String(row.id),
      body: row.body,
      recipients: row.recipients,
      delivered: row.delivered,
      failed: row.failed,
      status: row.status,
      provider: row.provider,
      scopeLabel: row.scopeLabel,
      createdAt: row.createdAt,
      sender: `${row.sender.firstName} ${row.sender.surname}`,
    })),
  };
}

/* ─────────────────────────────────────────────────────────────────── audit */

/** The audit trail, newest first. Append-only by grant, so this is the whole
    record of who did what. */
export async function auditFeed(take = 25) {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      ipAddress: true,
      actor: { select: { firstName: true, surname: true, membershipNo: true } },
    },
  });

  return rows.map((row) => ({
    id: String(row.id),
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId == null ? null : String(row.entityId),
    createdAt: row.createdAt,
    /* The address is in the record because §13.2 asks for it, and it is shown
       because an audit entry an administrator cannot act on is decoration. */
    ipAddress: row.ipAddress ?? null,
    actor: row.actor ? `${row.actor.firstName} ${row.actor.surname}` : "System",
    actorNo: row.actor?.membershipNo ?? null,
  }));
}

/* ────────────────────────────────────────────────────────────────── tables */

/**
 * Live row counts for every table, straight out of the catalogue.
 *
 * `reltuples` would be free but it is an estimate that can be wildly wrong
 * after a bulk load, and this page is the one place somebody comes to find out
 * whether a bulk load worked. So they are counted for real, once, on a page
 * nobody loads in a loop.
 */
export async function tableSizes() {
  const TABLES = [
    "zones", "states", "lgas", "wards", "polling_units",
    "users", "members", "member_photos", "otp_codes",
    "role_definitions", "seats", "appointments", "applications", "application_events",
    "audit_logs",
    "parties", "elections", "candidates", "constituencies",
    "polling_unit_results", "result_votes", "result_sheets",
    "broadcasts",
  ];

  const rows = await prisma.$queryRawUnsafe(
    TABLES.map(
      (table) => `SELECT '${table}' AS name, count(*) AS rows,
                         pg_total_relation_size('"${table}"') AS bytes FROM "${table}"`
    ).join(" UNION ALL ")
  );

  const order = new Map(TABLES.map((table, index) => [table, index]));
  return rows
    .map((row) => ({ name: row.name, rows: n(row.rows), bytes: n(row.bytes) }))
    .sort((a, b) => order.get(a.name) - order.get(b.name));
}

/* ────────────────────────────────────────────────────────────────── people */

/** The newest registrations, platform-wide — the feed that tells you the form
    is still working. */
export async function latestMembers(take = 10) {
  const rows = await prisma.member.findMany({
    orderBy: { joinedAt: "desc" },
    take,
    select: {
      id: true,
      firstName: true,
      surname: true,
      membershipNo: true,
      verification: true,
      joinedAt: true,
      photoUrl: true,
      state: { select: { name: true } },
      ward: { select: { name: true } },
      referrer: { select: { firstName: true, surname: true } },
    },
  });

  return rows.map((row) => ({
    id: String(row.id),
    name: `${row.firstName} ${row.surname}`,
    membershipNo: row.membershipNo,
    verification: row.verification,
    joinedAt: row.joinedAt,
    photoUrl: row.photoUrl,
    state: row.state.name,
    ward: row.ward.name,
    referrer: row.referrer ? `${row.referrer.firstName} ${row.referrer.surname}` : null,
  }));
}

/** Who has brought in the most people, nationwide. */
export async function leaderboard(take = 10) {
  const rows = await prisma.$queryRaw`
    SELECT m."id", m."firstName", m."surname", m."membershipNo", m."referralCode",
           s."name" AS state, count(r."id") AS brought
      FROM "members" m
      JOIN "states" s ON s."id" = m."stateId"
      JOIN "members" r ON r."referredById" = m."id"
     GROUP BY m."id", m."firstName", m."surname", m."membershipNo", m."referralCode", s."name"
     ORDER BY brought DESC, m."surname"
     LIMIT ${take}`;

  return rows.map((row) => ({
    id: String(row.id),
    name: `${row.firstName} ${row.surname}`,
    membershipNo: row.membershipNo,
    referralCode: row.referralCode,
    state: row.state,
    brought: n(row.brought),
  }));
}
