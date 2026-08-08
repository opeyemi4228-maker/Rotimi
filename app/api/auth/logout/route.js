import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request) {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });

  /* 303, so the browser follows with a GET rather than re-POSTing. The portal
     signs out through a plain <form>, which works without JavaScript per §5.4;
     returning JSON would leave the member staring at {"ok":true}. */
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
