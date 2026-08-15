import { prisma } from "@/lib/db";
import { currentMember } from "@/lib/session";
import { issueOtp, verifyOtp } from "@/lib/otp";
import { callerKey, limit, tooMany } from "@/lib/ratelimit";

export const runtime = "nodejs";

/**
 * Confirm the phone number a member registered with. §7.2.
 *
 * ── WHY THE ACCOUNT EXISTS BEFORE THE PHONE IS PROVEN ──────────────────────
 * The code has to be sent to a user row, because that is what OtpCode hangs
 * off. So registration creates the account with `phoneVerified: false` and the
 * number is proven immediately afterwards. That is a weaker guarantee than
 * proving it first, and it is the right trade for two reasons: the register
 * already refuses a number that belongs to somebody else, so this cannot be
 * used to take over an existing member; and a half-finished registration that
 * leaves nothing behind is a registration the person has to start again from
 * the beginning on a bad connection.
 *
 * What `phoneVerified` then means is exact: somebody held this handset. Nothing
 * else in the app may treat an unverified number as reachable.
 * ───────────────────────────────────────────────────────────────────────────
 */
export async function POST(request) {
  const member = await currentMember();
  if (!member) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const account = await prisma.user.findUnique({
    where: { id: BigInt(member.userId) },
    select: { id: true, phone: true, phoneVerified: true },
  });

  if (!account) {
    return Response.json({ error: "No account found." }, { status: 404 });
  }

  if (account.phoneVerified) {
    return Response.json({ ok: true, alreadyVerified: true });
  }

  /* ── resend ─────────────────────────────────────────────────────────── */
  if (body?.resend === true) {
    /* Metered by address as well as by the per-user floor inside issueOtp: the
       floor stops one person hammering their own number, this stops a script
       walking a list of accounts. */
    const quota = limit("otpSend", callerKey(request));
    if (!quota.ok) return tooMany(quota.retryAfter);

    const sent = await issueOtp({
      userId: account.id,
      phone: account.phone,
      purpose: "REGISTRATION",
      message: "{code} is your MAP confirmation code. It expires in five minutes.",
    });

    if (!sent.ok) {
      return Response.json(
        { error: sent.reason, retryAfter: sent.retryAfter },
        { status: sent.unconfigured ? 503 : 429 }
      );
    }
    return Response.json({ ok: true, sent: true, expiresAt: sent.expiresAt });
  }

  /* ── verify ─────────────────────────────────────────────────────────── */
  const quota = limit("otpVerify", `member:${member.id}`);
  if (!quota.ok) return tooMany(quota.retryAfter);

  const result = await verifyOtp({
    userId: account.id,
    purpose: "REGISTRATION",
    code: body?.code,
  });

  if (!result.ok) {
    return Response.json({ error: result.reason, remaining: result.remaining }, { status: 422 });
  }

  await prisma.user.update({
    where: { id: account.id },
    data: { phoneVerified: true },
  });

  /* Worth a line in the trail: it is the moment a row in the register stops
     being a claim and becomes a person who answered a phone. */
  await prisma.auditLog
    .create({
      data: {
        actorId: BigInt(member.id),
        action: "PHONE_VERIFIED",
        entityType: "user",
        entityId: account.id,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
          request.headers.get("x-real-ip") ??
          null,
      },
    })
    .catch((error) => console.error("[verify-phone] audit write failed", error));

  return Response.json({ ok: true });
}
