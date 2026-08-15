import { redirect } from "next/navigation";

import { currentSession } from "./session";
import { mfaRequired, mfaState } from "./mfa";

/**
 * The gate every secretariat page must call as its first statement.
 *
 * ── WHY THIS IS NOT IN THE LAYOUT ──────────────────────────────────────────
 * It was, and it did not work. A layout that redirects — or returns a
 * different tree — does NOT stop the page underneath from rendering. Next
 * renders the segments in parallel and serialises the page into the response
 * body regardless, so the redirect went out as a 307 with 292KB of unscoped
 * console data attached to it. Verified against a production build, not just
 * dev: `curl` on the redirect returned every figure the page had just queried.
 *
 * A guard that only decorates the screen is the exact thing §13.2 calls out:
 * hiding a button is not a permission. The check has to be inside the render
 * that does the reading, because throwing there is the only thing that stops
 * the reading.
 *
 * ── SO EVERY PAGE CALLS IT, AND THAT IS THE POINT ──────────────────────────
 * One import and one line at the top of each page, before any query. It is
 * repetitive on purpose: the repetition is visible, and a page missing the line
 * is obvious in review, whereas a page relying on a parent to protect it looks
 * exactly like a page that is protected.
 *
 * The layout keeps its own copy of the check. That one is now only cosmetic —
 * it saves a redirect hop for a request that would be refused anyway — and it
 * must never be the only one.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Server only.
 */
export async function requireSecretariat() {
  const session = await currentSession();

  if (!session.member) redirect("/login?next=/admin");

  /* No seat is not an error and not a redirect: the layout explains it, and a
     member who wandered in has done nothing wrong. Pages get a null scope and
     never render their content, because every one of them needs a scope to
     build a query in the first place. */
  if (!session.scope) return session;

  if (mfaRequired(session.scope)) {
    const mfa = await mfaState(session.member.userId);
    if (!mfa.enabled) redirect("/secure");
  }

  return session;
}
