/**
 * Prisma 7 moved the connection URL out of schema.prisma and into here.
 *
 * DATABASE_URL is read from .env.local (which is gitignored) falling back to
 * .env. Use Neon's POOLED connection string — it ends in `-pooler` and is the
 * one that survives serverless. Migrations run fine over the pooler too.
 */

import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// .env.local wins over .env, matching how Next.js resolves them.
loadEnv({ path: ".env.local", override: true });

/* Read through process.env rather than Prisma's env() helper: env() throws on
   a missing variable at config load, which takes `prisma generate` and
   `prisma validate` down with it even though neither touches the database.
   Commands that DO need a connection fail on their own with a clear error. */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.mjs",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
