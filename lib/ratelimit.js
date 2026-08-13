/**
 * Rate limiting for the endpoints somebody would attack.
 *
 * ── WHAT THIS IS AND IS NOT ────────────────────────────────────────────────
 * An in-process fixed-window counter. It stops a script trying ten thousand
 * passwords against one phone number from a laptop, which is the attack this
 * platform will actually see, and it costs nothing.
 *
 * It does NOT survive a restart, and it does NOT coordinate between instances.
 * On a platform that runs several copies of the app, an attacker gets one
 * window per instance. That is a real weakening and it is written down here
 * rather than hidden: when the movement outgrows one instance, move the counter
 * to Redis and change only this file — every caller is already behind
 * `limit()`.
 *
 * It is still worth having in that state. A hundred attempts per instance is
 * two orders of magnitude better than unlimited, and unlimited is what the
 * login route had.
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
};

/**
 * Take one token.
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
