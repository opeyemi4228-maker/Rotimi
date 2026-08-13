import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/session";
import { seatScopeWhere } from "@/lib/permissions";

export const runtime = "nodejs";

/**
 * The photograph of the result sheet behind one return.
 *
 * ── WHY THIS ROUTE HAS TO EXIST ────────────────────────────────────────────
 * The whole integrity claim of the returns pipeline is "there is a photograph
 * of the EC8A behind every number". A photograph nobody can open is not
 * evidence; it is a row in a table. This is what makes the claim checkable.
 *
 * ── AND WHY IT IS NOT PUBLIC ───────────────────────────────────────────────
 * An EC8A photographed at a booth can carry an agent's handwriting, a
 * bystander, and the exact building somebody was standing in at a known hour.
 * So it is readable by coordinators whose scope contains the polling unit, and
 * by the agent who filed it — nobody else. The scope filter is applied in the
 * same query as the id, so a sheet outside the reader's territory and a sheet
 * that does not exist come back identically.
 * ───────────────────────────────────────────────────────────────────────────
 */
export async function GET(request, { params }) {
  const { id } = await params;
  const { member, scope } = await currentSession();
  if (!member) return new Response("Sign in.", { status: 401 });

  let resultId;
  try {
    resultId = BigInt(id);
  } catch {
    return new Response("Not found.", { status: 404 });
  }

  const seatWhere = seatScopeWhere(scope);

  /* Either the reader is the agent who filed it, or their seat's scope covers
     the polling unit it came from. A member with no seat gets only their own. */
  const visible = seatWhere
    ? {
        OR: [
          { submittedById: BigInt(member.id) },
          { pollingUnit: { seats: { some: seatWhere } } },
        ],
      }
    : { submittedById: BigInt(member.id) };

  const row = await prisma.pollingUnitResult.findFirst({
    where: { AND: [{ id: resultId }, visible] },
    select: { sheet: { select: { bytes: true, mimeType: true, version: true } } },
  });

  if (!row?.sheet) return new Response("Not found.", { status: 404 });

  /* The content hash is the ETag. The bytes never change once filed — an
     amendment writes a new hash — so this can be cached hard and still be
     correct the instant a sheet is replaced. Private, because it is evidence
     about a named person at a named place. */
  const etag = `"${row.sheet.version}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return new Response(Buffer.from(row.sheet.bytes), {
    headers: {
      "Content-Type": row.sheet.mimeType,
      "Cache-Control": "private, max-age=31536000, immutable",
      ETag: etag,
    },
  });
}
