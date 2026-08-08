/**
 * Appoints a member to a seat from the command line.
 *
 *   node prisma/bootstrap.mjs --phone 08031234567 --role NAT_COORD
 *   node prisma/bootstrap.mjs --phone 08031234567 --role ST_COORD --state Rivers
 *   node prisma/bootstrap.mjs --phone 08031234567 --role LG_COORD --state Rivers --lga "Port Harcourt"
 *
 * §14 requires the top of the hierarchy to be filled by hand before public
 * registration opens: a member who registers and finds nobody above them to
 * approve their application disengages. There is no in-app way to create the
 * first National Coordinator — by definition nobody exists to approve them —
 * so it happens here, deliberately, from a terminal someone had to have
 * access to.
 *
 * The member must already exist. Register through /join first.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "../lib/generated/prisma/index.js";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? null : argv[i + 1];
};

const phone = arg("phone");
const roleCode = arg("role");
const stateName = arg("state");
const lgaName = arg("lga");
const wardName = arg("ward");
const seatIndex = Number(arg("seat") ?? 1);

if (!phone || !roleCode) {
  console.error(
    "Usage: node prisma/bootstrap.mjs --phone <number> --role <CODE> [--state X] [--lga Y] [--ward Z] [--seat N]"
  );
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/* Same normalisation as lib/auth.js: "0803...", "+234803..." and "803..." are
   one person, and the register stores exactly one of those forms. */
function normalisePhone(input) {
  const digits = String(input).replace(/[^\d+]/g, "").replace(/^\+/, "");
  let local = null;
  if (/^234\d{10}$/.test(digits)) local = digits.slice(3);
  else if (/^0\d{10}$/.test(digits)) local = digits.slice(1);
  else if (/^\d{10}$/.test(digits)) local = digits;
  if (!local || !/^[789][01]\d{8}$/.test(local)) return null;
  return `+234${local}`;
}

async function main() {
  const canonical = normalisePhone(phone);
  if (!canonical) {
    console.error(`"${phone}" is not a valid Nigerian mobile number.`);
    process.exit(1);
  }

  const member = await prisma.member.findFirst({
    where: { user: { phone: canonical } },
    include: { user: true, appointments: { where: { status: "ACTIVE" }, include: { seat: { include: { role: true } } } } },
  });

  if (!member) {
    console.error(`No member registered with ${canonical}. Register at /join first.`);
    process.exit(1);
  }

  // §8.1.1 — one office at a time. The database enforces this too; catching it
  // here gives a sentence instead of a constraint violation.
  if (member.appointments.length) {
    const held = member.appointments[0].seat.role.title;
    console.error(
      `${member.firstName} ${member.surname} already holds ${held}.\n` +
        "A member may hold one office at a time (§8.1.1). End that appointment first."
    );
    process.exit(1);
  }

  const role = await prisma.roleDefinition.findUnique({ where: { code: roleCode } });
  if (!role) {
    const all = await prisma.roleDefinition.findMany({ select: { code: true }, orderBy: { sortOrder: "asc" } });
    console.error(`Unknown role "${roleCode}". Known: ${all.map((r) => r.code).join(", ")}`);
    process.exit(1);
  }

  // Resolve the scope the seat must belong to.
  const where = { roleId: role.id, seatIndex };

  if (role.tier === "STATE" || role.tier === "LGA" || role.tier === "WARD") {
    if (!stateName) {
      console.error(`--state is required for a ${role.tier} seat.`);
      process.exit(1);
    }
  }

  if (role.tier === "STATE") {
    const state = await prisma.state.findUnique({ where: { name: stateName } });
    if (!state) return fail(`No state named "${stateName}".`);
    where.stateId = state.id;
  } else if (role.tier === "LGA") {
    if (!lgaName) return fail("--lga is required for an LGA seat.");
    const lga = await prisma.lga.findFirst({
      where: { name: lgaName, state: { name: stateName } },
    });
    if (!lga) return fail(`No LGA "${lgaName}" in ${stateName}.`);
    where.lgaId = lga.id;
  } else if (role.tier === "WARD") {
    if (!lgaName || !wardName) return fail("--lga and --ward are required for a ward seat.");
    const ward = await prisma.ward.findFirst({
      where: { name: wardName, lga: { name: lgaName, state: { name: stateName } } },
    });
    if (!ward) return fail(`No ward "${wardName}" in ${lgaName}, ${stateName}.`);
    where.wardId = ward.id;
  }
  // NATIONAL and ZONAL seats are already pinned: national seats have no scope
  // row, and each ZC_* role exists exactly once, on its own zone.

  const seat = await prisma.seat.findFirst({
    where,
    include: { role: true, zone: true, state: true, lga: true, ward: true },
  });

  if (!seat) return fail("No seat matches that role and scope.");
  if (seat.status === "FILLED") {
    return fail(`That seat is already filled. Use the dashboard to remove the incumbent first.`);
  }

  await prisma.$transaction([
    prisma.appointment.create({
      data: { seatId: seat.id, memberId: member.id, status: "ACTIVE" },
    }),
    prisma.seat.update({ where: { id: seat.id }, data: { status: "FILLED" } }),
    // §13.2: every privileged action is logged, including this one. An
    // appointment made from a terminal is exactly the kind that must be.
    prisma.auditLog.create({
      data: {
        actorId: null, // no signed-in actor: this ran from the command line
        action: "APPOINT_BOOTSTRAP",
        entityType: "seat",
        entityId: seat.id,
        scopeType: seat.scopeType,
        scopeId: seat.zoneId ?? seat.stateId ?? seat.lgaId ?? seat.wardId ?? null,
        afterState: {
          role: seat.role.code,
          member: `${member.firstName} ${member.surname}`,
          membershipNo: member.membershipNo,
          via: "prisma/bootstrap.mjs",
        },
      },
    }),
  ]);

  const scopeLabel =
    seat.ward?.name ?? seat.lga?.name ?? seat.state?.name ?? seat.zone?.name ?? "Federation";

  console.log(
    `Appointed ${member.firstName} ${member.surname} (${member.membershipNo ?? canonical})\n` +
      `  as ${seat.role.title}\n` +
      `  for ${scopeLabel}\n\n` +
      "They can now sign in at /login and reach /admin."
  );
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

main()
  .catch((error) => {
    console.error("Bootstrap failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
