import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import { currentSession } from "@/lib/session";
import { mfaRequired, mfaState } from "@/lib/mfa";
import MfaPanel from "@/app/admin/security/MfaPanel";

export const metadata = { title: "Secure your account — MAP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * The two-factor gate, deliberately OUTSIDE /admin.
 *
 * ── WHY IT IS NOT A PANEL INSIDE THE ADMIN LAYOUT ──────────────────────────
 * It was, and that was a hole. A layout that returns a different tree instead
 * of `{children}` does not stop the page underneath from rendering — React
 * still executes it and Next still serialises it into the flight payload. The
 * wall appeared on screen and the entire unscoped console was sitting in the
 * HTML behind it, readable with View Source.
 *
 * That is the exact failure §13.2 names: hiding a button is not a permission.
 *
 * The fix is a redirect, which throws and aborts the render, so the response is
 * a 307 with no body at all — nothing to leak. A redirect needs somewhere to go
 * that is not itself behind the gate, which is why this page lives at /secure
 * and not at /admin/security. The two share one component; only the frame
 * differs.
 * ───────────────────────────────────────────────────────────────────────────
 */
export default async function SecureAccount() {
  const { member, scope } = await currentSession();

  if (!member) redirect("/login?next=/secure");
  /* No seat, or a seat that does not require it: there is nothing to gate, so
     this page has no reason to exist for them. Voluntary enrolment lives at
     /admin/security for those with a seat, and in the portal for everyone. */
  if (!scope || !mfaRequired(scope)) redirect(scope ? "/admin" : "/portal");

  const state = await mfaState(member.userId);
  if (state.enabled) redirect("/admin");

  return (
    <section className="bg-ink-50 py-16">
      <div className="shell">
        <div className="mx-auto max-w-3xl">
          <p className="flex items-center gap-2.5">
            <span aria-hidden="true" className="grid size-8 place-items-center bg-ember-500 text-white">
              <ShieldAlert size={16} strokeWidth={2.75} />
            </span>
            <span className="text-[0.6875rem] font-bold tracking-[0.16em] text-ink-950 uppercase">
              One step before the secretariat opens
            </span>
          </p>

          <h1 className="mt-5 font-display text-fluid-2xl font-extrabold tracking-[-0.03em] text-ink-950">
            Set up two-factor authentication
          </h1>

          <p className="prose-body mt-4 max-w-prose text-[0.9375rem]">
            You hold {scope.roleTitle} for {scope.label}. A stolen password for a seat at
            this level is not an account takeover, it is a territory takeover — the whole
            register with every phone number in it, the exports, and the ability to text
            all of them. §13.2 requires a second factor before the secretariat opens.
          </p>

          <div className="mt-8">
            <MfaPanel initial={state} required />
          </div>

          <p className="mt-8 border-t border-ink-200 pt-6 text-[0.875rem] text-content-muted">
            Your membership is unaffected —{" "}
            <Link href="/portal" className="font-bold text-brand-700 underline underline-offset-4">
              your portal
            </Link>{" "}
            and the public site are open as normal.
          </p>
        </div>
      </div>
    </section>
  );
}
