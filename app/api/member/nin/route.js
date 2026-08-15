import { prisma } from "@/lib/db";
import { currentMember } from "@/lib/session";
import { verifyWithNin } from "@/lib/store";
import { callerKey, limitShared, tooMany } from "@/lib/ratelimit";

export const runtime = "nodejs";

/**
 * Add a National Identification Number, and be verified by it.
 *
 * The NIN never leaves this route in either direction: it arrives once, is
 * encrypted and fingerprinted, and the response says only whether it worked.
 * Nothing in the app reads it back — `publicMember` strips the ciphertext and
 * returns `hasNin` instead.
 */
export async function POST(request) {
  const member = await currentMember();
  if (!member) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  /* Metered because the unique index turns this into an oracle: without a
     limit, somebody could walk NINs and learn which ones are already in the
     register from the error message. */
  const quota = await limitShared("ninVerify", `member:${member.id}`);
  if (!quota.ok) return tooMany(quota.retryAfter);

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const result = await verifyWithNin(member.id, body?.nin);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.unconfigured ? 503 : 422 });
  }

  await prisma.auditLog
    .create({
      data: {
        actorId: BigInt(member.id),
        action: "VERIFIED_BY_NIN",
        entityType: "member",
        entityId: BigInt(member.id),
        // The number itself is never written to the trail — only that it happened.
        afterState: { verification: "VERIFIED" },
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
          request.headers.get("x-real-ip") ??
          null,
      },
    })
    .catch((error) => console.error("[nin] audit write failed", error));

  return Response.json({
    ok: true,
    verification: "VERIFIED",
    membershipNo: result.member.membershipNo,
  });
}
