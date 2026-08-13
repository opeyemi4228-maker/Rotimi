"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Loader2, CircleAlert } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useViewer } from "@/lib/useViewer";

export default function Login() {
  const { member } = useViewer();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!identifier.trim() || !password) {
      setError("Enter your phone number or email address, and your password.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Those details do not match an account.");
        return;
      }
      /* Go back to whatever sent them here — /admin bounces its guests to
         /login?next=/admin, and dumping a coordinator on the homepage after
         they have just signed in makes them navigate twice.

         Only same-site paths are honoured: an open redirect on a political
         movement's login page is a ready-made phishing tool.

         Read from `window` rather than useSearchParams(), which would force
         this page behind a Suspense boundary and out of static rendering for
         one string only needed at submit time. */
      const next = new URLSearchParams(window.location.search).get("next");
      /* Default to /portal, not "/". A member who has just signed in needs to
         see their own name and membership number to know it worked; the
         homepage tells them nothing. /portal is the member dashboard and
         every member has one — /admin is only for the few holding a seat, and
         sending everyone there would greet most of the movement with a
         refusal page straight after a successful sign-in. */
      const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/portal";

      /* A full navigation, not router.push(). Two reasons:

         1. router.push() followed by router.refresh() aborts the push — the
            page sat on /login after a successful sign-in, cookie and all.
         2. Signing in changes what every server component renders. A hard
            load throws away the client cache built while logged out instead
            of leaving the masthead showing "Sign in" to a signed-in member. */
      window.location.assign(safe);
      return;
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        breadcrumb="Sign in"
        kicker="Member access"
        title="Sign in"
        lead="Use the phone number or email address you registered with."
      />

      <section className="section bg-white">
        <div className="shell mx-auto max-w-md">
          {error && (
            <p
              role="alert"
              className="mb-8 flex items-start gap-3 border-l-4 border-red-600 bg-red-50 p-4 text-[0.875rem] leading-relaxed text-red-900"
            >
              <CircleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          <form onSubmit={submit} noValidate className="space-y-6">
            <div>
              <label
                htmlFor="identifier"
                className="block text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase"
              >
                Phone number or email
              </label>
              {/* One field for both credentials. Asking the reader to pick a tab
                  first is a decision they should not have to make. The server
                  works out which one they typed. */}
              <input
                id="identifier"
                name="identifier"
                autoComplete="username"
                autoFocus
                placeholder="0803 123 4567"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="mt-2.5 h-13 w-full border-2 border-ink-200 bg-white px-4 text-[0.9375rem] text-ink-950 transition-colors focus:border-brand-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase"
              >
                Password
              </label>
              <div className="relative mt-2.5">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={cn(
                    "h-13 w-full border-2 border-ink-200 bg-white pr-14 pl-4 text-[0.9375rem] text-ink-950",
                    "transition-colors focus:border-brand-600 focus:outline-none"
                  )}
                />
                <span className="absolute inset-y-0 right-1 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="grid size-11 place-items-center text-ink-400 transition-colors hover:text-ink-950"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" full disabled={busy}>
              {busy ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Signing in
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={17} strokeWidth={2.75} />
                </>
              )}
            </Button>
          </form>

          {/* A member who is already signed in can still reach this page — from
              a bookmark, or to switch accounts. The form stays, so switching
              still works, but they are not invited to join a movement they are
              already in. */}
          {member ? (
            <p className="mt-8 text-center text-[0.875rem] text-content-muted">
              Signed in as {member.name}.{" "}
              <Link
                href="/portal"
                className="font-bold text-brand-700 underline underline-offset-4 transition-colors hover:text-ember-600"
              >
                Go to your membership
              </Link>
            </p>
          ) : (
            <p className="mt-8 text-center text-[0.875rem] text-content-muted">
              Not a member yet?{" "}
              <Link
                href="/join"
                className="font-bold text-brand-700 underline underline-offset-4 transition-colors hover:text-ember-600"
              >
                Join MAP
              </Link>
            </p>
          )}
        </div>
      </section>
    </>
  );
}
