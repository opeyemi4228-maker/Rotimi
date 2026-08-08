/**
 * Issues a referral code to every member registered before codes existed.
 *
 *   node scripts/backfill-referral-codes.mjs
 *   node scripts/backfill-referral-codes.mjs --dry-run
 *
 * Idempotent: it only touches rows where referralCode is null, so running it
 * twice issues nothing the second time and cannot reissue a code somebody has
 * already put on a poster.
 *
 * Run this once after the migration that adds the column. New members get their
 * code inside the same transaction that creates them — see lib/store.js — so
 * this script has no ongoing job.
 */

import crypto from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "../lib/generated/prisma/index.js";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const DRY_RUN = process.argv.includes("--dry-run");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. See .env.example.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/* Kept in step with lib/referrals.js, which is the definition. Duplicated
   rather than imported because that module pulls in the request-scoped Prisma
   client from lib/db.js, and a script must not inherit a web server's
   connection handling. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const LENGTH = 6;

function candidate() {
  let out = "";
  while (out.length < LENGTH) {
    for (const byte of crypto.randomBytes(LENGTH * 2)) {
      if (byte >= 240) continue; // 240 = 8 x 30; above it the first 16 bias
      out += ALPHABET[byte % ALPHABET.length];
      if (out.length === LENGTH) break;
    }
  }
  return out;
}

async function main() {
  const pending = await prisma.member.findMany({
    where: { referralCode: null },
    select: { id: true, firstName: true, surname: true },
    orderBy: { id: "asc" },
  });

  if (!pending.length) {
    console.log("Every member already holds a referral code. Nothing to do.");
    return;
  }

  console.log(
    `${pending.length.toLocaleString()} member(s) without a code${DRY_RUN ? " — dry run, nothing is written" : ""}\n`
  );

  /* Every code already issued, read once. Generating against the database one
     row at a time would be one round trip per member to answer a question a
     Set answers for free. */
  const taken = new Set(
    (
      await prisma.member.findMany({
        where: { referralCode: { not: null } },
        select: { referralCode: true },
      })
    ).map((row) => row.referralCode)
  );

  let issued = 0;
  for (const member of pending) {
    let code = candidate();
    while (taken.has(code)) code = candidate();
    taken.add(code);

    if (!DRY_RUN) {
      await prisma.member.update({ where: { id: member.id }, data: { referralCode: code } });
    }
    issued += 1;
    if (issued <= 20 || issued === pending.length) {
      console.log(`  ${code}  ${member.firstName} ${member.surname}`);
    } else if (issued === 21) {
      console.log(`  … and ${(pending.length - 20).toLocaleString()} more`);
    }
  }

  console.log(`\n${DRY_RUN ? "Would issue" : "Issued"} ${issued.toLocaleString()} code(s).`);
}

main()
  .catch((error) => {
    console.error("\nBackfill failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
