/**
 * The Prisma client, as a singleton.
 *
 * Next.js hot-reloads modules in development, and a fresh PrismaClient per
 * reload exhausts the connection pool within a few edits. Stashing it on
 * globalThis is the documented fix.
 *
 * Prisma 7 requires a driver adapter. `@prisma/adapter-pg` is the standard
 * Postgres driver: it talks to Neon's pooled endpoint over TCP and keeps this
 * file working unchanged against Supabase, RDS or a local Postgres. Swap to
 * `@prisma/adapter-neon` only if the app ever moves to the edge runtime.
 *
 * Server only.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/index.js";

const globalForPrisma = globalThis;

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Put your Neon pooled connection string in .env.local — see .env.example."
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.__mapPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.__mapPrisma = prisma;

/**
 * Prisma returns BigInt for our id columns and JSON.stringify refuses to
 * serialise BigInt. Every id crossing into a client component goes through
 * here, rather than each caller remembering to call String().
 */
export function serialise(value) {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === "bigint" ? String(v) : v))
  );
}
