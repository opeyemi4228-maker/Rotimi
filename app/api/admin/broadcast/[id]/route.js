import { currentSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { progress } from "@/lib/broadcast";

export const runtime = "nodejs";

/**
 * How a send is getting on.
 *
 * Polled by the composer every couple of seconds while a broadcast is running.
 * Scoped through `memberScopeWhere` inside `progress()`, so a coordinator can
 * only watch a send made by somebody in their own territory — the id in the URL
 * is a lookup key, never an authorisation.
 */
export async function GET(_request, { params }) {
  const { member, scope } = await currentSession();
  if (!member) return Response.json({ error: "Sign in." }, { status: 401 });
  if (!scope || !can(scope, "broadcast")) {
    return Response.json({ error: "Not permitted." }, { status: 403 });
  }

  const { id } = await params;
  if (!/^\d+$/.test(id)) return Response.json({ error: "Not found." }, { status: 404 });

  const row = await progress(scope, id);
  if (!row) return Response.json({ error: "Not found." }, { status: 404 });

  return Response.json(row, { headers: { "Cache-Control": "no-store" } });
}
