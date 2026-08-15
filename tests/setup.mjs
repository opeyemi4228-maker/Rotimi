/**
 * Test bootstrap.
 *
 * Registers the resolver hook and supplies the two environment variables the
 * modules under test read at import time. Nothing here connects to anything:
 * lib/db.js builds a Prisma client at module load and would throw without a
 * URL, but no test in this suite issues a query, so a syntactically valid
 * string is all it needs. A test that wants real rows should say so loudly by
 * asking for a real database, not by inheriting one by accident.
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./loader.mjs", pathToFileURL(import.meta.filename));

process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";
process.env.SESSION_SECRET ??= "test-secret-that-is-definitely-long-enough-32";
process.env.NIN_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
