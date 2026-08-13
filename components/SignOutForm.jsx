"use client";

import { clearViewerCache } from "@/lib/useViewer";

/**
 * Sign out, everywhere, the same way.
 *
 * ── THE BUG THIS FIXES ─────────────────────────────────────────────────────
 * There were four sign-out forms and only two of them cleared the cached
 * viewer. Signing out from the dashboard or the portal destroyed the session
 * cookie correctly — the server was never confused — but left the member's
 * name and face in sessionStorage, so the masthead on the next page still
 * greeted them and still hid "Join MAP". It looked like a half-completed sign
 * out, and to the person doing it that is indistinguishable from a broken one.
 *
 * One component now, used by all four, so a fifth cannot forget.
 * ───────────────────────────────────────────────────────────────────────────
 */
export default function SignOutForm({ className, children }) {
  return (
    <form
      action="/api/auth/logout"
      method="post"
      // Not in an effect on the next page: the cache has to be gone before the
      // navigation, or the masthead paints the old answer on the way out.
      onSubmit={clearViewerCache}
      className={className}
    >
      {children}
    </form>
  );
}
