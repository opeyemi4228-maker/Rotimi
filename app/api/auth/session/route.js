import { NextResponse } from "next/server";

import { currentSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Who is signed in, for the chrome.
 *
 * The masthead is a client component inside the root layout, and the root
 * layout is shared by every page on the site. Reading the session there would
 * mean reading a cookie in the layout, which opts *every* marketing page out
 * of static rendering — the homepage, the newsroom and the gallery would each
 * go to the database before the first byte, to answer a question that changes
 * nothing about what they say.
 *
 * So the chrome asks separately, once, and caches the answer for the tab. The
 * pages stay static; the masthead still knows your name.
 *
 * This is display data only. Nothing here is a permission: /admin re-resolves
 * the seat from the database on every request, and hiding a menu item is not
 * an access control (§13.2).
 */
export async function GET() {
  let session = { member: null, scope: null };
  try {
    session = await currentSession();
  } catch (error) {
    /* A database that is down must not take the navigation bar with it. The
       signed-out chrome is the correct fallback: it offers Sign in and Join,
       which is exactly what an unauthenticated visitor needs anyway. */
    console.error("[session]", error);
  }

  const { member, scope } = session;

  return NextResponse.json(
    {
      member: member
        ? {
            id: member.id,
            name: member.name,
            firstName: member.name.split(" ")[0],
            membershipNo: member.membershipNo,
            photoUrl: member.photoUrl,
            verified: member.verification === "VERIFIED",
            office: scope ? { title: scope.roleTitle, label: scope.label } : null,
          }
        : null,
    },
    {
      /* Never cached, anywhere. A shared cache holding one member's name and
         handing it to the next visitor is the worst bug this file could have. */
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    }
  );
}
