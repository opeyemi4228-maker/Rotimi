/**
 * Sets up an election: the parties, the contest, and — optionally — a Polling
 * Unit Coordinator who can file a return against it.
 *
 *   node scripts/seed-election.mjs
 *   node scripts/seed-election.mjs --open              # accept returns now
 *   node scripts/seed-election.mjs --agent "OND-006-07-003"
 *
 * ── ON THE PARTY COLOURS ───────────────────────────────────────────────────
 * Set by the secretariat: PDP red, LP orange, APC green. ADC takes the blue
 * that APC vacated, which leaves the movement's own party clearly separated
 * from all three. Stored in the database, so any of them can be corrected
 * without a deploy.
 *
 * ── AND THE PROBLEM THAT CREATES ───────────────────────────────────────────
 * Red and green are the one pair that collapses under the commonest form of
 * colour blindness. PDP against APC — two of the largest parties — is close to
 * indistinguishable for roughly one man in twelve, and no choice of red or
 * green fixes that; it is how the eye works, not how the hex is written.
 *
 * So the map never relies on the colour. Every state carries the leading
 * party's code across it, the tooltip names the party in words, and the table
 * beneath the map is the same data with no colour in it at all. The steps
 * chosen here are the ones that separate best under all three CVD models while
 * still reading as red and green to everybody else.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * ── ON CANDIDATES ──────────────────────────────────────────────────────────
 * None are seeded. Votes are recorded per party, which is what an EC8A sheet
 * reports and what the agent copies, so the whole pipeline works without them.
 * Naming a 2027 presidential candidate is not something a seed script should
 * invent — add them through the database when they are known.
 * ───────────────────────────────────────────────────────────────────────────
 */

import crypto from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "../lib/generated/prisma/index.js";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const args = process.argv.slice(2);
const OPEN = args.includes("--open");
const agentAt = args[args.indexOf("--agent") + 1];
const WANTS_AGENT = args.includes("--agent") && agentAt && !agentAt.startsWith("--");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. See .env.example.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const PARTIES = [
  { code: "ADC", name: "African Democratic Congress", colour: "#1565C0", sortOrder: 1 },
  { code: "APC", name: "All Progressives Congress", colour: "#1B7A3D", sortOrder: 2 },
  { code: "PDP", name: "Peoples Democratic Party", colour: "#D32F2F", sortOrder: 3 },
  { code: "LP", name: "Labour Party", colour: "#EF6C00", sortOrder: 4 },
  { code: "NNPP", name: "New Nigeria Peoples Party", colour: "#6A3D9A", sortOrder: 5 },
  { code: "APGA", name: "All Progressives Grand Alliance", colour: "#00838F", sortOrder: 6 },
  { code: "SDP", name: "Social Democratic Party", colour: "#795548", sortOrder: 7 },
];

/* Every election the platform can carry. Governorship excludes the FCT, which
   has no governor — that is handled where results are aggregated, not here. */
const ELECTIONS = [
  { type: "PRESIDENTIAL", name: "2027 Presidential Election", year: 2027, heldOn: "2027-02-20" },
  { type: "GOVERNORSHIP", name: "2027 Governorship Elections", year: 2027, heldOn: "2027-03-06" },
  { type: "SENATE", name: "2027 Senatorial Elections", year: 2027, heldOn: "2027-02-20" },
  { type: "HOUSE_OF_REPS", name: "2027 House of Representatives Elections", year: 2027, heldOn: "2027-02-20" },
];

/* Same alphabet as lib/referrals.js: no 0/O, no 1/I/L. A booth agent may be
   reading this off a scrap of paper by torchlight. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

function passphrase(length = 10) {
  let out = "";
  for (const byte of crypto.randomBytes(length * 2)) {
    if (byte >= 240) continue; // 240 = 8 x 30, above it the first 16 bias
    out += ALPHABET[byte % ALPHABET.length];
    if (out.length === length) break;
  }
  return out;
}

async function main() {
  /* ── Parties ──────────────────────────────────────────────────────────── */
  for (const party of PARTIES) {
    await prisma.party.upsert({
      where: { code: party.code },
      update: { name: party.name, colour: party.colour, sortOrder: party.sortOrder },
      create: party,
    });
  }
  console.log(`Parties: ${await prisma.party.count()}`);

  /* ── Elections ────────────────────────────────────────────────────────── */
  for (const election of ELECTIONS) {
    await prisma.election.upsert({
      where: { type_year: { type: election.type, year: election.year } },
      update: { name: election.name, heldOn: new Date(election.heldOn) },
      create: {
        ...election,
        heldOn: new Date(election.heldOn),
        // DRAFT unless asked otherwise: an election that accepts returns the
        // moment it is seeded is an election somebody can file into by mistake.
        status: OPEN ? "OPEN" : "DRAFT",
      },
    });
  }
  const elections = await prisma.election.findMany({ orderBy: { type: "asc" } });
  for (const election of elections) console.log(`  ${election.status.padEnd(8)} ${election.name}`);

  if (!WANTS_AGENT) {
    console.log(
      "\nNo agent requested. To create one:\n" +
        '  node scripts/seed-election.mjs --agent "OND-006-07-003"'
    );
    return;
  }

  /* ── A Polling Unit Coordinator ───────────────────────────────────────── */
  const unit = await prisma.pollingUnit.findUnique({
    where: { code: agentAt },
    include: { ward: { include: { lga: { include: { state: true } } } } },
  });

  if (!unit) {
    console.error(`\nNo polling unit has the code ${agentAt}.`);
    process.exit(1);
  }

  const seat = await prisma.seat.findFirst({
    where: { pollingUnitId: unit.id, role: { code: "PU_AGENT" } },
    include: { appointments: { where: { status: "ACTIVE" }, include: { member: true } } },
  });

  if (!seat) {
    console.error(`\n${agentAt} has no polling unit seat. Run the main seed first.`);
    process.exit(1);
  }

  if (seat.appointments.length) {
    const held = seat.appointments[0].member;
    console.log(`\n${agentAt} is already held by ${held.firstName} ${held.surname}.`);
    return;
  }

  /* The account. A booth agent is a member like any other — they register, they
     get a membership number, and then they are appointed. This creates all
     three in one transaction so a half-made agent cannot exist. */
  /* hashPassword imports nothing but node:crypto, so it loads under plain
     Node. lib/referrals.js does not — it pulls in the request-scoped Prisma
     client through an extensionless import that only the bundler resolves — so
     the code is generated here with the same alphabet instead. */
  const { hashPassword } = await import("../lib/auth.js");
  const referralCode = await (async () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = passphrase(6);
      const taken = await prisma.member.findUnique({
        where: { referralCode: candidate },
        select: { id: true },
      });
      if (!taken) return candidate;
    }
    throw new Error("Could not issue a unique referral code.");
  })();

  const password = passphrase();
  const phone = `+234${String(9000000000 + unit.id).slice(0, 10)}`;

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { phone, passwordHash: hashPassword(password), phoneVerified: true },
    });

    const soFar = await tx.member.count({ where: { lgaId: unit.ward.lgaId } });
    const lgaPart = unit.ward.lga.code.split("-").at(-1);

    const member = await tx.member.create({
      data: {
        userId: user.id,
        membershipNo: `MAP/${unit.ward.lga.state.code}/${lgaPart}/${String(soFar + 1).padStart(6, "0")}`,
        firstName: "Polling Unit",
        surname: "Coordinator",
        referralCode,
        stateId: unit.ward.lga.stateId,
        lgaId: unit.ward.lgaId,
        wardId: unit.wardId,
        pollingUnitId: unit.id,
        verification: "VERIFIED",
      },
    });

    await tx.appointment.create({
      data: { seatId: seat.id, memberId: member.id, status: "ACTIVE" },
    });
    await tx.seat.update({ where: { id: seat.id }, data: { status: "FILLED" } });

    return member;
  });

  console.log(`
─────────────────────────────────────────────────────────────
  Polling Unit Coordinator created

  Polling unit   ${unit.name}
  INEC code      ${unit.code}
  Ward           ${unit.ward.name}
  LGA            ${unit.ward.lga.name}, ${unit.ward.lga.state.name}

  Sign in at     /login
  Phone          ${phone}
  Password       ${password}
  Membership no. ${created.membershipNo}

  Change the password on first sign-in. This one was generated
  here and printed to a terminal, which is not where a real
  credential should ever have been.
─────────────────────────────────────────────────────────────`);
}

main()
  .catch((error) => {
    console.error("\nFailed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
