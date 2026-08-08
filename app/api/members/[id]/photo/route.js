import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { memberScopeWhere } from "@/lib/permissions";
import { currentSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serve a member's photograph.
 *
 * ── WHY THIS IS NOT A PUBLIC URL ───────────────────────────────────────────
 * Member ids are sequential. A public /api/members/<id>/photo endpoint is a
 * script away from being the complete photographic register of a political
 * movement, downloadable by anyone who can count. §13 does not allow that, so
 * the same Descendant Rule that governs the member directory governs the
 * portraits in it:
 *
 *   - you may always see your own photograph;
 *   - an office holder may see the photograph of any member inside their
 *     territory, which is exactly the set they can already see in /admin;
 *   - everyone else gets a 404, not a 403, because "no such photo" and "not
 *     yours to see" must be indistinguishable from outside.
 * ───────────────────────────────────────────────────────────────────────────
 */
export async function GET(request, { params }) {
  const { id } = await params;
  if (!/^\d+$/.test(String(id))) return notFound();

  const memberId = BigInt(id);
  const { member, scope } = await currentSession();
  if (!member) return notFound();

  if (String(memberId) !== member.id && !(await withinScope(scope, memberId))) {
    return notFound();
  }

  const photo = await prisma.memberPhoto.findUnique({
    where: { memberId },
    select: { bytes: true, mimeType: true, version: true, byteSize: true },
  });
  if (!photo) return notFound();

  const etag = `"${photo.version}"`;

  /* A revisit costs 304 and no bytes. Worth doing properly: the member
     directory draws 25 of these at once, on connections where 25 avatars is
     a real download. */
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: cacheHeaders(request, etag) });
  }

  return new NextResponse(Buffer.from(photo.bytes), {
    headers: {
      ...cacheHeaders(request, etag),
      "Content-Type": photo.mimeType,
      "Content-Length": String(photo.byteSize),
      // The bytes are a re-encoded WebP from lib/photos.js, never the file the
      // member uploaded — but say so anyway, so nothing downstream sniffs.
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * `private`, always: this response is one person's face served under one
 * person's session, and it must never sit in a shared cache.
 *
 * A URL carrying the right `?v=` is immutable by construction — the token is
 * the content hash, so those exact bytes can never change. Without it we are
 * looking at a stale or hand-typed URL, and a minute is as long as it may be
 * trusted.
 */
function cacheHeaders(request, etag) {
  const asked = new URL(request.url).searchParams.get("v");
  const versioned = asked && `"${asked}"` === etag;

  return {
    ETag: etag,
    "Cache-Control": versioned
      ? "private, max-age=31536000, immutable"
      : "private, max-age=60, must-revalidate",
    Vary: "Cookie",
  };
}

async function withinScope(scope, memberId) {
  const where = memberScopeWhere(scope);
  if (!where) return false;
  const count = await prisma.member.count({ where: { AND: [where, { id: memberId }] } });
  return count > 0;
}

function notFound() {
  return new NextResponse(null, {
    status: 404,
    headers: { "Cache-Control": "private, no-store" },
  });
}
