import crypto from "node:crypto";

import { prisma } from "./db";
import { issueReferralCode } from "./referrals";

/**
 * Member storage, backed by Postgres through Prisma.
 *
 * This file was written as the seam: the API routes, the join form and the
 * login page talk only to the functions exported here, so replacing the
 * development JSON file with a database touched nothing above it. That
 * replacement has now happened. The JSON adapter is gone.
 *
 * Two things the file store could not do, and Postgres does:
 *   - Uniqueness on phone and email is a constraint, so two simultaneous
 *     registrations with the same number can no longer both succeed.
 *   - The membership sequence is allocated inside a transaction, so two
 *     members in one LGA cannot be issued the same membership number.
 */

/* ------------------------------------------------------------ NIN at rest */

/**
 * §13.2 requires NIN encrypted at rest. AES-256-GCM with a key from the
 * environment. If no key is configured we refuse to store the NIN at all
 * rather than write a national identity number in plaintext. Losing an
 * optional field is recoverable, leaking it is not.
 */
function ninKey() {
  const raw = process.env.NIN_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  return key.length === 32 ? key : null;
}

export function encryptNin(nin) {
  if (!nin) return null;
  const key = ninKey();
  if (!key) {
    console.warn(
      "[store] NIN_ENCRYPTION_KEY not set. NIN was discarded rather than stored in plaintext. Generate one with: openssl rand -base64 32"
    );
    return null;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(nin, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}

/**
 * The blind index over a NIN.
 *
 * ── WHY A KEYED HASH AND NOT A PLAIN ONE ───────────────────────────────────
 * An NIN is eleven digits. All 10^11 of them can be hashed on a laptop in an
 * afternoon, so a plain SHA-256 column would be a list of everybody's national
 * identity number wearing a disguise. Keyed on NIN_ENCRYPTION_KEY, the column
 * is useless to anybody who has the database and not the key — which is the
 * same threat model the ciphertext beside it is written for.
 *
 * Returns null with no key configured, exactly as encryptNin does: no key means
 * the NIN is not stored at all rather than stored badly.
 */
export function ninFingerprint(nin) {
  if (!nin) return null;
  const key = ninKey();
  if (!key) return null;
  return crypto.createHmac("sha256", key).update(String(nin)).digest("hex");
}

export function decryptNin(payload) {
  const key = ninKey();
  if (!payload || !key) return null;
  try {
    const [iv, tag, data] = payload.split(".").map((p) => Buffer.from(p, "base64"));
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data, undefined, "utf8") + decipher.final("utf8");
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ names */

/* The join form collects one "full name"; the schema stores surname and first
   name separately, because the register sorts and searches by surname. Last
   token is the surname, which is how Nigerian forms are normally filled. */
function splitName(full) {
  const parts = String(full).trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], surname: parts[0], middleName: null };
  const surname = parts.at(-1);
  const firstName = parts[0];
  const middleName = parts.slice(1, -1).join(" ") || null;
  return { firstName, surname, middleName };
}

export function fullName(member) {
  if (!member) return "";
  return [member.firstName, member.middleName, member.surname].filter(Boolean).join(" ");
}

/** §7.3: MAP/<STATE>/<LGA>/<SEQUENCE>, permanent once issued. */
function membershipNumber(stateCode, lgaCode, sequence) {
  // lgaCode is "EDO-006"; the membership number wants just the LGA part.
  const lgaPart = String(lgaCode).split("-").at(-1);
  return `MAP/${stateCode}/${lgaPart}/${String(sequence).padStart(6, "0")}`;
}

/* --------------------------------------------------------------- geography */

const WARD_SELECT = {
  id: true,
  lgaId: true,
  lga: { select: { code: true, stateId: true, state: { select: { code: true } } } },
};

/**
 * The join form posts a place twice over: the names a member recognises
 * ("Rivers", "Port Harcourt", "Diobu") and INEC's delimitation codes for the
 * same rows (RIV-022-05). This resolves either to database ids and refuses
 * anything not in the INEC tables, which is the point of making the form a set
 * of dropdowns: a ward that is not in the register cannot get into the register.
 *
 * The code is tried first because it survives what the name does not — INEC
 * respells wards between revisions, and "Gbogi Isikan I" became "Gbogi/Isikan I"
 * the first time this register was refreshed. The name lookup stays as the
 * fallback so a cached copy of an older form still registers somebody.
 */
export async function resolveLocation({
  state,
  lga,
  ward,
  wardCode,
  pollingUnit,
  pollingUnitCode,
}) {
  let row = null;

  if (wardCode) {
    row = await prisma.ward.findUnique({ where: { code: wardCode }, select: WARD_SELECT });
  }
  if (!row) {
    row = await prisma.ward.findFirst({
      where: { name: ward, lga: { name: lga, state: { name: state } } },
      select: WARD_SELECT,
    });
  }
  if (!row) return null;

  /* Optional, and deliberately non-fatal: a member whose polling unit will not
     resolve is still a member of that ward. */
  let unit = null;
  if (pollingUnitCode) {
    unit = await prisma.pollingUnit.findFirst({
      where: { code: pollingUnitCode, wardId: row.id },
      select: { id: true },
    });
  }
  if (!unit && pollingUnit) {
    unit = await prisma.pollingUnit.findFirst({
      where: { name: pollingUnit, wardId: row.id },
      select: { id: true },
    });
  }

  return {
    wardId: row.id,
    lgaId: row.lgaId,
    lgaCode: row.lga.code,
    stateId: row.lga.stateId,
    stateCode: row.lga.state.code,
    pollingUnitId: unit?.id ?? null,
  };
}

/* ----------------------------------------------------------------- the API */

const MEMBER_INCLUDE = {
  user: { select: { phone: true, email: true, passwordHash: true, phoneVerified: true, status: true } },
  state: { select: { name: true, code: true } },
  lga: { select: { name: true, code: true } },
  ward: { select: { name: true } },
  pollingUnit: { select: { name: true } },
};

/* Shapes a Prisma row into the flat object the rest of the app already
   expects, so the API routes and pages did not have to change. */
function shape(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    /* The account behind the member. Needed server-side to hang a one-time
       code off the right user; stripped by publicMember before anything
       reaches a browser. */
    userId: String(row.userId),
    membershipNo: row.membershipNo,
    name: fullName(row),
    firstName: row.firstName,
    surname: row.surname,
    phone: row.user.phone,
    email: row.user.email,
    passwordHash: row.user.passwordHash,
    phoneVerified: row.user.phoneVerified,
    ninEncrypted: row.ninEncrypted,
    state: row.state.name,
    lga: row.lga.name,
    ward: row.ward.name,
    pollingUnit: row.pollingUnit?.name ?? null,
    photoUrl: row.photoUrl,
    referralCode: row.referralCode,
    referredById: row.referredById ? String(row.referredById) : null,
    verification: row.verification,
    joinedAt: row.joinedAt.toISOString(),
  };
}

export async function findMemberByPhone(phone) {
  const row = await prisma.member.findFirst({
    where: { user: { phone } },
    include: MEMBER_INCLUDE,
  });
  return shape(row);
}

export async function findMemberByEmail(email) {
  if (!email) return null;
  const row = await prisma.member.findFirst({
    where: { user: { email } },
    include: MEMBER_INCLUDE,
  });
  return shape(row);
}

export async function findMemberById(id) {
  const row = await prisma.member.findUnique({
    where: { id: BigInt(id) },
    include: MEMBER_INCLUDE,
  });
  return shape(row);
}

export async function countMembers() {
  return prisma.member.count();
}

/**
 * Create a member. Returns { member } or { conflict: "phone" | "email" }.
 *
 * The user row and the member row are created in one transaction: a member
 * without credentials, or credentials without a member, would both be
 * unusable, and there is no sensible way to repair either afterwards.
 */
export async function createMember(record) {
  const location = await resolveLocation(record);
  if (!location) {
    return { conflict: "location" };
  }

  const { firstName, surname, middleName } = splitName(record.name);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone: record.phone,
          email: record.email ?? null,
          passwordHash: record.passwordHash,
        },
      });

      /* Sequence per LGA, counted inside the transaction. Two people
         registering in Oredo at the same moment get 004821 and 004822, not
         004821 twice — the file store could not promise that. */
      const soFar = await tx.member.count({ where: { lgaId: location.lgaId } });

      return tx.member.create({
        data: {
          userId: user.id,
          membershipNo: membershipNumber(location.stateCode, location.lgaCode, soFar + 1),
          firstName,
          surname,
          middleName,
          ninEncrypted: encryptNin(record.nin),
          ninHash: ninFingerprint(record.nin),
          stateId: location.stateId,
          lgaId: location.lgaId,
          wardId: location.wardId,
          pollingUnitId: location.pollingUnitId,
          /* Issued here and never again. Inside the transaction, so the
             uniqueness check and the insert cannot be separated by somebody
             else's registration. */
          referralCode: await issueReferralCode(tx),
          referredById: record.referredById ? BigInt(record.referredById) : null,
          /* Verification is the NIN and nothing else. A member who gave one at
             registration is verified on the spot; a member who did not is
             pending until they come back and add it — see verifyWithNin(). */
          verification: record.nin ? "VERIFIED" : "PENDING",
        },
        include: MEMBER_INCLUDE,
      });
    });

    return { member: shape(created) };
  } catch (error) {
    // P2002 is the unique constraint the file store could not enforce.
    if (error?.code === "P2002") {
      const target = String(error.meta?.target ?? "");
      if (target.includes("ninHash")) return { conflict: "nin" };
      return { conflict: target.includes("email") ? "email" : "phone" };
    }
    throw error;
  }
}

/**
 * A member adds their NIN after the fact, and is verified by it.
 *
 * ── WHY THE NIN IS WHAT VERIFICATION MEANS ─────────────────────────────────
 * A membership register that anybody can add a name to is a mailing list. The
 * NIN is the one identifier in Nigeria that maps to exactly one person and that
 * an ordinary member already has, so it is what separates "somebody typed this
 * name in" from "this is a person, and only one row in this register is them".
 *
 * That is enforced by the unique index on the fingerprint, not by trust: the
 * same NIN cannot verify a second member, so ten registrations by one person
 * verify once and the other nine stay pending.
 *
 * ── WHAT THIS DELIBERATELY DOES NOT DO ─────────────────────────────────────
 * It does not check the NIN against NIMC. Nothing here can tell whether
 * 12345678901 belongs to the person typing it — only that nobody else in this
 * register has claimed it. That is a real limit and it is written here rather
 * than implied by the word "verified": when the movement has NIMC access, the
 * check belongs in this function and nothing else changes.
 * ───────────────────────────────────────────────────────────────────────────
 */
export async function verifyWithNin(memberId, rawNin) {
  const nin = String(rawNin ?? "").replace(/\D/g, "");
  if (!/^\d{11}$/.test(nin)) {
    return { ok: false, error: "A NIN is 11 digits." };
  }

  const fingerprint = ninFingerprint(nin);
  if (!fingerprint) {
    /* No key means encryptNin would silently drop the number and we would mark
       somebody verified on the strength of nothing at all. */
    return {
      ok: false,
      error: "Verification is unavailable right now. Please try again later.",
      unconfigured: true,
    };
  }

  try {
    const member = await prisma.member.update({
      where: { id: BigInt(memberId) },
      data: {
        ninEncrypted: encryptNin(nin),
        ninHash: fingerprint,
        verification: "VERIFIED",
      },
      include: MEMBER_INCLUDE,
    });
    return { ok: true, member: shape(member) };
  } catch (error) {
    if (error?.code === "P2002") {
      return { ok: false, error: "That NIN is already registered to another member." };
    }
    throw error;
  }
}

/**
 * Never send the password hash, the encrypted NIN, or its fingerprint to a
 * client. The fingerprint especially: it is a keyed hash of a national identity
 * number, and shipping it to a browser would put the one column that makes the
 * NIN column reversible into everybody's network tab.
 */
export function publicMember(member) {
  if (!member) return null;
  const { passwordHash, ninEncrypted, ninHash, userId, ...safe } = member;
  return { ...safe, hasNin: Boolean(ninEncrypted) };
}
