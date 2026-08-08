import crypto from "node:crypto";

import { prisma } from "./db";
import { memberScopeWhere } from "./permissions";

/**
 * Who brought whom into the movement.
 *
 * ── WHY THE CODE IS SHAPED THE WAY IT IS ───────────────────────────────────
 * A referral code in MAP is not a marketing token. It is read out at a ward
 * meeting, written on the back of a flyer, and typed into a phone by somebody
 * who heard it once. So:
 *
 *   - Six characters, not a UUID. Long enough for 729 million codes, short
 *     enough to say out loud.
 *   - The alphabet drops 0/O, 1/I/L and U. Every remaining pair is
 *     distinguishable in Montserrat and over a phone line, and dropping U means
 *     no ordinary English word — printable or otherwise — can be generated.
 *   - Issued once, at registration, and never reissued. A code that rotates is
 *     a code that stops working after the poster has been printed.
 *   - Stored uppercase; read case-insensitively, because nobody types the caps.
 *
 * Server only.
 * ───────────────────────────────────────────────────────────────────────────
 */

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ"; // 30 symbols, no 0O 1IL U
const LENGTH = 6;

/** One candidate code. Rejection-sampled so every symbol is equally likely. */
function candidate() {
  let out = "";
  while (out.length < LENGTH) {
    for (const byte of crypto.randomBytes(LENGTH * 2)) {
      // 240 = 8 x 30. Bytes above it would bias the first 16 symbols.
      if (byte >= 240) continue;
      out += ALPHABET[byte % ALPHABET.length];
      if (out.length === LENGTH) break;
    }
  }
  return out;
}

/**
 * A code no member currently holds.
 *
 * The uniqueness constraint in the database is the real guarantee — this is the
 * cheap check that stops the constraint from ever having to fire. `client` lets
 * the caller pass a transaction so the read and the insert see the same world.
 */
export async function issueReferralCode(client = prisma) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = candidate();
    const taken = await client.member.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!taken) return code;
  }
  // 729m codes and eight collisions in a row: something is wrong with the RNG,
  // and issuing a ninth guess would be worse than saying so.
  throw new Error("Could not issue a unique referral code after 8 attempts.");
}

/** Accepts "map-7k4q2x", " 7K4Q2X ", "7K4Q2X" — returns "7K4Q2X" or null. */
export function normaliseReferralCode(input) {
  if (!input) return null;
  const code = String(input)
    .toUpperCase()
    .replace(/^MAP[-\s]*/, "")
    .replace(/[^A-Z0-9]/g, "");
  if (code.length !== LENGTH) return null;
  return [...code].every((character) => ALPHABET.includes(character)) ? code : null;
}

/**
 * The member behind a code, or null.
 *
 * Deliberately returns only what the join form needs to say "invited by
 * Adaeze Okoro" — never the referrer's phone number or their ward, because
 * anyone on the internet can type a code into a registration form.
 */
export async function findReferrer(input) {
  const code = normaliseReferralCode(input);
  if (!code) return null;

  const row = await prisma.member.findUnique({
    where: { referralCode: code },
    select: { id: true, firstName: true, surname: true },
  });
  if (!row) return null;

  return { id: row.id, name: `${row.firstName} ${row.surname}` };
}

/* ------------------------------------------------------------------ counts */

/**
 * One member's referral standing: their code, how many they have brought in,
 * how many of those are verified, and how many joined in the last 30 days.
 */
export async function referralSummary(memberId) {
  const id = BigInt(memberId);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [me, total, verified, recent] = await Promise.all([
    prisma.member.findUnique({
      where: { id },
      select: { referralCode: true, referrer: { select: { id: true, firstName: true, surname: true } } },
    }),
    prisma.member.count({ where: { referredById: id } }),
    prisma.member.count({ where: { referredById: id, verification: "VERIFIED" } }),
    prisma.member.count({ where: { referredById: id, joinedAt: { gte: since } } }),
  ]);

  if (!me) return null;

  return {
    code: me.referralCode,
    total,
    verified,
    recent,
    invitedBy: me.referrer
      ? { id: String(me.referrer.id), name: `${me.referrer.firstName} ${me.referrer.surname}` }
      : null,
  };
}

const REFERRAL_SELECT = {
  id: true,
  firstName: true,
  middleName: true,
  surname: true,
  membershipNo: true,
  photoUrl: true,
  verification: true,
  joinedAt: true,
  referralCode: true,
  ward: { select: { name: true } },
  lga: { select: { name: true } },
  state: { select: { name: true } },
  _count: { select: { referrals: true } },
};

function shapeReferral(row) {
  return {
    id: String(row.id),
    name: [row.firstName, row.middleName, row.surname].filter(Boolean).join(" "),
    membershipNo: row.membershipNo,
    photoUrl: row.photoUrl,
    verification: row.verification,
    joinedAt: row.joinedAt.toISOString(),
    referralCode: row.referralCode,
    ward: row.ward.name,
    lga: row.lga.name,
    state: row.state.name,
    /* Their own count, so the list answers the next question before it is
       asked: which of the people I brought in are bringing people in. */
    referrals: row._count.referrals,
  };
}

/** Everybody one member has brought in, newest first. */
export async function referralList(memberId, { take = 100 } = {}) {
  const rows = await prisma.member.findMany({
    where: { referredById: BigInt(memberId) },
    select: REFERRAL_SELECT,
    orderBy: { joinedAt: "desc" },
    take,
  });
  return rows.map(shapeReferral);
}

/* ------------------------------------------------------------------ growth */

/**
 * Members and referrals per day for a territory, as a dense daily series.
 *
 * Dense matters: a ward that registered nobody on Tuesday has to plot as zero,
 * not as a gap the line hops over, or the chart flatters a quiet week.
 *
 * `scope` is the caller's own scope from lib/permissions — the same object the
 * dashboard queries take — so a State Coordinator's chart cannot show a
 * neighbouring state. Passing `{ referredById }` instead charts one member's
 * own recruiting.
 */
export async function growthSeries({ scope, referredById, days = 30 }) {
  const where = referredById
    ? { referredById: BigInt(referredById) }
    : memberScopeWhere(scope);
  if (!where) return null;

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const [rows, before, referredBefore] = await Promise.all([
    prisma.member.findMany({
      where: { ...where, joinedAt: { gte: start } },
      select: { joinedAt: true, referredById: true },
      orderBy: { joinedAt: "asc" },
    }),
    // Everything already on the books when the window opens, so the cumulative
    // line starts at the real total rather than at zero.
    prisma.member.count({ where: { ...where, joinedAt: { lt: start } } }),
    prisma.member.count({
      where: { ...where, joinedAt: { lt: start }, referredById: { not: null } },
    }),
  ]);

  const buckets = new Map();
  for (let i = 0; i < days; i += 1) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    buckets.set(day.toISOString().slice(0, 10), { joined: 0, referred: 0 });
  }

  for (const row of rows) {
    const bucket = buckets.get(row.joinedAt.toISOString().slice(0, 10));
    if (!bucket) continue;
    bucket.joined += 1;
    if (row.referredById) bucket.referred += 1;
  }

  /* Both lines are cumulative and both count members, so they share one axis
     and the gap between them reads directly as "how much of this movement
     arrived because somebody in it asked them to". Plotting a running total
     against a daily rate would need two scales, and a two-scale chart can be
     made to say anything. */
  let members = before;
  let referred = referredBefore;

  return [...buckets].map(([date, bucket]) => {
    members += bucket.joined;
    referred += bucket.referred;
    return {
      date,
      joined: bucket.joined,
      referredToday: bucket.referred,
      members,
      referred,
    };
  });
}

/**
 * The members bringing most people in, within a scope. §10.1 gives a
 * coordinator a coverage figure and a vacancy count; this is the other half —
 * who in the territory is actually recruiting, which is the thing a coordinator
 * can act on this week.
 */
export async function topRecruiters(scope, { take = 8 } = {}) {
  const where = memberScopeWhere(scope);
  if (!where) return null;

  /* Group first, then fetch the handful of members named. Ordering members by
     a relation count is not something Prisma can express, and pulling every
     member in a state to count in JavaScript is not something a dashboard can
     afford.

     The scope filter is on the REFERRER, not the referred: this is "who in my
     territory is recruiting", and it credits them with everyone they brought
     in, including the cousin who registered in Lagos. Filtering the referred
     side instead would both undercount them and name recruiters the reader has
     no right to see. */
  const grouped = await prisma.member.groupBy({
    by: ["referredById"],
    where: { referredById: { not: null }, referrer: { is: where } },
    _count: { referredById: true },
    orderBy: { _count: { referredById: "desc" } },
    take,
  });

  if (!grouped.length) return [];

  const rows = await prisma.member.findMany({
    where: { id: { in: grouped.map((group) => group.referredById) } },
    select: REFERRAL_SELECT,
  });

  const byId = new Map(rows.map((row) => [String(row.id), row]));
  return grouped
    .map((group) => {
      const row = byId.get(String(group.referredById));
      return row ? { ...shapeReferral(row), referrals: group._count.referredById } : null;
    })
    .filter(Boolean);
}
