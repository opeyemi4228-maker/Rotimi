/**
 * Time-based one-time passwords. RFC 6238, in about eighty lines.
 *
 * ── WHY NOT A LIBRARY ──────────────────────────────────────────────────────
 * TOTP is HMAC-SHA1 over a counter with a truncation rule, and the whole
 * specification fits on two pages. The npm packages that wrap it are mostly
 * wrappers around exactly this, and every dependency in an authentication path
 * is a dependency that can be compromised upstream. node:crypto already has
 * everything, and the parts worth getting right — the drift window, the replay
 * guard, constant-time comparison — are decisions this file has to make either
 * way.
 *
 * ── WHY SHA-1 ──────────────────────────────────────────────────────────────
 * Because Google Authenticator, Authy, 1Password and every other app a
 * coordinator already has on their phone implement RFC 6238's default and
 * nothing else. SHA-1's weakness is collision resistance, which HMAC does not
 * rely on; HMAC-SHA1 is not broken and is what interoperates. Choosing SHA-256
 * here would produce codes no authenticator app can generate.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Server only.
 */

import crypto from "node:crypto";

const DIGITS = 6;
const PERIOD = 30; // seconds

/* One step either side of now. Phone clocks drift, and a coordinator typing
   six digits at the end of a window would otherwise fail for no reason they
   can see. Two steps would be 90 seconds of validity, which is more than the
   convenience is worth. */
const DRIFT = 1;

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** A new shared secret, base32 as every authenticator app expects. */
export function generateSecret(bytes = 20) {
  return encodeBase32(crypto.randomBytes(bytes));
}

export function encodeBase32(buffer) {
  let bits = 0;
  let value = 0;
  let out = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function decodeBase32(input) {
  const clean = String(input).toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out = [];

  for (const character of clean) {
    const index = BASE32.indexOf(character);
    if (index < 0) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** The code for one 30-second step. */
export function codeAt(secret, step) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));

  const mac = crypto.createHmac("sha1", decodeBase32(secret)).update(counter).digest();
  /* RFC 4226 dynamic truncation: the low nibble of the last byte picks where
     to read four bytes from, so the code depends on the whole digest rather
     than a fixed slice of it. */
  const offset = mac[mac.length - 1] & 0x0f;
  const binary =
    ((mac[offset] & 0x7f) << 24) |
    (mac[offset + 1] << 16) |
    (mac[offset + 2] << 8) |
    mac[offset + 3];

  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

/**
 * Check a code, allowing for clock drift.
 *
 * Returns the step it matched, or null. The step is returned rather than a
 * boolean on purpose: the caller must store it and refuse to accept the same
 * step twice, or a code read over somebody's shoulder stays usable for the rest
 * of its window. That replay guard cannot live in here, because it needs to
 * persist — see `mfaLastStep` on the user.
 */
export function verifyTotp(secret, code, { at = Date.now(), lastStep = null } = {}) {
  const clean = String(code ?? "").replace(/\D/g, "");
  if (clean.length !== DIGITS) return null;

  const now = Math.floor(at / 1000 / PERIOD);

  for (let drift = -DRIFT; drift <= DRIFT; drift += 1) {
    const step = now + drift;
    /* Already used. Refused even though the code is arithmetically correct —
       this is the replay guard, and it is the whole reason the step is
       returned to the caller. */
    if (lastStep != null && step <= lastStep) continue;

    const expected = codeAt(secret, step);
    if (
      expected.length === clean.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(clean))
    ) {
      return step;
    }
  }

  return null;
}

/**
 * The otpauth:// URI an authenticator app scans.
 *
 * The issuer appears twice — once in the label and once as a parameter —
 * because older apps read one and newer ones read the other, and an entry that
 * says only "MAP" next to nine others called "MAP" is useless.
 */
export function otpauthUri({ secret, account, issuer = "MAP" }) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(PERIOD),
  });
  return `otpauth://totp/${label}?${params}`;
}

/* ──────────────────────────────────────────────────────── recovery codes */

/**
 * Ten single-use codes, for the phone that is lost, stolen or reset.
 *
 * Without these, mandatory MFA means a State Coordinator who drops their phone
 * in a river is locked out of their own territory until somebody with database
 * access intervenes — which, on election day, is the security control causing
 * the outage. They are shown once and stored only as hashes.
 *
 * Ten groups of five from an alphabet with no 0/O or 1/I/L, the same one the
 * referral codes use, because these get written on paper and read back.
 */
const RECOVERY_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateRecoveryCodes(count = 10) {
  const codes = [];
  for (let index = 0; index < count; index += 1) {
    let code = "";
    for (let position = 0; position < 10; position += 1) {
      if (position === 5) code += "-";
      code += RECOVERY_ALPHABET[crypto.randomInt(0, RECOVERY_ALPHABET.length)];
    }
    codes.push(code);
  }
  return codes;
}

/** Recovery codes are high-entropy, so a fast keyed hash is enough — the same
    reasoning as the OTP codes, for the opposite reason: there is nothing to
    brute force in 30^10. */
export function hashRecoveryCode(code, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(String(code).toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .digest("base64url");
}
