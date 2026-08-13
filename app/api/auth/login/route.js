import { NextResponse } from "next/server";

import { callerKey, forget, limit, tooMany } from "@/lib/ratelimit";
import { cookies } from "next/headers";
import {
  parseIdentifier,
  verifyPassword,
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { findMemberByPhone, findMemberByEmail, publicMember } from "@/lib/store";

export const runtime = "nodejs";

/* A throwaway hash to compare against when no account matches. Without it the
   "no such member" path returns in microseconds while the real path spends
   ~100ms in scrypt, which tells an attacker which phone numbers are
   registered. Comparing against this keeps both paths the same cost. */
const DUMMY_HASH =
  "scrypt$65536$8$1$AAAAAAAAAAAAAAAAAAAAAA$" +
  "Y2Fubm90bWF0Y2hhbnl0aGluZ2V2ZXJiZWNhdXNlaXRpc25vdGFyZWFsZGVyaXZlZGtleQ";

export async function POST(request) {
  /* Before anything is read or hashed. Verifying a password is deliberately
     expensive — scrypt with N=65536 — so an unlimited login endpoint is both a
     credential-stuffing target and a way to exhaust the server's CPU with
     nothing but wrong guesses. */
  const caller = callerKey(request);
  const quota = limit("login", caller);
  if (!quota.ok) {
    return tooMany(quota.retryAfter, "Too many sign-in attempts. Try again in a few minutes.");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const identifier = parseIdentifier(body.identifier);
  const password = String(body.password ?? "");

  if (!identifier || !password) {
    return NextResponse.json(
      { error: "Enter your phone number or email address, and your password." },
      { status: 422 }
    );
  }

  let member = null;
  try {
    member =
      identifier.type === "phone"
        ? await findMemberByPhone(identifier.value)
        : await findMemberByEmail(identifier.value);
  } catch (error) {
    console.error("[login]", error);
    return NextResponse.json(
      { error: "Sign in is unavailable right now. Please try again shortly." },
      { status: 503 }
    );
  }

  const valid = verifyPassword(password, member?.passwordHash ?? DUMMY_HASH);

  /* One message for both "no such account" and "wrong password". Saying which
     one it was confirms whether a given number belongs to a member. */
  if (!member || !valid) {
    return NextResponse.json(
      { error: "Those details do not match an account." },
      { status: 401 }
    );
  }

  const store = await cookies();
  /* Cleared on success, so one evening of mistyping a password does not lock
     a coordinator out for the rest of the window. Only failures accumulate. */
  forget("login", caller);

  store.set(
    SESSION_COOKIE,
    createSession({ sub: member.id, name: member.name }),
    sessionCookieOptions
  );

  return NextResponse.json({ member: publicMember(member) });
}
