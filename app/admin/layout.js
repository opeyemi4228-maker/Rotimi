import Link from "next/link";
import { redirect } from "next/navigation";

import Avatar from "@/components/ui/Avatar";
import { currentSession } from "@/lib/session";
import { mfaRequired, mfaState } from "@/lib/mfa";
import { can } from "@/lib/permissions";
import AdminNav from "./AdminNav";
import Sidebar from "./Sidebar";

export const metadata = {
  title: "Secretariat — MAP",
  robots: { index: false, follow: false },
};

/* The admin area reads live figures on every request; caching it would show a
   coordinator yesterday's coverage and today's date. */
export const dynamic = "force-dynamic";

/**
 * The guard for the entire admin area, and its frame.
 *
 * Two separate refusals, deliberately distinguished:
 *   - not signed in            -> /login
 *   - signed in, but no seat   -> a plain explanation, not a 404
 *
 * A member with no office is not doing anything wrong by arriving here; they
 * are just an ordinary member, and telling them so is better than pretending
 * the page does not exist.
 *
 * ── ON THE SHAPE ───────────────────────────────────────────────────────────
 * A fixed rail on the left, one scrolling column of work in the middle. The
 * rail keeps the two facts that decide whether an action is legitimate — which
 * office you hold and which territory it governs — in view for the whole
 * session, rather than in a banner the reader scrolled past an hour ago.
 *
 * Below `lg` the rail becomes a scrolling row above the content: the same five
 * destinations in the same order, because a coordinator who learns them on a
 * laptop should find them unchanged on a phone at a ward meeting.
 * ───────────────────────────────────────────────────────────────────────────
 */
export default async function AdminLayout({ children }) {
  const { member, scope } = await currentSession();

  if (!member) redirect("/login?next=/admin");

  if (!scope) {
    return (
      <section className="shell py-24">
        <div className="mx-auto max-w-lg border-2 border-ink-950 p-8">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-950">
            You do not hold an office
          </h1>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-content-muted">
            The secretariat dashboard is for members holding a seat in the
            movement&rsquo;s structure. Your membership is active
            {member.membershipNo ? ` as ${member.membershipNo}` : ""}, and you sit
            in the register for {member.ward} Ward. Seats are filled by
            appointment from the authority above them, so this page opens by
            itself if you are appointed to one.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/portal"
              className="border-2 border-ink-950 bg-ink-950 px-5 py-3 text-[0.8125rem] font-bold tracking-[0.08em] text-white uppercase"
            >
              Your membership
            </Link>
            <Link
              href="/structure"
              className="border-2 border-ink-950 px-5 py-3 text-[0.8125rem] font-bold tracking-[0.08em] text-ink-950 uppercase"
            >
              See the structure
            </Link>
          </div>
        </div>
      </section>
    );
  }

  /* Decided here, from the seat, on every request — the rail renders what this
     says and never works it out for itself. The polling unit tracker is only
     a working list at the two tiers that can walk it: 176,623 rows is not a
     tool a National Coordinator has been given. */
  /* §13.2: state level and above must have a second factor.

     A redirect, not a panel. Returning a different tree from a layout does NOT
     stop the page underneath rendering — React executes it and Next serialises
     it into the flight payload, so the wall appears on screen with the entire
     unscoped console sitting in the HTML behind it. `redirect()` throws, the
     render aborts, and the response is a 307 with no body: nothing to leak.

     The target is outside /admin for the obvious reason that anything inside it
     would redirect to itself for ever. */
  if (mfaRequired(scope)) {
    const mfa = await mfaState(member.userId);
    if (!mfa.enabled) redirect("/secure");
  }

  const local = scope.scopeType === "LGA" || scope.scopeType === "WARD";
  const regional = !local; // NATION, ZONE and STATE have LGA coordinators beneath them
  /* The console reads the whole platform, so only a scope entitled to the whole
     platform is told it exists. The page checks this again for itself — this
     boolean decides what is drawn, never what is permitted. */
  const nationwide = Boolean(scope.isSuperAdmin || scope.readsNationwide);
  /* §6.11's broadcast capability, resolved here so the rail and the page agree
     about who may text a territory. The page checks it again for itself. */
  const broadcaster = can(scope, "broadcast");
  /* Only the booth holds the form. Everybody above it reads the results and
     enters none of them — see the note on ITEMS in AdminNav. */
  const agent = scope.scopeType === "POLLING_UNIT";

  return (
    <div className="min-h-screen bg-ink-50 lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r-2 border-ink-950 bg-white lg:block">
        <Sidebar
          local={local}
          regional={regional}
          nationwide={nationwide}
          broadcaster={broadcaster}
          agent={agent}
          tierLabel={scope.tierLabel}
          unitName={scope.unitName}
          roleTitle={scope.roleTitle}
          isSuperAdmin={scope.isSuperAdmin}
        />
      </aside>

      <div className="min-w-0 flex-1">
        {/* Phone header: the mark, who is acting, and the same navigation. */}
        <header className="lg:hidden">
          <div className="flex items-center gap-4 border-b border-ink-200 bg-white px-4 py-4">
            <div className="min-w-0">
              <p className="text-[0.5625rem] font-bold tracking-[0.18em] text-ink-500 uppercase">
                {scope.tierLabel}
              </p>
              <p className="truncate font-display text-[0.9375rem] font-extrabold text-ink-950">
                {scope.unitName}
              </p>
              <p className="truncate text-[0.75rem] text-content-muted">{scope.roleTitle}</p>
            </div>
            <Link href="/portal" className="ml-auto shrink-0">
              <Avatar name={member.name} src={member.photoUrl} size="sm" />
            </Link>
          </div>
          <AdminNav
            local={local}
            regional={regional}
            nationwide={nationwide}
            broadcaster={broadcaster}
            agent={agent}
          />
        </header>

        <main className="mx-auto w-full max-w-[100rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
