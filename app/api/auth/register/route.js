import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  validateRegistration,
  hashPassword,
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { createMember, publicMember } from "@/lib/store";
import { findReferrer } from "@/lib/referrals";

/* Node runtime, not edge: node:crypto's scryptSync is not available on edge. */
export const runtime = "nodejs";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const { ok, errors, clean } = validateRegistration(body);
  if (!ok) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  /* A referral code that does not belong to anybody is a typo, and telling
     them so is the only way they get to fix it. Registering them anyway with
     the credit dropped would be the worst of both: the member is in, and the
     person who brought them in never appears. */
  let referrer = null;
  if (clean.referralCode) {
    referrer = await findReferrer(clean.referralCode);
    if (!referrer) {
      return NextResponse.json(
        { errors: { referralCode: "No member holds that referral code. Check it and try again." } },
        { status: 422 }
      );
    }
  }

  let result;
  try {
    result = await createMember({
      ...clean,
      referredById: referrer?.id ?? null,
      passwordHash: hashPassword(clean.password),
    });
  } catch (error) {
    console.error("[register]", error);
    return NextResponse.json(
      { error: "Registration is unavailable right now. Please try again shortly." },
      { status: 503 }
    );
  }

  if (result.conflict === "phone") {
    return NextResponse.json(
      { errors: { phone: "That number is already registered. Log in instead." } },
      { status: 409 }
    );
  }
  if (result.conflict === "email") {
    return NextResponse.json(
      { errors: { email: "That email address is already registered." } },
      { status: 409 }
    );
  }
  /* The form's dropdowns are fed from the same INEC tables the database holds,
     so this only fires if someone posted straight to the API. Rejecting it
     keeps the register free of wards that do not exist. */
  if (result.conflict === "location") {
    return NextResponse.json(
      { errors: { ward: "That state, LGA and ward combination is not in the INEC register." } },
      { status: 422 }
    );
  }

  // Registration signs you straight in: one less step, and the confirmation
  // page needs the membership number anyway.
  const store = await cookies();
  store.set(
    SESSION_COOKIE,
    createSession({ sub: result.member.id, name: result.member.name }),
    sessionCookieOptions
  );

  return NextResponse.json({ member: publicMember(result.member) }, { status: 201 });
}
