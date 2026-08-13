import { NextResponse } from "next/server";

import { findReferrer } from "@/lib/referrals";
import { callerKey, limit, tooMany } from "@/lib/ratelimit";

export const runtime = "nodejs";

/**
 * Who a referral code belongs to.
 *
 * The join form calls this the moment a code is typed or arrives in a ?ref=
 * link, so somebody registering sees "Invited by Adaeze Okoro" before they fill
 * in three more steps — and finds out about a mistyped code immediately rather
 * than at submit.
 *
 * It returns a first name and a surname and nothing else. This endpoint is
 * unauthenticated by necessity (the person calling it has no account yet), so
 * it must never become a way to enumerate the register: no ward, no phone
 * number, no membership number, and no distinction in the response between a
 * code that is unused and one that never existed.
 */
export async function GET(request, { params }) {
  /* Unauthenticated by necessity, cheap to call, and it answers a yes/no about
     whether a code exists — which is exactly the shape somebody would use to
     walk the code space. */
  const quota = limit("referralLookup", callerKey(request));
  if (!quota.ok) return tooMany(quota.retryAfter);

  const { code } = await params;
  const referrer = await findReferrer(code);

  if (!referrer) {
    return NextResponse.json({ error: "Unknown referral code." }, { status: 404 });
  }

  return NextResponse.json(
    { name: referrer.name },
    // Codes are permanent; a short cache keeps a shared link from hitting the
    // database once per person who opens it.
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } }
  );
}
