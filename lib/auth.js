import crypto from "node:crypto";

/**
 * Password hashing, session signing and input validation.
 *
 * Server only. Never import this into a client component. It uses node:crypto
 * rather than bcrypt/argon2 so there is no native dependency to build; scrypt
 * is memory-hard and is what Node ships for exactly this purpose.
 *
 * The platform plan §13.2 specifies Argon2id. scrypt with these parameters is a
 * defensible stand-in and the interface here (`hashPassword`/`verifyPassword`)
 * is the only thing that would need to change to move to Argon2id later.
 */

/* OWASP-recommended scrypt parameters: N=2^16, r=8, p=1, 64-byte output.
   maxmem must be raised explicitly or Node refuses N this large. */
const SCRYPT = { N: 65536, r: 8, p: 1, keylen: 64, maxmem: 128 * 65536 * 8 * 2 };

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password.normalize("NFKC"), salt, SCRYPT.keylen, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export function verifyPassword(password, stored) {
  try {
    const [scheme, N, r, p, salt, key] = String(stored).split("$");
    if (scheme !== "scrypt") return false;
    const expected = Buffer.from(key, "base64url");
    const actual = crypto.scryptSync(
      password.normalize("NFKC"),
      Buffer.from(salt, "base64url"),
      expected.length,
      { N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem }
    );
    // Constant-time: a fast "wrong password" leaks which prefix matched.
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/* ----------------------------------------------------------------- sessions */

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set a random 32+ character value in .env.local. Sessions cannot be signed without it."
    );
  }
  return secret;
}

export const SESSION_COOKIE = "map_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Signed, tamper-evident session token. Payload is readable, not secret. */
export function createSession(payload) {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + SESSION_MAX_AGE * 1000 })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", sessionSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

export function readSession(token) {
  if (!token || typeof token !== "string") return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = crypto
    .createHmac("sha256", sessionSecret())
    .update(body)
    .digest("base64url");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

/* --------------------------------------------------------------- normalising */

/**
 * Nigerian mobile numbers to a single canonical form (+234XXXXXXXXXX).
 * "0803 123 4567", "803 123 4567", "+2348031234567" and "2348031234567" are
 * the same person, and the plan makes phone the unique login credential, so
 * they must not be able to create four accounts.
 */
export function normalisePhone(input) {
  if (!input) return null;
  const digits = String(input).replace(/[^\d+]/g, "").replace(/^\+/, "");
  let local = null;

  if (/^234\d{10}$/.test(digits)) local = digits.slice(3);
  else if (/^0\d{10}$/.test(digits)) local = digits.slice(1);
  else if (/^\d{10}$/.test(digits)) local = digits;

  // Nigerian mobile prefixes start 70, 80, 81, 90 or 91.
  if (!local || !/^[789][01]\d{8}$/.test(local)) return null;
  return `+234${local}`;
}

export function normaliseEmail(input) {
  if (!input) return null;
  const email = String(input).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}

/** Login accepts either credential, so work out which one was typed. */
export function parseIdentifier(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  if (raw.includes("@")) {
    const email = normaliseEmail(raw);
    return email ? { type: "email", value: email } : null;
  }
  const phone = normalisePhone(raw);
  return phone ? { type: "phone", value: phone } : null;
}

/* --------------------------------------------------------------- validation */

const WARD_CODE = /^[A-Z]{3}-\d{3}-\d{2}$/; //          OND-006-07
/* The trailing letter is ours, not INEC's: twenty-nine wards number two of
   their polling units the same, and the second is filed as 012B rather than
   dropped. See scripts/build-geography.mjs. */
const UNIT_CODE = /^[A-Z]{3}-\d{3}-\d{2}-\d{3}[A-Z]?$/; // OND-006-07-003

function code(input, shape) {
  const value = String(input ?? "").trim().toUpperCase();
  return shape.test(value) ? value : null;
}

export function validateRegistration(input) {
  const errors = {};
  const clean = {};

  const name = String(input.name ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 3) errors.name = "Enter your full name.";
  else if (!/^[\p{L}'’.\- ]+$/u.test(name)) errors.name = "Use letters only.";
  else clean.name = name;

  const phone = normalisePhone(input.phone);
  if (!phone) errors.phone = "Enter a valid Nigerian mobile number.";
  else clean.phone = phone;

  // Optional, but must be valid if given: it is a login credential.
  if (String(input.email ?? "").trim()) {
    const email = normaliseEmail(input.email);
    if (!email) errors.email = "Enter a valid email address.";
    else clean.email = email;
  } else {
    clean.email = null;
  }

  /* Optional by design, and consistent with the privacy policy. NIN is not
     verified against NIMC. Nothing here proves the number belongs to the
     person typing it, and the UI must not imply otherwise. */
  const nin = String(input.nin ?? "").replace(/\D/g, "");
  if (nin && !/^\d{11}$/.test(nin)) errors.nin = "A NIN is 11 digits.";
  else clean.nin = nin || null;

  for (const field of ["state", "lga", "ward"]) {
    const value = String(input[field] ?? "").trim();
    if (!value) errors[field] = "Required.";
    else clean[field] = value;
  }

  clean.pollingUnit = String(input.pollingUnit ?? "").trim() || null;

  /* INEC's delimitation codes, as the form's selects supply them: OND-006-07
     for a ward, OND-006-07-003 for a polling unit. They are how the server
     identifies the place — the names above are what the member reads back.
     Anything malformed is dropped rather than rejected, so an older client
     that posts names alone still registers somebody. */
  clean.wardCode = code(input.wardCode, WARD_CODE);
  clean.pollingUnitCode = code(input.pollingUnitCode, UNIT_CODE);

  /* Who invited them. Optional, and only checked for shape here — whether the
     code belongs to a real member is a database question, answered in the
     route. An unreadable code is rejected rather than ignored, because
     somebody typed it for a reason and silently dropping it loses the one
     person who has a claim to have brought them in. */
  const referral = String(input.referralCode ?? "").trim();
  if (referral) {
    const shape = referral.toUpperCase().replace(/^MAP[-\s]*/, "").replace(/[^A-Z0-9]/g, "");
    if (shape.length !== 6) errors.referralCode = "A referral code is six characters.";
    else clean.referralCode = shape;
  } else {
    clean.referralCode = null;
  }

  const password = String(input.password ?? "");
  if (password.length < 8) errors.password = "At least 8 characters.";
  else if (!/[a-zA-Z]/.test(password) || !/\d/.test(password))
    errors.password = "Include at least one letter and one number.";
  else clean.password = password;

  return { errors, clean, ok: Object.keys(errors).length === 0 };
}
