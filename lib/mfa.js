/**
 * Two-factor authentication: enrolment, challenge, and who is obliged to have it.
 *
 * ── §13.2, AND WHY IT MATTERS HERE MORE THAN MOST PLACES ───────────────────
 * A stolen State Coordinator password is not an account takeover, it is a
 * territory takeover: the whole state's register with every phone number in it,
 * the CSV exports, and the ability to text every member in it. A stolen
 * National Coordinator password is all of that for the federation. Password
 * alone is not a proportionate control for that, which is why the plan makes
 * MFA mandatory at state level and above.
 *
 * ── WHAT "MANDATORY" MEANS IN PRACTICE ─────────────────────────────────────
 * Not "cannot sign in" — a coordinator locked out of their own dashboard on
 * election morning is a worse outcome than the risk. It means: signing in
 * works, and the admin area gives them nothing but the enrolment screen until
 * they have set it up. They keep their membership, they keep the public site,
 * and the one thing behind the gate is the thing the gate is for.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Server only.
 */

import { prisma } from "./db";
import { TIER_RANK } from "./permissions";
import {
  generateRecoveryCodes,
  generateSecret,
  hashRecoveryCode,
  otpauthUri,
  verifyTotp,
} from "./totp";

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET is missing or too short. Recovery codes cannot be hashed without it.");
  }
  return value;
}

/**
 * Does this seat have to have two-factor on?
 *
 * State, zonal and national. Below that a coordinator's blast radius is one
 * LGA or one ward and the friction is not worth it — but the door is open: any
 * member may turn it on for themselves.
 */
export function mfaRequired(scope) {
  if (!scope) return false;
  return scope.tierRank <= TIER_RANK.STATE;
}

/**
 * Start enrolment: a secret and the QR the app scans.
 *
 * The secret is written to the user immediately but `mfaEnabled` stays false,
 * so it does nothing until a code proves the app actually has it. Enrolling
 * halfway and wandering off must not lock anybody out of anything.
 */
export async function beginEnrolment(userId, account) {
  const generated = generateSecret();

  await prisma.user.update({
    where: { id: BigInt(userId) },
    data: { mfaSecret: generated, mfaEnabled: false, mfaLastStep: null },
  });

  return {
    secret: generated,
    uri: otpauthUri({ secret: generated, account }),
  };
}

/**
 * Finish enrolment: prove the app has the secret, then switch it on.
 *
 * Returns the recovery codes in plaintext exactly once. They are never
 * retrievable afterwards — only their hashes are stored — so the screen that
 * shows them has to say so.
 */
export async function completeEnrolment(userId, code) {
  const user = await prisma.user.findUnique({
    where: { id: BigInt(userId) },
    select: { mfaSecret: true, mfaEnabled: true },
  });

  if (!user?.mfaSecret) {
    return { ok: false, error: "Start again — there is no enrolment in progress." };
  }
  if (user.mfaEnabled) {
    return { ok: false, error: "Two-factor authentication is already on for this account." };
  }

  const step = verifyTotp(user.mfaSecret, code);
  if (step == null) {
    return { ok: false, error: "That code is wrong. Check your phone's clock and try the next one." };
  }

  const codes = generateRecoveryCodes();

  await prisma.user.update({
    where: { id: BigInt(userId) },
    data: {
      mfaEnabled: true,
      mfaEnabledAt: new Date(),
      /* The step that enrolled is burned, so the code just typed cannot also be
         used to sign in. */
      mfaLastStep: BigInt(step),
      mfaRecovery: codes.map((entry) => hashRecoveryCode(entry, secret())),
    },
  });

  return { ok: true, codes };
}

/**
 * Check a code at sign-in — a TOTP, or one of the recovery codes.
 *
 * Returns `{ ok, usedRecovery, remaining }`. A recovery code is consumed by
 * being removed from the list, so each works once.
 */
export async function challenge(userId, code) {
  const user = await prisma.user.findUnique({
    where: { id: BigInt(userId) },
    select: { mfaSecret: true, mfaEnabled: true, mfaLastStep: true, mfaRecovery: true },
  });

  if (!user?.mfaEnabled || !user.mfaSecret) {
    /* Nothing to check. The caller should not have reached here, and answering
       "ok" would let a code-less request through — so it is a refusal. */
    return { ok: false, error: "Two-factor authentication is not enabled on this account." };
  }

  const step = verifyTotp(user.mfaSecret, code, {
    lastStep: user.mfaLastStep == null ? null : Number(user.mfaLastStep),
  });

  if (step != null) {
    await prisma.user.update({
      where: { id: BigInt(userId) },
      data: { mfaLastStep: BigInt(step) },
    });
    return { ok: true, usedRecovery: false };
  }

  /* Not a valid TOTP. It may still be a recovery code — checked second because
     the overwhelming majority of sign-ins are the app, and a recovery code is
     the exception somebody reaches for once. */
  const hashed = hashRecoveryCode(code, secret());
  if (user.mfaRecovery.includes(hashed)) {
    const remaining = user.mfaRecovery.filter((entry) => entry !== hashed);
    await prisma.user.update({
      where: { id: BigInt(userId) },
      data: { mfaRecovery: remaining },
    });
    return { ok: true, usedRecovery: true, remaining: remaining.length };
  }

  return { ok: false, error: "That code is not right." };
}

/**
 * Turn it off.
 *
 * Requires a current code, not just a session: somebody who has walked up to an
 * unlocked laptop must not be able to remove the control that would have
 * stopped them next time.
 */
export async function disable(userId, code) {
  const check = await challenge(userId, code);
  if (!check.ok) return check;

  await prisma.user.update({
    where: { id: BigInt(userId) },
    data: {
      mfaEnabled: false,
      mfaSecret: null,
      mfaLastStep: null,
      mfaEnabledAt: null,
      mfaRecovery: [],
    },
  });

  return { ok: true };
}

/** Whether an account has it on, and how many recovery codes are left. */
export async function mfaState(userId) {
  const user = await prisma.user.findUnique({
    where: { id: BigInt(userId) },
    select: { mfaEnabled: true, mfaEnabledAt: true, mfaRecovery: true, mfaSecret: true },
  });

  return {
    enabled: Boolean(user?.mfaEnabled),
    enabledAt: user?.mfaEnabledAt ?? null,
    recoveryLeft: user?.mfaRecovery?.length ?? 0,
    /* An enrolment that was started and never finished. The screen offers to
       start again rather than resuming, because the secret may be in an app
       the person no longer has. */
    pending: Boolean(user?.mfaSecret) && !user?.mfaEnabled,
  };
}
