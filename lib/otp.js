/**
 * One-time codes to a phone. §7.2 (registration) and §13.2 (five-minute expiry,
 * hashed, single use).
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * Until now anybody could register with anybody else's number. The number was
 * never checked, so the register could be filled with real people's phones by
 * somebody who had a list of them — and those numbers then receive the
 * movement's bulk SMS. Proving possession of the handset at registration is the
 * one control that stops that, and it is the same control that makes a password
 * reset safe, so both go through this file.
 *
 * ── ON HASHING A SIX-DIGIT CODE ────────────────────────────────────────────
 * There are only a million of them, so no hash — scrypt included — makes a
 * stolen database safe against brute force. The hash is here for a narrower
 * reason: a leaked backup, a log line or a careless SELECT must not hand
 * somebody a live code. What actually protects the code is the five-minute
 * window and the attempt cap, and those are enforced below, not by the hash.
 *
 * HMAC keyed on SESSION_SECRET rather than a slow KDF, deliberately: the server
 * verifies these on the hot path and a 100ms scrypt per attempt would be a way
 * to exhaust the server rather than a way to protect the code.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Server only.
 */

import crypto from "node:crypto";

import { prisma } from "./db";
import { sendBulk, smsProvider } from "./sms";

/* §13.2. Long enough to arrive on a slow Nigerian network, short enough that a
   code read over somebody's shoulder is worthless by the time it is used. */
const TTL_MS = 5 * 60 * 1000;

/* Six wrong guesses burns the code. At 6 attempts against 10^6 codes inside a
   five-minute window, the chance of guessing is about 1 in 167,000 — and the
   seventh attempt does not get to find out. */
const MAX_ATTEMPTS = 6;

/* How often one number may be sent a code. Each one costs money and rings a
   real phone, so this is as much an anti-harassment control as an anti-abuse
   one: without it, this endpoint is a way to make somebody's phone buzz all
   afternoon for free. */
const RESEND_WINDOW_MS = 60 * 1000; // no second code inside a minute
const PER_HOUR = 5;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET is missing or too short. OTP codes cannot be hashed without it.");
  }
  return value;
}

/** The stored form of a code. Keyed on the server secret, so the database alone
    is not enough to read one. */
function digest(code, userId, purpose) {
  return crypto
    .createHmac("sha256", secret())
    .update(`${purpose}:${userId}:${code}`)
    .digest("base64url");
}

/**
 * Six digits, uniformly.
 *
 * `randomInt` and not `randomBytes % 1000000`: the modulo is biased towards low
 * numbers, and a code generator with a known bias is a code generator worth
 * guessing at.
 */
function generate() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Issue a code and text it.
 *
 * Returns `{ ok, retryAfter, reason, expiresAt }`. Never returns the code —
 * there is no caller that legitimately needs it, and a code that can be
 * returned to the browser is a code that can be read out of a network tab.
 *
 * The one exception is a gateway set to `console`, which is explicit, local,
 * and already prints every message it is given.
 */
export async function issueOtp({ userId, phone, purpose, message }) {
  const id = BigInt(userId);
  const now = new Date();

  /* Two limits, both per user: a floor between codes, and a ceiling per hour.
     Checked before anything is written, so a refused request costs one SELECT
     and no SMS. */
  const [recent, hourly] = await Promise.all([
    prisma.otpCode.findFirst({
      where: { userId: id, purpose, createdAt: { gte: new Date(now - RESEND_WINDOW_MS) } },
      select: { createdAt: true },
    }),
    prisma.otpCode.count({
      where: { userId: id, purpose, createdAt: { gte: new Date(now - 60 * 60 * 1000) } },
    }),
  ]);

  if (recent) {
    const wait = Math.ceil((RESEND_WINDOW_MS - (now - recent.createdAt)) / 1000);
    return { ok: false, retryAfter: Math.max(wait, 1), reason: "A code was just sent. Wait a moment." };
  }
  if (hourly >= PER_HOUR) {
    return {
      ok: false,
      retryAfter: 3600,
      reason: "Too many codes have been sent to this number in the last hour.",
    };
  }

  const gateway = smsProvider();
  if (!gateway.configured) {
    return { ok: false, retryAfter: 0, reason: gateway.reason, unconfigured: true };
  }

  const code = generate();
  const expiresAt = new Date(now.getTime() + TTL_MS);

  /* Any earlier unused code for this purpose stops working the moment a new one
     is issued. Two live codes on one number means a code that was texted, seen
     by somebody else and superseded is still valid — which is exactly the case
     this is meant to close. */
  await prisma.$transaction([
    prisma.otpCode.updateMany({
      where: { userId: id, purpose, consumedAt: null },
      data: { consumedAt: now },
    }),
    prisma.otpCode.create({
      data: { userId: id, purpose, codeHash: digest(code, userId, purpose), expiresAt },
    }),
  ]);

  const text = (message ?? "Your MAP code is {code}. It expires in five minutes. Do not share it.")
    .replace("{code}", code);

  const sent = await sendBulk({ numbers: [phone], body: text });

  if (sent.accepted === 0) {
    /* The gateway refused it, so the code will never arrive. Consume it rather
       than leaving a live code nobody has — otherwise the resend floor above
       locks the person out of retrying for a minute for no reason. */
    await prisma.otpCode.updateMany({
      where: { userId: id, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return {
      ok: false,
      retryAfter: 0,
      reason: sent.error ?? "The code could not be sent to that number.",
    };
  }

  return { ok: true, expiresAt, provider: sent.provider };
}

/**
 * Check a code.
 *
 * Returns `{ ok, reason, remaining }`. Consumes the code on success, and counts
 * the attempt on failure — a code with six failures behind it is dead whether
 * or not the seventh guess would have been right.
 */
export async function verifyOtp({ userId, purpose, code }) {
  const id = BigInt(userId);
  const clean = String(code ?? "").replace(/\D/g, "");

  if (clean.length !== 6) {
    return { ok: false, reason: "Enter the six digits from the text message." };
  }

  const row = await prisma.otpCode.findFirst({
    where: { userId: id, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, codeHash: true, expiresAt: true, attempts: true },
  });

  if (!row) {
    return { ok: false, reason: "That code has been used, or none was sent. Ask for a new one." };
  }
  if (row.expiresAt <= new Date()) {
    return { ok: false, reason: "That code has expired. Ask for a new one." };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    await prisma.otpCode.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
    return { ok: false, reason: "Too many wrong attempts. Ask for a new code." };
  }

  const expected = digest(clean, userId, purpose);
  const match =
    expected.length === row.codeHash.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(row.codeHash));

  if (!match) {
    const after = await prisma.otpCode.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
    const remaining = Math.max(MAX_ATTEMPTS - after.attempts, 0);
    return {
      ok: false,
      remaining,
      reason: remaining
        ? `That code is wrong. ${remaining} ${remaining === 1 ? "attempt" : "attempts"} left.`
        : "Too many wrong attempts. Ask for a new code.",
    };
  }

  await prisma.otpCode.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
  return { ok: true };
}

/** Housekeeping: consumed and expired codes are noise after the fact. Called
    opportunistically, never on the hot path. */
export async function pruneOtp() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { count } = await prisma.otpCode.deleteMany({
    where: { OR: [{ consumedAt: { lt: cutoff } }, { expiresAt: { lt: cutoff } }] },
  });
  return count;
}
