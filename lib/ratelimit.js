/**
 * Rate limiting for the endpoints somebody would attack.
 *
 * ── TWO COUNTERS, ONE DOOR ─────────────────────────────────────────────────
 * With UPSTASH_REDIS_REST_URL set, the window lives in Redis and every instance
 * of the app shares it. Without it, the window is a Map in this process — which
 * still stops a script trying ten thousand passwords against one phone number
 * from a laptop, but gives an attacker one window per running instance.
 *
 * Both are here because both are correct answers to different deployments. One
 * instance on a small plan does not need a Redis bill; four instances behind a
 * load balancer make the in-process counter a quarter as strong as it reads.
 * The caller cannot tell which is in use, and never needs to.
 *
 * ── WHY UPSTASH OVER THE REST API AND NOT A REDIS CLIENT ───────────────────
 * A TCP Redis client keeps a connection pool, which a serverless instance that
 * lives for 200ms cannot usefully own. The REST API is one fetch, works from
 * any runtime including edge, and needs no dependency. If the movement moves to
 * a long-lived server later, swap the driver in this file and nothing else
 * changes.
 *
 * ── AND WHY A FAILURE HERE ALLOWS THE REQUEST ──────────────────────────────
 * If Redis is unreachable, `limit()` falls back to the in-process counter
 * rather than refusing. A rate limiter that takes the site down when its own
 * dependency blinks is a worse outage than the attack it prevents — and the
 * fallback is not "no limit", it is the limit this file had all along.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Server only.
 */

/* Buckets live on globalThis so Next's hot reload does not hand every edit a
   fresh, empty limiter — which in development would mean no limit at all. */
const globalForLimit = globalThis;
const buckets = (globalForLimit.__mapRateLimit ??= new Map());

/* Windows are swept lazily. A background timer would keep a serverless
   instance alive for no reason, so expired buckets are dropped when they are
   next looked at, and the whole map is pruned once it gets large. */
const MAX_BUCKETS = 10_000;

export const LIMITS = {
  /* Ten failed sign-ins from one address in fifteen minutes. Generous for a
     coordinator who has forgotten which of two numbers they registered with,
     ruinous for a dictionary. */
  login: { max: 10, windowMs: 15 * 60 * 1000 },
  /* Registration is a write that creates rows. Five a hour from one address
     still lets a ward executive sign up together on one office wifi. */
  register: { max: 5, windowMs: 60 * 60 * 1000 },
  /* A polling unit agent files four returns and amends a couple. Twenty an
     hour is far past any honest use and far below anything that hurts. */
  results: { max: 20, windowMs: 60 * 60 * 1000 },
  /* Anonymous, and cheap to call, so it is the one somebody would use to
     enumerate the register. */
  referralLookup: { max: 60, windowMs: 10 * 60 * 1000 },
  /* A bulk SMS costs real money and reaches real phones, and there is no
     unsending it. Six an hour is more than any legitimate day of campaigning
     and few enough that a compromised coordinator account cannot spend the
     movement's whole SMS budget before somebody notices. Keyed by member rather
     than by address — see the route. */
  broadcast: { max: 6, windowMs: 60 * 60 * 1000 },
  /* Reading out every phone number in a territory. Entitled, but the most
     copyable thing in the system, so it is metered anyway. */
  recipientList: { max: 40, windowMs: 15 * 60 * 1000 },
  /* Asking for a one-time code. Each one costs money and rings somebody's
     phone, so this is an anti-harassment control as much as an anti-abuse one.
     lib/otp.js also holds a per-user floor; this is the per-address ceiling
     that stops a script walking a list of accounts. */
  otpSend: { max: 12, windowMs: 60 * 60 * 1000 },
  /* Guessing a code. lib/otp.js burns the code after six wrong attempts, so
     this only exists to stop somebody cycling request-code/guess/repeat. */
  otpVerify: { max: 20, windowMs: 15 * 60 * 1000 },
  /* Checking returns against their sheets. Generous — a State Coordinator on
     election night may work through hundreds — but not unbounded. */
  verifyReturn: { max: 300, windowMs: 60 * 60 * 1000 },
  /* Appointing to a seat or ending an appointment. The most consequential
     write in the app after a broadcast. */
  appoint: { max: 60, windowMs: 60 * 60 * 1000 },
  /* Standing for office. Three open applications is the real cap (see
     lib/applications), so this is only here to stop somebody hammering it. */
  apply: { max: 30, windowMs: 60 * 60 * 1000 },
  /* Enrolling or disarming a second factor. Both paths check a code, so this
     is the ceiling on guessing one. */
  mfa: { max: 20, windowMs: 15 * 60 * 1000 },
  /* Submitting a NIN. The unique index makes this an oracle — a refusal means
     somebody else already holds that number — so it is metered tightly. */
  ninVerify: { max: 5, windowMs: 60 * 60 * 1000 },
  /* Starting a password reset. Unauthenticated by necessity — the whole point
     is that the person cannot sign in — so it is the one OTP path an attacker
     can reach without an account. */
  passwordReset: { max: 6, windowMs: 60 * 60 * 1000 },
};

/* ──────────────────────────────────────────────────────────────── the store */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export const distributed = Boolean(REDIS_URL && REDIS_TOKEN);

/**
 * INCR the key, and set its expiry the first time it appears.
 *
 * Two commands in one pipeline round trip. INCR returns the count after the
 * increment, so a return of 1 means this request opened the window and is the
 * one that gets to set the TTL — no separate EXISTS check, and no race where
 * two simultaneous first requests both set it.
 */
async function bump(id, windowMs) {
  const response = await fetch(`${REDIS_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", id],
      ["PTTL", id],
    ]),
    /* A rate limiter must never be the slowest thing in a request. If Redis
       has not answered in a second, fall back and move on. */
    signal: AbortSignal.timeout(1000),
  });

  if (!response.ok) throw new Error(`redis ${response.status}`);

  const [incr, pttl] = await response.json();
  const count = Number(incr.result);
  let ttl = Number(pttl.result);

  /* -1 means the key exists with no expiry, which should be impossible and
     would mean a permanent lockout; -2 means it vanished between the two
     commands. Either way, (re)set the window. */
  if (ttl < 0) {
    await fetch(`${REDIS_URL}/pexpire/${encodeURIComponent(id)}/${windowMs}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      signal: AbortSignal.timeout(1000),
    }).catch(() => {});
    ttl = windowMs;
  }

  return { count, ttl };
}

/**
 * Take one token, across every instance of the app.
 *
 * The async twin of `limit()`, and the one to use in a route: it uses Redis
 * when Redis is configured and falls back to the in-process counter when it is
 * not, or when it is unreachable. Nothing is thrown.
 */
export async function limitShared(kind, key) {
  const rule = LIMITS[kind];
  if (!rule || !key) return { ok: true, remaining: Infinity, retryAfter: 0 };
  if (!distributed) return limit(kind, key);

  try {
    const { count, ttl } = await bump(`rl:${kind}:${key}`, rule.windowMs);

    if (count > rule.max) {
      return { ok: false, remaining: 0, retryAfter: Math.max(Math.ceil(ttl / 1000), 1) };
    }
    return { ok: true, remaining: rule.max - count, retryAfter: 0 };
  } catch (error) {
    /* Redis blinked. The in-process counter is a weaker limit, not no limit,
       and it is a great deal better than failing the request. */
    console.warn("[ratelimit] shared counter unavailable, falling back:", error?.message);
    return limit(kind, key);
  }
}

/** Forget a key in both stores. */
export async function forgetShared(kind, key) {
  forget(kind, key);
  if (!distributed) return;
  await fetch(`${REDIS_URL}/del/${encodeURIComponent(`rl:${kind}:${key}`)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    signal: AbortSignal.timeout(1000),
  }).catch(() => {});
}

/**
 * Take one token, in this process only.
 *
 * Returns `{ ok, remaining, retryAfter }` — `retryAfter` in seconds, ready for
 * the header. Nothing is thrown: a rate limiter that can fail a request by
 * accident is worse than the attack.
 */
export function limit(kind, key) {
  const rule = LIMITS[kind];
  if (!rule || !key) return { ok: true, remaining: Infinity, retryAfter: 0 };

  const now = Date.now();
  const id = `${kind}:${key}`;
  const bucket = buckets.get(id);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + rule.windowMs });
    if (buckets.size > MAX_BUCKETS) prune(now);
    return { ok: true, remaining: rule.max - 1, retryAfter: 0 };
  }

  bucket.count += 1;

  if (bucket.count > rule.max) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  return { ok: true, remaining: rule.max - bucket.count, retryAfter: 0 };
}

/** Forget a key — called after a *successful* sign-in, so one fat-fingered
    evening does not lock somebody out for the rest of the window. */
export function forget(kind, key) {
  buckets.delete(`${kind}:${key}`);
}

function prune(now) {
  for (const [id, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(id);
  }
}

/**
 * The caller's address.
 *
 * Behind a proxy the socket address is the proxy, so the forwarded header is
 * read first — and only the FIRST entry in it, because everything after the
 * first hop is attacker-controllable and trusting the last one would let
 * anybody mint a fresh identity per request by sending their own header.
 */
export function callerKey(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

/** A 429 with the header a well-behaved client will honour. */
export function tooMany(retryAfter, message) {
  return Response.json(
    { error: message ?? "Too many attempts. Try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}
