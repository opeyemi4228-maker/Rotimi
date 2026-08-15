import { currentSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { audience, recipients } from "@/lib/broadcast";
import { callerKey, limitShared, tooMany } from "@/lib/ratelimit";

export const runtime = "nodejs";

/* One page of the disclosure. Two hundred is about as many phone numbers as a
   person will scroll through, and a Ward Coordinator's whole audience usually
   fits inside one or two of them. */
const PAGE = 200;
/* The CSV is the answer for anything bigger. Fifty thousand rows is a 2MB file
   Excel opens without complaint; past that the register belongs in the console
   export, which is nationwide and audited. */
const CSV_MAX = 50_000;

function field(value) {
  if (value == null) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * The phone numbers behind the count.
 *
 * ── WHY THIS IS A SEPARATE REQUEST ─────────────────────────────────────────
 * The composer shows a number — "412 members" — and the numbers themselves sit
 * behind a disclosure. Rendering them into the page would put four hundred
 * phone numbers into the HTML of a page a coordinator might have open on a
 * shared laptop at a ward meeting, for a list most of them will never open.
 * They are fetched when asked for, and not before.
 * ───────────────────────────────────────────────────────────────────────────
 */
export async function GET(request) {
  const { member, scope } = await currentSession();
  if (!member) return Response.json({ error: "Sign in." }, { status: 401 });
  if (!scope || !can(scope, "broadcast")) {
    return Response.json({ error: "Not permitted." }, { status: 403 });
  }

  /* A directory of every member's phone number in a territory is the most
     copyable thing this app holds, so it is metered even for somebody entitled
     to read it. */
  const quota = await limitShared("recipientList", `member:${member.id}`);
  if (!quota.ok) return tooMany(quota.retryAfter);

  const url = new URL(request.url);
  const verifiedOnly = url.searchParams.get("verifiedOnly") === "true";
  const csv = url.searchParams.get("format") === "csv";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);

  const filters = { verifiedOnly };

  if (csv) {
    const rows = await recipients(scope, filters, { take: CSV_MAX, skip: 0 });
    const header = ["name", "phone", "membership_no", "verification", "ward", "lga", "state"];
    const lines = [header.join(",")];
    for (const row of rows ?? []) {
      lines.push(
        [row.name, row.phone, row.membershipNo, row.verification, row.ward, row.lga, row.state]
          .map(field)
          .join(",")
      );
    }
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(`﻿${lines.join("\r\n")}\r\n`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="map-recipients-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const [rows, counts] = await Promise.all([
    recipients(scope, filters, { take: PAGE, skip: (page - 1) * PAGE }),
    audience(scope, filters),
  ]);

  return Response.json(
    {
      rows: rows ?? [],
      page,
      perPage: PAGE,
      total: counts?.total ?? 0,
      pages: Math.max(1, Math.ceil((counts?.total ?? 0) / PAGE)),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
