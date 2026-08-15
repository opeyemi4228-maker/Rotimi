/**
 * Where errors go.
 *
 * ── WHY THIS IS NOT JUST console.error ─────────────────────────────────────
 * Until now it was. A ward coordinator hitting a broken page at 9pm on election
 * night produced a line in a log nobody was reading, on a serverless instance
 * that was about to be recycled. The first anybody heard about it was a phone
 * call, if the coordinator bothered.
 *
 * ── WHY IT IS NOT SENTRY EITHER ────────────────────────────────────────────
 * Because the movement does not have an account yet, and a file that hard-codes
 * one vendor is a file that has to be rewritten the day they pick a different
 * one. This is the same shape as lib/sms.js: one door, a driver behind it, and
 * an honest fallback when nothing is configured.
 *
 * With no SENTRY_DSN set it writes one structured JSON line per error, which is
 * what every hosting platform's log viewer can already search and alert on.
 * That is a real improvement over an unstructured stack trace and it costs
 * nothing. Set the DSN and the same errors go to Sentry as well.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Server only.
 */

/** Never let these near a log line, whatever an error carries with it. */
const REDACT = /^(password|passwordHash|nin|ninEncrypted|ninHash|vin|vinEncrypted|code|codeHash|token|secret|apiKey|api_key|authorization|cookie)$/i;

function scrub(value, depth = 0) {
  if (value == null || depth > 4) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => scrub(item, depth + 1));

  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = REDACT.test(key) ? "[redacted]" : scrub(entry, depth + 1);
  }
  return out;
}

/**
 * Report an error.
 *
 * Never throws. A reporter that can fail a request by failing to report is
 * strictly worse than no reporter, so everything here is wrapped.
 */
export function report(error, context = {}) {
  const entry = {
    level: "error",
    at: new Date().toISOString(),
    message: error?.message ?? String(error),
    name: error?.name ?? "Error",
    /* Prisma puts the useful part in `code` — P2002 says "unique violation"
       where the message says nothing. */
    code: error?.code ?? undefined,
    stack: typeof error?.stack === "string" ? error.stack.split("\n").slice(0, 12).join("\n") : undefined,
    ...scrub(context),
  };

  try {
    console.error(JSON.stringify(entry));
  } catch {
    console.error("[report] error could not be serialised:", error?.message);
  }

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  /* Fire and forget, and never awaited by a request. An error report that
     delays the error page is a second problem on top of the first. */
  sentry(dsn, entry).catch(() => {});
}

/**
 * Sentry's store endpoint, spoken directly.
 *
 * The official SDK is a large dependency that instruments the runtime; all this
 * needs is to POST one JSON document. If the movement later wants tracing and
 * session replay, install the SDK and delete this function — every caller is
 * already behind `report()`.
 */
async function sentry(dsn, entry) {
  const match = /^https:\/\/([^@]+)@([^/]+)\/(.+)$/.exec(dsn);
  if (!match) return;
  const [, key, host, project] = match;

  await fetch(`https://${host}/api/${project}/store/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${key}, sentry_client=map/1.0`,
    },
    body: JSON.stringify({
      timestamp: entry.at,
      level: "error",
      platform: "javascript",
      environment: process.env.NODE_ENV ?? "production",
      logger: entry.context ?? "server",
      exception: { values: [{ type: entry.name, value: entry.message }] },
      extra: entry,
    }),
    signal: AbortSignal.timeout(3000),
  });
}
