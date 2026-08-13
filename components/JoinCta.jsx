"use client";

import { ArrowRight } from "lucide-react";

import Button from "@/components/ui/Button";
import { useViewer } from "@/lib/useViewer";

/**
 * "Join MAP" — unless you already have.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * The masthead swapped its call to action for a signed-in member, but a dozen
 * others across the site did not: a member who registered that morning was
 * still being asked to register on the homepage, the about page, the structure
 * page and every activity listing. Asking somebody to do a thing they have
 * already done is the site failing to recognise them, and doing it on nine
 * pages reads as the site not knowing who is logged in at all.
 *
 * The slot is not hidden. An empty space where a call to action was is a page
 * with a hole in it, so the button becomes the thing that IS useful to a member
 * standing there: their own membership. Every one of these is a button that was
 * going to send them somewhere; this only changes where.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * The viewer comes from the shared sessionStorage cache in lib/useViewer, so
 * a page with four of these still makes one request.
 */
export default function JoinCta({
  label = "Join MAP",
  signedInLabel = "Your membership",
  variant = "primary",
  size = "lg",
  className,
  full = false,
  arrow = true,
  arrowSize,
  arrowClassName,
}) {
  const { status, member } = useViewer();

  /* While the answer is in flight, hold the space rather than guess. A button
     that says "Join MAP" for a beat and then changes its mind is worse than one
     that arrives a moment late — and the reserved block keeps the row from
     jumping when it does. */
  if (status === "loading") {
    return (
      <span
        aria-hidden="true"
        className={`inline-block animate-pulse bg-current/10 ${size === "md" ? "h-11 w-40" : "h-13 w-44"} ${full ? "w-full" : ""} ${className ?? ""}`}
      />
    );
  }

  const signedIn = Boolean(member);
  const px = arrowSize ?? (size === "md" ? 16 : 17);

  return (
    <Button
      href={signedIn ? "/portal" : "/join"}
      variant={variant}
      size={size}
      full={full}
      className={className}
    >
      {signedIn ? signedInLabel : label}
      {arrow ? (
        <ArrowRight size={px} strokeWidth={2.75} className={arrowClassName} aria-hidden="true" />
      ) : null}
    </Button>
  );
}

/**
 * The same decision, for the homepage's "Two ways in" card — which is a whole
 * panel rather than a button, so it needs an href and words, not a component.
 */
export function useJoinTarget() {
  const { status, member } = useViewer();
  if (status === "loading" || !member) {
    return {
      href: "/join",
      title: "Register as a member",
      body: "Under two minutes. Your ward, your state, your membership number.",
    };
  }
  return {
    href: "/portal",
    title: "Your membership",
    body: "Your number, your ward, your card, and everyone you have brought in.",
  };
}
