/**
 * Creates one demo account per tier of the structure, so the dashboards can be
 * walked end to end without hand-building a hierarchy.
 *
 *   npm run dev                       # must be running: registration goes
 *   node prisma/demo.mjs              # through the real API, not around it
 *   node prisma/demo.mjs --remove     # delete every demo account again
 *
 * ── THIS IS NOT PRODUCTION DATA ────────────────────────────────────────────
 * Every account here shares one password, which is the opposite of what §13.2
 * requires. They exist to inspect the Descendant Rule from each rung of the
 * ladder. Run `--remove` before the register is opened to real members, and
 * never run this against the live database.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Registration goes through POST /api/auth/register on purpose: it uses the
 * same validation, the same scrypt parameters and the same membership-number
 * allocation as a real member, so these accounts are not a special case that
 * behaves differently from everyone else's.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "../lib/generated/prisma/index.js";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const PASSWORD = "MapDemo2027";
const REMOVE = process.argv.includes("--remove");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/* Two of these LGA names changed when the register was refreshed against
   INEC's current delimitation — "Eti Osa" is published as "Eti-Osa" and
   "Obio Akpor" as "Obio/Akpor". They are matched by name here rather than by
   code, so a future revision can break this script again; if it does, the
   error names the LGA it could not find. */

/**
 * One holder per rung. `home` is where they are registered as a member —
 * §8.1.3 ties a member to their own territory — and for the tiers where that
 * matters it is inside the territory they govern.
 */
const CAST = [
  {
    name: "Chinedu Okafor",
    phone: "08100000001",
    role: "NAT_COORD",
    home: { state: "Federal Capital Territory", lga: "Abuja Municipal" },
    note: "Super Admin. Sees and may act on every seat in the federation.",
  },
  {
    name: "Fatima Bello",
    phone: "08100000002",
    role: "ASST_COORD_SOUTH",
    home: { state: "Lagos", lga: "Eti-Osa" },
    note: "South East, South South and South West only. Cannot see the north.",
  },
  {
    name: "Tunde Bakare",
    phone: "08100000003",
    role: "DIR_MOB",
    home: { state: "Oyo", lga: "Ibadan North" },
    note: "Functional office: reads nationwide, appoints nobody (§6.10).",
  },
  {
    name: "Ibinabo Georgewill",
    phone: "08100000004",
    role: "ZC_SS",
    home: { state: "Rivers", lga: "Obio/Akpor" },
    note: "The six South South states. Appoints State Coordinators.",
  },
  {
    name: "Osaze Igbinedion",
    phone: "08100000005",
    role: "ST_COORD",
    scope: { state: "Edo" },
    home: { state: "Edo", lga: "Oredo" },
    note: "Edo only — the check that Rivers cannot read Edo, and vice versa.",
  },
  {
    name: "Boma Wokoma",
    phone: "08100000006",
    role: "LG_COORD",
    scope: { state: "Rivers", lga: "Port Harcourt" },
    home: { state: "Rivers", lga: "Port Harcourt" },
    note: "One LGA. Sees its wards; appoints ward officers.",
  },
  {
    name: "Ngozi Amadi",
    phone: "08100000007",
    role: "WD_COORD",
    scope: { state: "Rivers", lga: "Port Harcourt", ward: "Diobu" },
    home: { state: "Rivers", lga: "Port Harcourt", ward: "Diobu" },
    note: "The bottom rung: view and report only, no appointment powers.",
  },
  {
    /* The sixth tier, and the only one of the nine whose dashboard is a form
       rather than a table. Registered at the booth they hold, because a booth
       agent who does not vote there is a booth agent somebody will ask about. */
    name: "Emeka Nwachukwu",
    phone: "08100000009",
    role: "PU_AGENT",
    scope: {
      state: "Rivers",
      lga: "Port Harcourt",
      ward: "Diobu",
      pollingUnit: "RIV-022-17-001",
    },
    home: { state: "Rivers", lga: "Port Harcourt", ward: "Diobu" },
    note: "Polling Unit Coordinator. Files election returns from one booth.",
  },
  {
    name: "Aisha Suleiman",
    phone: "08100000008",
    role: null,
    home: { state: "Kano", lga: "Kano Municipal" },
    note: "Ordinary member, no seat. /admin explains rather than 404s.",
  },
];

const normalise = (input) => {
  const digits = String(input).replace(/[^\d+]/g, "").replace(/^\+/, "");
  let local = null;
  if (/^234\d{10}$/.test(digits)) local = digits.slice(3);
  else if (/^0\d{10}$/.test(digits)) local = digits.slice(1);
  else if (/^\d{10}$/.test(digits)) local = digits;
  return local && /^[789][01]\d{8}$/.test(local) ? `+234${local}` : null;
};

/* A ward for someone to be registered in. Named wards are looked up exactly;
   otherwise the first ward of the LGA stands in, so the cast does not have to
   hard-code 8,811 ward names to be runnable. */
async function homeWard({ state, lga, ward }) {
  const found = await prisma.ward.findFirst({
    where: {
      ...(ward ? { name: ward } : {}),
      lga: { name: lga, state: { name: state } },
    },
    orderBy: { name: "asc" },
    include: { lga: { include: { state: true } } },
  });
  if (!found) throw new Error(`No ward found for ${ward ?? "(first)"} / ${lga} / ${state}`);
  return found;
}

async function seatFor(role, scope = {}) {
  const definition = await prisma.roleDefinition.findUnique({ where: { code: role } });
  if (!definition) throw new Error(`Unknown role ${role}`);

  const where = { roleId: definition.id, seatIndex: 1 };

  if (definition.tier === "STATE") {
    const state = await prisma.state.findUnique({ where: { name: scope.state } });
    where.stateId = state.id;
  } else if (definition.tier === "LGA") {
    const lga = await prisma.lga.findFirst({
      where: { name: scope.lga, state: { name: scope.state } },
    });
    where.lgaId = lga.id;
  } else if (definition.tier === "WARD") {
    const ward = await prisma.ward.findFirst({
      where: { name: scope.ward, lga: { name: scope.lga, state: { name: scope.state } } },
    });
    where.wardId = ward.id;
  } else if (definition.tier === "POLLING_UNIT") {
    /* By INEC code, not by name: two units in one ward can share a name, and
       the code is the only thing that identifies one of them. */
    const unit = await prisma.pollingUnit.findUnique({ where: { code: scope.pollingUnit } });
    if (!unit) throw new Error(`No polling unit with code ${scope.pollingUnit}`);
    where.pollingUnitId = unit.id;
  }
  // NATIONAL and ZONAL seats are already unique: national seats carry no scope
  // row, and each ZC_* role exists exactly once, on its own zone.

  const seat = await prisma.seat.findFirst({ where, include: { role: true } });
  if (!seat) throw new Error(`No seat for ${role} ${JSON.stringify(scope)}`);
  return seat;
}

async function remove() {
  const phones = CAST.map((p) => normalise(p.phone));
  const users = await prisma.user.findMany({
    where: { phone: { in: phones } },
    include: { member: true },
  });
  const memberIds = users.map((u) => u.member?.id).filter(Boolean);

  if (!memberIds.length) {
    console.log("No demo accounts found.");
    return;
  }

  // Free the seats before deleting the people who hold them.
  const held = await prisma.appointment.findMany({
    where: { memberId: { in: memberIds }, status: "ACTIVE" },
    select: { seatId: true },
  });
  await prisma.seat.updateMany({
    where: { id: { in: held.map((a) => a.seatId) } },
    data: { status: "VACANT" },
  });
  await prisma.appointment.deleteMany({ where: { memberId: { in: memberIds } } });
  await prisma.member.deleteMany({ where: { id: { in: memberIds } } });
  await prisma.user.deleteMany({ where: { phone: { in: phones } } });

  console.log(`Removed ${memberIds.length} demo accounts and freed ${held.length} seats.`);
}

async function main() {
  if (REMOVE) return remove();

  // Fail early and clearly rather than after four half-created accounts.
  const ping = await fetch(`${BASE}/login`).catch(() => null);
  if (!ping?.ok) {
    console.error(`Cannot reach ${BASE}. Start the dev server first: npm run dev`);
    process.exit(1);
  }

  const created = [];

  for (const person of CAST) {
    const ward = await homeWard(person.home);
    const phone = normalise(person.phone);

    let member = await prisma.member.findFirst({
      where: { user: { phone } },
      include: { user: true },
    });

    if (!member) {
      const response = await fetch(`${BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: person.name,
          phone: person.phone,
          state: ward.lga.state.name,
          lga: ward.lga.name,
          ward: ward.name,
          /* A booth agent is registered at the booth they hold. Sent as the
             INEC code, which is what the register resolves on — two units in
             one ward can share a name. */
          ...(person.scope?.pollingUnit
            ? { pollingUnitCode: person.scope.pollingUnit }
            : {}),
          password: PASSWORD,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error(`  ${person.name}: registration failed`, data);
        continue;
      }
      member = await prisma.member.findUnique({
        where: { id: BigInt(data.member.id) },
        include: { user: true },
      });
    }

    let title = "Member (no seat)";
    if (person.role) {
      const existing = await prisma.appointment.findFirst({
        where: { memberId: member.id, status: "ACTIVE" },
        include: { seat: { include: { role: true } } },
      });

      if (existing) {
        title = existing.seat.role.title;
      } else {
        const seat = await seatFor(person.role, person.scope);
        if (seat.status === "FILLED") {
          console.error(`  ${person.name}: ${person.role} is already held. Skipped.`);
          continue;
        }
        await prisma.$transaction([
          prisma.appointment.create({
            data: { seatId: seat.id, memberId: member.id, status: "ACTIVE" },
          }),
          prisma.seat.update({ where: { id: seat.id }, data: { status: "FILLED" } }),
          prisma.auditLog.create({
            data: {
              action: "APPOINT_DEMO",
              entityType: "seat",
              entityId: seat.id,
              scopeType: seat.scopeType,
              afterState: { role: seat.role.code, member: person.name, via: "prisma/demo.mjs" },
            },
          }),
        ]);
        title = seat.role.title;
      }
    }

    created.push({
      name: person.name,
      phone: person.phone,
      title,
      membershipNo: member.membershipNo,
      note: person.note,
    });
  }

  console.log(`\n  ${created.length} demo accounts — password for all: ${PASSWORD}\n`);
  for (const row of created) {
    console.log(`  ${row.title}`);
    console.log(`    sign in : ${row.phone}  /  ${PASSWORD}`);
    console.log(`    member  : ${row.name} — ${row.membershipNo ?? "no number"}`);
    console.log(`    expect  : ${row.note}\n`);
  }
  console.log("  Remove them again with: node prisma/demo.mjs --remove");
}

main()
  .catch((error) => {
    console.error("Demo setup failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
