/**
 * Seeds — and thereafter reconciles — the reference data every other table
 * depends on (§9.5).
 *
 *   npx prisma db seed
 *   node prisma/seed.mjs --dry-run                 (report, change nothing)
 *   node prisma/seed.mjs --skip-polling-units      (faster first run)
 *   node prisma/seed.mjs --reset-seats             (rebuild seats only)
 *
 * Order is fixed and cannot be varied: zones → states → LGAs → wards →
 * polling units → role definitions → seats. Nothing may register until it has
 * finished.
 *
 * ── WHY THIS RECONCILES RATHER THAN SKIPS ──────────────────────────────────
 * The first version of this file decided a stage was done by counting rows: if
 * the table already held as many wards as public/geo did, it moved on. That is
 * only correct while the register never changes, and the register does change.
 * INEC created 56,737 polling units in the 2021 expansion, and it respells
 * wards between revisions — what was published as "Gbogi Isikan I" is now
 * "Gbogi/Isikan I". A count-equal check skips every one of those edits and
 * leaves the dropdowns and the database disagreeing about what a ward is
 * called, which is exactly the state in which a member picks their ward from
 * the list and is told it is not in the INEC register.
 *
 * So each geography stage now diffs public/geo against the database and applies
 * the difference. It is still idempotent — a second run finds nothing to do —
 * and still safe to interrupt.
 *
 * Rows are matched on INEC's delimitation code (OND-006-07); where a code has
 * moved they are matched on name instead, so a renumbering cannot silently
 * relocate a member. Nothing a member points at is ever deleted: it is reported
 * for a person to decide about.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * ── ON THE SEAT COUNT ──────────────────────────────────────────────────────
 * §6.7 totals 92,190 seats and, against the current register of 8,809 wards,
 * its arithmetic is exact: 15 national + 30 zonal + 185 state + 3,870 LGA +
 * 88,090 ward. This seeds six fewer, at 92,184, deliberately: §6.7 counts the
 * six zonal coordinators twice — once inside the 15 National Executive seats,
 * once inside the 30 Zonal Executive seats — and §6.8 resolves them as one
 * office held by one person, which is the recommendation the plan itself makes.
 * ───────────────────────────────────────────────────────────────────────────
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { Prisma, PrismaClient } from "../lib/generated/prisma/index.js";
import { roles, DYNAMIC_APPROVER } from "./roles.mjs";
import { states as STATES } from "../lib/states.mjs";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const GEO_DIR = path.join(process.cwd(), "public", "geo");
const args = new Set(process.argv.slice(2));
const SKIP_PU = args.has("--skip-polling-units");
const RESET_SEATS = args.has("--reset-seats");
const DRY_RUN = args.has("--dry-run");

/* Appendix C item 2: seat 1 of every ward is the Ward Coordinator. Set this
   false to make all ten ward seats equal WD_OFFICER instead. */
const WARD_COORDINATOR = true;

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set.\n" +
      "Put your Neon pooled connection string in .env.local:\n" +
      '  DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=verify-full"'
  );
  process.exit(1);
}

if (!existsSync(path.join(GEO_DIR, "index.json"))) {
  console.error(
    "public/geo is missing. Build the INEC tables first:\n  node scripts/build-geography.mjs"
  );
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/* Appendix A. Codes follow the membership-number format of §7.3 (MAP/EDO/...),
   so they are the three letters that appear on every member's card. */
const ZONES = [
  { code: "NC", name: "North Central", region: "NORTH" },
  { code: "NE", name: "North East", region: "NORTH" },
  { code: "NW", name: "North West", region: "NORTH" },
  { code: "SE", name: "South East", region: "SOUTH" },
  { code: "SS", name: "South South", region: "SOUTH" },
  { code: "SW", name: "South West", region: "SOUTH" },
];

/* ----------------------------------------------------------------- helpers */

const CHUNK = 4000;

async function insertMany(model, rows, label) {
  if (!rows.length) return;
  if (DRY_RUN) {
    console.log(`  ${label}: would insert ${rows.length.toLocaleString()}`);
    return;
  }
  for (let i = 0; i < rows.length; i += CHUNK) {
    await prisma[model].createMany({ data: rows.slice(i, i + CHUNK), skipDuplicates: true });
    process.stdout.write(`\r  ${label}: ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }
  process.stdout.write(`\r  ${label}: ${rows.length.toLocaleString()} inserted\n`);
}

/**
 * Rewrite a batch of rows in one statement, not one statement per row.
 *
 * `UPDATE … FROM (VALUES …)` does the whole batch in a single round trip. Kano
 * has 484 wards; as individual updates that is over a thousand round trips
 * inside one transaction, and at the ~80ms it costs to reach the database from
 * here that alone blew a two-minute transaction timeout.
 *
 * Values are bound as parameters rather than interpolated — "Jama'are" is a
 * real ward name, and it is not this file's job to be the last line of defence
 * against a quote in a place name.
 */
function bulkRename(table, rows) {
  const values = Prisma.join(
    rows.map((row) => Prisma.sql`(${row.id}::int, ${row.code}::varchar, ${row.name}::varchar)`)
  );
  return prisma.$executeRaw`
    UPDATE ${Prisma.raw(`"${table}"`)} AS target
       SET "code" = source.code, "name" = source.name
      FROM (VALUES ${values}) AS source(id, code, name)
     WHERE target."id" = source.id`;
}

/** The same, for the two columns a polling unit revision can change. */
function bulkRelabel(rows) {
  const values = Prisma.join(
    rows.map((row) => Prisma.sql`(${row.id}::int, ${row.name}::varchar, ${row.wardId}::int)`)
  );
  return prisma.$executeRaw`
    UPDATE "polling_units" AS target
       SET "name" = source.name, "wardId" = source.ward_id
      FROM (VALUES ${values}) AS source(id, name, ward_id)
     WHERE target."id" = source.id`;
}

/**
 * Rewrite the rows of one parent — one state's LGAs, one state's wards.
 *
 * Both code and name are unique, and a revision routinely makes two rows trade
 * one or the other: Ogun's register drops "Yewa" from two names, which sorts
 * them from 19th and 20th to 4th and 5th and pushes fifteen other LGAs down a
 * number each. Applied in place, the first write collides with the row that
 * still holds the value.
 *
 * So every row that is changing is first parked on a code and a name nothing
 * else can hold, and the real values are written afterwards. `park` also takes
 * the rows the register dropped but that cannot be deleted, because they are
 * holding a code the register wants to give to somebody else.
 *
 * Both statements are one transaction. A crash between them left fifteen LGAs
 * sitting on parked codes, and a re-run could recognise them by neither name
 * nor code to put them back.
 */

const TABLE = { lga: "lgas", ward: "wards", pollingUnit: "polling_units" };

async function applyGroup(model, updates, park = []) {
  if (!updates.length && !park.length) return 0;
  if (DRY_RUN) return updates.length;

  const table = TABLE[model];
  const parked = [
    // Rows the register dropped but that a member is standing on: only the code
    // is taken from them, because their name is still somebody's ward.
    ...park.map((row) => ({ id: row.id, code: `~${row.id}`, name: row.name })),
    ...updates.map(({ id }) => ({ id, code: `~${id}`, name: `~${id}` })),
  ];

  await prisma.$transaction(
    [
      bulkRename(table, parked),
      bulkRename(
        table,
        updates.map(({ id, data }) => ({ id, code: data.code, name: data.name }))
      ),
    ],
    { timeout: 120_000, maxWait: 30_000 }
  );

  return updates.length;
}

/** "Ile-Oluji/Okeigbo" and "ILE OLUJI OKEIGBO" are the same place. */
const key = (name) => String(name).toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Pair the rows already in the database against the rows the register now has,
 * within one parent. Returns { matched, created, orphaned }.
 *
 * Three passes, weakest last, and every pass insists on being unambiguous. A
 * guess that silently moves a member into a different ward is worse than an
 * orphan the seed reports and a person resolves.
 */
function reconcile(existing, incoming) {
  const left = new Map(existing.map((row) => [row.id, row]));
  const right = new Map(incoming.map((row) => [row.code, row]));
  const matched = [];

  const take = (row, candidate) => {
    matched.push([row, candidate]);
    left.delete(row.id);
    right.delete(candidate.code);
  };

  // 1. Same name. Survives any renumbering.
  const byName = new Map();
  for (const row of right.values()) {
    const k = key(row.name);
    byName.set(k, byName.has(k) ? null : row); // null marks an ambiguous name
  }
  for (const row of [...left.values()]) {
    const candidate = byName.get(key(row.name));
    if (candidate && right.has(candidate.code)) take(row, candidate);
  }

  // 2. Same code. Survives a respelling.
  for (const row of [...left.values()]) {
    const candidate = right.get(row.code);
    if (candidate) take(row, candidate);
  }

  // 3. One left on each side: it is a rename, not a deletion and an addition.
  //    ("Abuja Municipal" is published as "Municipal", and renumbered 02 -> 06.)
  if (left.size === 1 && right.size === 1) {
    take([...left.values()][0], [...right.values()][0]);
  }

  return { matched, created: [...right.values()], orphaned: [...left.values()] };
}

/* -------------------------------------------------------------------- main */

async function main() {
  const started = Date.now();
  console.log(`Seeding MAP reference data${DRY_RUN ? " — dry run, nothing is written" : ""}\n`);

  const report = { renamed: [], recoded: [], orphaned: [], protected: [] };

  /* ── 1. Zones ─────────────────────────────────────────────────────────── */
  if (!DRY_RUN) await prisma.zone.createMany({ data: ZONES, skipDuplicates: true });
  const zones = await prisma.zone.findMany();
  const zoneByCode = new Map(zones.map((z) => [z.code, z]));
  console.log(`  zones: ${zones.length}`);

  /* ── 2. States ────────────────────────────────────────────────────────── */
  if (!DRY_RUN) {
    await prisma.state.createMany({
      data: STATES.map((state) => ({
        name: state.name,
        code: state.code,
        slug: state.slug,
        zoneId: zoneByCode.get(state.zone).id,
      })),
      skipDuplicates: true,
    });
  }
  const states = await prisma.state.findMany();
  console.log(`  states: ${states.length}`);

  const trees = new Map();
  for (const state of states) {
    trees.set(
      state.id,
      JSON.parse(await readFile(path.join(GEO_DIR, `${state.slug}.json`), "utf8"))
    );
  }

  /* ── 3. LGAs ──────────────────────────────────────────────────────────── */
  const lgaCreates = [];
  let lgaChanged = 0;

  for (const state of states) {
    const have = await prisma.lga.findMany({
      where: { stateId: state.id },
      select: {
        id: true,
        code: true,
        name: true,
        _count: { select: { members: true, wards: true } },
      },
    });
    const { matched, created, orphaned } = reconcile(have, trees.get(state.id).lgas);

    const updates = [];
    const keep = [];
    const drop = [];

    for (const [row, wanted] of matched) {
      if (row.code === wanted.code && row.name === wanted.name) continue;
      if (row.name !== wanted.name) {
        report.renamed.push(`LGA ${state.name}: ${row.name} -> ${wanted.name}`);
      }
      if (row.code !== wanted.code) {
        /* The LGA code is the middle segment of every membership number issued
           in it (§7.3), and those are permanent. Say so rather than quietly
           leaving cards that no longer name their own LGA. */
        report.recoded.push(
          `LGA ${state.name}/${wanted.name}: ${row.code} -> ${wanted.code}` +
            (row._count.members
              ? ` — ${row._count.members} membership number(s) still read ${row.code}`
              : "")
        );
      }
      updates.push({ id: row.id, data: { code: wanted.code, name: wanted.name } });
    }

    for (const wanted of created) {
      lgaCreates.push({ code: wanted.code, name: wanted.name, stateId: state.id });
    }

    for (const row of orphaned) {
      const where = `LGA ${state.name}/${row.name} (${row.code})`;
      if (row._count.members > 0) {
        /* Kept, but parked: its code has to be free for whichever LGA the
           register now numbers that way. */
        report.protected.push(`${where} left the register but holds ${row._count.members} member(s); kept`);
        keep.push(row);
      } else {
        report.orphaned.push(`${where} is not in the register; removed`);
        drop.push(row.id);
      }
    }

    if (drop.length && !DRY_RUN) {
      const wards = await prisma.ward.findMany({
        where: { lgaId: { in: drop } },
        select: { id: true },
      });
      const wardIds = wards.map((w) => w.id);
      await prisma.seat.deleteMany({ where: { OR: [{ lgaId: { in: drop } }, { wardId: { in: wardIds } }] } });
      await prisma.pollingUnit.deleteMany({ where: { wardId: { in: wardIds } } });
      await prisma.ward.deleteMany({ where: { id: { in: wardIds } } });
      await prisma.lga.deleteMany({ where: { id: { in: drop } } });
    }

    lgaChanged += await applyGroup("lga", updates, keep);
  }

  if (lgaChanged) console.log(`  LGAs: ${lgaChanged} updated`);
  await insertMany("lga", lgaCreates, "LGAs");
  console.log(`  LGAs: ${await prisma.lga.count()}`);

  const lgaIdByCode = new Map(
    (await prisma.lga.findMany({ select: { id: true, code: true } })).map((l) => [l.code, l.id])
  );

  /* ── 4. Wards ─────────────────────────────────────────────────────────── */
  const wardCreates = [];
  let wardChanged = 0;
  let wardDropped = 0;

  /* A state at a time, not an LGA at a time. A ward code carries its LGA's
     number — OGU-019-04 — so renumbering an LGA moves every one of its wards
     onto codes another LGA in the same state is still holding. Ogun alone
     shifts fifteen LGAs and 180-odd wards with them. Only a transaction that
     spans the whole state can park them all before writing any of them. */
  for (const state of states) {
    const updates = [];
    const keep = [];
    const drop = [];

    /* One read for the state, grouped here, rather than one read per LGA. At
       774 LGAs that was 774 round trips just to find out what is already
       there, and enough short-lived sockets to exhaust the local port range
       mid-run. */
    const stateWards = await prisma.ward.findMany({
      where: { lga: { stateId: state.id } },
      select: {
        id: true,
        code: true,
        name: true,
        lgaId: true,
        _count: { select: { members: true } },
      },
    });

    const wardsByLga = new Map();
    for (const row of stateWards) {
      if (!wardsByLga.has(row.lgaId)) wardsByLga.set(row.lgaId, []);
      wardsByLga.get(row.lgaId).push(row);
    }

    for (const wantedLga of trees.get(state.id).lgas) {
      const lgaId = lgaIdByCode.get(wantedLga.code);
      if (!lgaId) continue; // dry run: the LGA has not been created yet
      const have = wardsByLga.get(lgaId) ?? [];
      const { matched, created, orphaned } = reconcile(have, wantedLga.wards);

      for (const [row, wanted] of matched) {
        if (row.code === wanted.code && row.name === wanted.name) continue;
        if (row.name !== wanted.name) {
          report.renamed.push(
            `ward ${state.name}/${wantedLga.name}: ${row.name} -> ${wanted.name}`
          );
        }
        updates.push({ id: row.id, data: { code: wanted.code, name: wanted.name } });
      }

      for (const wanted of created) {
        wardCreates.push({ code: wanted.code, name: wanted.name, lgaId });
      }

      for (const row of orphaned) {
        const where = `ward ${state.name}/${wantedLga.name}/${row.name} (${row.code})`;
        if (row._count.members > 0) {
          report.protected.push(`${where} left the register but holds ${row._count.members} member(s); kept`);
          keep.push(row);
        } else {
          report.orphaned.push(`${where} is not in the register; removed`);
          drop.push(row.id);
        }
      }
    }

    if (drop.length && !DRY_RUN) {
      await prisma.seat.deleteMany({ where: { wardId: { in: drop } } });
      await prisma.pollingUnit.deleteMany({ where: { wardId: { in: drop } } });
      await prisma.ward.deleteMany({ where: { id: { in: drop } } });
    }
    wardDropped += drop.length;

    wardChanged += await applyGroup("ward", updates, keep);
    if (wardChanged) {
      process.stdout.write(`\r  wards: ${wardChanged.toLocaleString()} updated`);
    }
  }
  if (wardChanged) process.stdout.write("\n");

  if (wardDropped) console.log(`  wards: ${wardDropped} removed`);
  await insertMany("ward", wardCreates, "wards");
  console.log(`  wards: ${(await prisma.ward.count()).toLocaleString()}`);

  /* ── 5. Polling units ─────────────────────────────────────────────────── */
  if (SKIP_PU) {
    console.log("  polling units: skipped (--skip-polling-units)");
  } else {
    const wardIdByCode = new Map(
      (await prisma.ward.findMany({ select: { id: true, code: true } })).map((w) => [w.code, w.id])
    );

    const unitCreates = [];
    const unitUpdates = [];
    const unitDeletes = [];

    for (const state of states) {
      /* One read per state, keyed by code. A state's polling units are five
         thousand rows at the most; 774 separate reads for the same data was
         what made this stage take twenty minutes and exhaust the local port
         range doing it.

         Keyed by code and not grouped by LGA on purpose: a unit whose LGA was
         renumbered still carries its old code until this stage rewrites it, so
         grouping on the code's prefix would file it under an LGA that is no
         longer its own, and it would be deleted and recreated for nothing. */
      const haveByCode = new Map(
        (
          await prisma.pollingUnit.findMany({
            where: { ward: { lga: { stateId: state.id } } },
            select: {
              id: true,
              code: true,
              name: true,
              wardId: true,
              _count: { select: { members: true } },
            },
          })
        ).map((row) => [row.code, row])
      );

      for (const wantedLga of trees.get(state.id).lgas) {
        if (!lgaIdByCode.get(wantedLga.code)) continue;

        const file = path.join(GEO_DIR, "pu", `${wantedLga.code}.json`);
        const units = existsSync(file) ? JSON.parse(await readFile(file, "utf8")) : {};

        for (const [wardNo, rows] of Object.entries(units)) {
          const wardId = wardIdByCode.get(`${wantedLga.code}-${wardNo}`);
          if (!wardId) continue; // dry run, or a ward that was just created

          for (const [unitNo, name] of rows) {
            const code = `${wantedLga.code}-${wardNo}-${unitNo}`;
            const row = haveByCode.get(code);

            if (!row) {
              unitCreates.push({ code, name, wardId });
              continue;
            }
            if (row.name !== name || row.wardId !== wardId) {
              unitUpdates.push({ id: row.id, data: { name, wardId } });
            }
            haveByCode.delete(code);
          }
        }
      }

      // Whatever the register no longer lists.
      for (const row of haveByCode.values()) {
        if (row._count.members > 0) {
          report.protected.push(
            `polling unit ${row.name} (${row.code}) left the register but holds ` +
              `${row._count.members} member(s); kept`
          );
        } else {
          unitDeletes.push(row.id);
        }
      }
    }

    /* A polling unit has no unique name to collide on, only its code, and the
       code is what identified it as the row to update — so no parking, just
       the one bulk statement per batch. */
    if (unitUpdates.length && !DRY_RUN) {
      for (let i = 0; i < unitUpdates.length; i += CHUNK) {
        await bulkRelabel(
          unitUpdates.slice(i, i + CHUNK).map(({ id, data }) => ({ id, ...data }))
        );
        process.stdout.write(
          `\r  polling units: ${Math.min(i + CHUNK, unitUpdates.length)}/${unitUpdates.length} updated`
        );
      }
      process.stdout.write(`\r  polling units: ${unitUpdates.length.toLocaleString()} updated\n`);
    } else if (unitUpdates.length) {
      console.log(`  polling units: would update ${unitUpdates.length.toLocaleString()}`);
    }
    await insertMany("pollingUnit", unitCreates, "polling units");

    if (unitDeletes.length) {
      if (DRY_RUN) {
        console.log(`  polling units: would delete ${unitDeletes.length.toLocaleString()}`);
      } else {
        for (let i = 0; i < unitDeletes.length; i += CHUNK) {
          await prisma.pollingUnit.deleteMany({
            where: { id: { in: unitDeletes.slice(i, i + CHUNK) } },
          });
        }
        console.log(`  polling units: ${unitDeletes.length.toLocaleString()} removed`);
      }
    }
    console.log(`  polling units: ${(await prisma.pollingUnit.count()).toLocaleString()}`);
  }

  /* ── 6. Role definitions ──────────────────────────────────────────────── */
  if (!DRY_RUN) {
    for (const role of roles) {
      const { zone, everyZone, ...data } = role;
      await prisma.roleDefinition.upsert({
        where: { code: role.code },
        // Roles are configuration: an edit to roles.mjs should reach the
        // database on the next seed, unlike geography, which follows INEC.
        update: data,
        create: data,
      });
    }
  }
  const roleRows = await prisma.roleDefinition.findMany();
  const roleByCode = new Map(roleRows.map((r) => [r.code, r]));
  console.log(`  roles: ${roleRows.length}`);

  /* ── 7. Seats ─────────────────────────────────────────────────────────── */
  if (RESET_SEATS && !DRY_RUN) {
    const held = await prisma.appointment.count();
    if (held > 0) {
      console.error(
        `\nRefusing --reset-seats: ${held} appointment(s) reference existing seats.\n` +
          "Deleting seats would orphan the movement's appointment history."
      );
      process.exit(1);
    }
    await prisma.seat.deleteMany();
    console.log("  seats: cleared");
  }

  const allLgas = await prisma.lga.findMany({ select: { id: true } });
  const allWards = await prisma.ward.findMany({ select: { id: true } });
  const seatRows = [];
  const push = (roleCode, scopeType, ids, count) => {
    const role = roleByCode.get(roleCode);
    if (!role) return;
    for (let i = 1; i <= count; i += 1) {
      seatRows.push({ roleId: role.id, scopeType, seatIndex: i, ...ids });
    }
  };

  // National, one seat each, no scope row.
  for (const role of roles.filter((r) => r.tier === "NATIONAL")) {
    push(role.code, "NATION", {}, 1);
  }

  // Zonal: the six ZC_* offices are scoped to their own zone (§6.8), the four
  // other zonal offices exist in every zone.
  for (const role of roles.filter((r) => r.tier === "ZONAL")) {
    if (role.zone) push(role.code, "ZONE", { zoneId: zoneByCode.get(role.zone).id }, 1);
    else for (const zone of zones) push(role.code, "ZONE", { zoneId: zone.id }, 1);
  }

  for (const role of roles.filter((r) => r.tier === "STATE")) {
    for (const state of states) push(role.code, "STATE", { stateId: state.id }, 1);
  }

  for (const role of roles.filter((r) => r.tier === "LGA")) {
    for (const lga of allLgas) push(role.code, "LGA", { lgaId: lga.id }, 1);
  }

  for (const ward of allWards) {
    if (WARD_COORDINATOR) {
      push("WD_COORD", "WARD", { wardId: ward.id }, 1);
      push("WD_OFFICER", "WARD", { wardId: ward.id }, 9);
    } else {
      push("WD_OFFICER", "WARD", { wardId: ward.id }, 10);
    }
  }

  /* ── Which of those seats are missing ─────────────────────────────────────
     NOT `skipDuplicates`. The seat_identity unique index spans four nullable
     scope columns, and Postgres does not treat NULL as equal to NULL in a
     unique index: two national seats with the same role and no scope row are,
     as far as the index is concerned, distinct. So skipDuplicates skipped
     nothing, and a second seed inserted a second copy of all 92,184 seats. The
     table reached 275,902 before this was caught.

     The identity is therefore compared here, in JavaScript, where a null is a
     null. This is also what makes the stage a reconcile rather than a one-off:
     a ward the register added gets its ten seats on the next run, and a ward it
     dropped had its seats deleted above. */
  const identity = (seat) =>
    [
      seat.roleId,
      seat.scopeType,
      seat.zoneId ?? "",
      seat.stateId ?? "",
      seat.lgaId ?? "",
      seat.wardId ?? "",
      seat.seatIndex,
    ].join("|");

  const existingSeats = await prisma.seat.findMany({
    select: {
      id: true,
      roleId: true,
      scopeType: true,
      zoneId: true,
      stateId: true,
      lgaId: true,
      wardId: true,
      seatIndex: true,
      _count: { select: { appointments: true } },
    },
  });

  const seen = new Map();
  const duplicates = [];
  for (const seat of existingSeats) {
    const key = identity(seat);
    const kept = seen.get(key);
    if (!kept) {
      seen.set(key, seat);
      continue;
    }
    /* Keep whichever copy somebody was appointed to; otherwise the older one.
       Two copies of one seat both holding appointments would be a genuine
       conflict, so that pair is reported and left alone. */
    if (seat._count.appointments > 0 && kept._count.appointments === 0) {
      duplicates.push(kept.id);
      seen.set(key, seat);
    } else if (seat._count.appointments === 0) {
      duplicates.push(seat.id);
    } else {
      report.protected.push(
        `seat ${key} exists twice and both copies hold an appointment; neither removed`
      );
    }
  }

  if (duplicates.length) {
    if (DRY_RUN) {
      console.log(`  seats: would remove ${duplicates.length.toLocaleString()} duplicate(s)`);
    } else {
      for (let i = 0; i < duplicates.length; i += CHUNK) {
        await prisma.seat.deleteMany({ where: { id: { in: duplicates.slice(i, i + CHUNK) } } });
      }
      console.log(`  seats: ${duplicates.length.toLocaleString()} duplicates removed`);
    }
  }

  const missing = seatRows.filter((seat) => !seen.has(identity(seat)));
  if (missing.length) await insertMany("seat", missing, "seats");
  else console.log(`  seats: ${seen.size.toLocaleString()} (nothing to add)`);

  /* ── Report ───────────────────────────────────────────────────────────── */
  const counts = {
    zones: await prisma.zone.count(),
    states: await prisma.state.count(),
    lgas: await prisma.lga.count(),
    wards: await prisma.ward.count(),
    pollingUnits: await prisma.pollingUnit.count(),
    roles: await prisma.roleDefinition.count(),
    seats: await prisma.seat.count(),
  };

  console.log(`\n${DRY_RUN ? "Currently in the database" : "Seeded"}:`);
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${k.padEnd(14)} ${v.toLocaleString()}`);
  }

  for (const [heading, lines] of [
    ["Renamed to match the register", report.renamed],
    ["Renumbered", report.recoded],
    ["Dropped by the register", report.orphaned],
    ["Kept, because a member points at them", report.protected],
  ]) {
    if (!lines.length) continue;
    console.log(`\n${heading} (${lines.length}):`);
    for (const line of lines.slice(0, 40)) console.log(`  ${line}`);
    if (lines.length > 40) console.log(`  … and ${lines.length - 40} more`);
  }

  console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(1)}s`);

  const dynamic = roles.filter((r) => r.approverRole === DYNAMIC_APPROVER).length;
  if (dynamic) {
    console.log(
      `\nNote: ${dynamic} roles approve via the zonal coordinator of the target's own\n` +
        "zone, which is resolved at query time — see lib/approvals.js."
    );
  }
}

main()
  .catch((error) => {
    console.error("\nSeed failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
