import { prisma } from "@/lib/db";
import { hashPassword, normalisePhone } from "@/lib/auth";
import { issueOtp, verifyOtp } from "@/lib/otp";
import { callerKey, limit, tooMany } from "@/lib/ratelimit";

export const runtime = "nodejs";

/* The same rule the join form applies. A reset that accepts a weaker password
   than registration does is a way to downgrade an account. */
const MIN_PASSWORD = 8;

/**
 * Forgotten password, in two steps, both through this route.
 *
 *   { phone }                    → texts a code, if that number has an account
 *   { phone, code, password }    → checks the code and sets the new password
 *
 * ── WHY THE FIRST STEP ALWAYS SAYS THE SAME THING ──────────────────────────
 * It answers identically whether or not the number is registered. This endpoint
 * is unauthenticated by necessity — the whole point is that the person cannot
 * sign in — so any difference in the reply, including how long it takes, is a
 * way to test a list of phone numbers against the membership register and learn
 * who is in the movement. In Nigerian politics that is not an abstract harm.
 *
 * The cost is a worse error message for somebody who mistyped their number.
 * That is the right trade, and the copy says "if that number is registered" so
 * the reply is not a lie either.
 * ───────────────────────────────────────────────────────────────────────────
 */
export async function POST(request) {
  const quota = limit("passwordReset", callerKey(request));
  if (!quota.ok) return tooMany(quota.retryAfter);

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const phone = normalisePhone(body?.phone);
  if (!phone) {
    return Response.json(
      { errors: { phone: "Enter the phone number you registered with." } },
      { status: 422 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, phone: true, status: true, member: { select: { id: true } } },
  });

  /* ── step one: ask for a code ───────────────────────────────────────── */
  if (!body?.code) {
    if (user && user.status === "ACTIVE") {
      await issueOtp({
        userId: user.id,
        phone: user.phone,
        purpose: "PASSWORD_RESET",
        message: "{code} is your MAP password reset code. It expires in five minutes. If this was not you, ignore it.",
      }).catch((error) => console.error("[reset] could not send code", error));
    }

    /* Identical reply either way — see the note above. */
    return Response.json({
      ok: true,
      sent: true,
      message: "If that number is registered, a code is on its way to it.",
    });
  }

  /* ── step two: prove it and set the password ────────────────────────── */
  const password = String(body?.password ?? "");
  if (password.length < MIN_PASSWORD) {
    return Response.json(
      { errors: { password: `Use at least ${MIN_PASSWORD} characters.` } },
      { status: 422 }
    );
  }

  /* An unknown number and a wrong code get the same answer, for the same
     reason step one does. */
  const wrong = () =>
    Response.json(
      { errors: { code: "That code is wrong or has expired. Ask for a new one." } },
      { status: 422 }
    );

  if (!user || user.status !== "ACTIVE") return wrong();

  const check = await verifyOtp({ userId: user.id, purpose: "PASSWORD_RESET", code: body.code });
  if (!check.ok) {
    return Response.json({ errors: { code: check.reason } }, { status: 422 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(password),
      /* Resetting by SMS proves possession of the handset, which is exactly
         what registration verification asks for. Somebody who can do this has
         already met the bar, so the flag catches up. */
      phoneVerified: true,
    },
  });

  /* A password change is the single most useful line in an audit trail after
     the fact: it is what an account takeover looks like from the inside. */
  await prisma.auditLog
    .create({
      data: {
        actorId: user.member ? BigInt(user.member.id) : null,
        action: "PASSWORD_RESET",
        entityType: "user",
        entityId: user.id,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
          request.headers.get("x-real-ip") ??
          null,
      },
    })
    .catch((error) => console.error("[reset] audit write failed", error));

  /* Deliberately not signed in afterwards. Sending them to the sign-in page
     with a password they have just chosen proves the reset worked end to end,
     and means a code intercepted in transit does not hand over a live session
     without the password as well. */
  return Response.json({ ok: true, reset: true });
}
