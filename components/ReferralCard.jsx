"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A member's own referral code, and the two ways they will actually pass it on:
 * copied to a message, or shared straight into WhatsApp by the phone itself.
 *
 * The code is rendered large and letter-spaced because most of the time it is
 * not copied at all — it is read off a screen and repeated out loud at a ward
 * meeting. The link is what gets pasted; the code is what gets said.
 */
export default function ReferralCard({ code, className }) {
  const [copied, setCopied] = useState(null);

  if (!code) return null;

  const link = typeof window === "undefined" ? "" : `${window.location.origin}/join?ref=${code}`;

  async function copy(what, value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard permission refused, or an insecure origin. The code is on
      // screen either way, which is the fallback that always works.
      setCopied(null);
    }
  }

  async function share() {
    const text = `Join the Movement for Amaechi Presidency. Register with my referral code ${code}: ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join MAP", text, url: link });
        return;
      } catch {
        // Dismissed. Nothing to report — they closed a sheet they opened.
        return;
      }
    }
    copy("link", link);
  }

  return (
    <div className={cn("border-2 border-ink-950 bg-white p-6", className)}>
      <div className="flex items-center gap-2.5">
        <Share2 size={16} className="text-brand-600" aria-hidden="true" />
        <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
          Your referral code
        </p>
      </div>

      <p className="mt-4 font-display text-fluid-xl font-extrabold tracking-[0.2em] text-ink-950 tabular-nums">
        {code}
      </p>

      <p className="mt-3 text-[0.875rem] leading-relaxed text-content-muted">
        It is yours permanently. Everyone who registers with it is credited to
        you and appears in the list below, by name.
      </p>

      <div className="mt-6 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => copy("code", code)}
          className="flex items-center gap-2 border-2 border-ink-950 px-4 py-2.5 text-[0.6875rem] font-bold tracking-[0.08em] text-ink-950 uppercase transition-colors hover:bg-ink-950 hover:text-white"
        >
          {copied === "code" ? <Check size={14} strokeWidth={3} /> : <Copy size={14} strokeWidth={2.75} />}
          {copied === "code" ? "Copied" : "Copy code"}
        </button>
        <button
          type="button"
          onClick={share}
          className="flex items-center gap-2 border-2 border-ink-950 bg-ink-950 px-4 py-2.5 text-[0.6875rem] font-bold tracking-[0.08em] text-white uppercase transition-colors hover:bg-ember-600 hover:border-ember-600"
        >
          {copied === "link" ? <Check size={14} strokeWidth={3} /> : <Share2 size={14} strokeWidth={2.75} />}
          {copied === "link" ? "Link copied" : "Share your link"}
        </button>
      </div>

      {/* Announced rather than only shown, so the confirmation reaches somebody
          using a screen reader too. */}
      <p aria-live="polite" className="sr-only">
        {copied === "code" ? "Referral code copied." : copied === "link" ? "Referral link copied." : ""}
      </p>
    </div>
  );
}
