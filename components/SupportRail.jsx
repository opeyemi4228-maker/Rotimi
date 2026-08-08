"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { supportCta } from "@/lib/site";

/**
 * Persistent support CTA.
 *
 * Red, not ember: the red is sampled from the logo's own "AP" letterforms
 * (#FF0000 = oklch(62.8% 0.258 29.2)). The surface uses red-600 rather than
 * that literal value, because pure #FF0000 carries only 4.0:1 against white and
 * 4.2:1 against ink-950, both under AA for the label. red-600 is the same hue
 * at 5.4:1, so the tab reads as the mark's red and the word stays legible.
 *
 * This used to be rendered from inside a homepage content section, which meant
 * a `position: fixed` element only existed on one page and shipped with the
 * section's own markup. It lives in the layout now, so it is genuinely global.
 *
 * Behaviour: stays out of the way until the hero is behind you, and retracts
 * near the footer so it never covers the footer's own calls to action.
 */
export default function SupportRail() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const viewport = window.innerHeight;
      const pastHero = y > viewport * 0.6;
      // Hide over roughly the last screen of the page (the footer zone).
      const nearFooter = y + viewport > docHeight - viewport * 0.75;
      setVisible(pastHero && !nearFooter);
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <>
      {/* Desktop: a vertical tab on the right edge. */}
      <Link
        href={supportCta.href}
        className={cn(
          /* Stacked, not side by side: the heart used to sit in the same flex
             row as the vertical label, so it was pinned against the type with
             nothing but a 10px gap. Above it, in a taller tab, it reads as a
             mark rather than as clutter. */
          "no-print fixed top-1/2 right-0 z-40 hidden -translate-y-1/2 flex-col items-center gap-4 bg-red-600 px-3.5 py-8 text-white shadow-e4 md:flex",
          "transition-[transform,opacity,background-color,padding] duration-500 ease-out-quart",
          "hover:bg-red-700 hover:px-4",
          visible
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-full opacity-0"
        )}
      >
        <Heart size={18} strokeWidth={2.75} className="shrink-0" />
        <span
          className="font-display text-xs font-extrabold tracking-[0.24em] uppercase"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          {supportCta.label}
        </span>
      </Link>

      {/* Mobile: a bottom action bar, clear of the home indicator. */}
      <div
        className={cn(
          "no-print fixed inset-x-0 bottom-0 z-40 md:hidden",
          "transition-[transform,opacity] duration-500 ease-out-quart",
          visible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-full opacity-0"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <Link
          href={supportCta.href}
          className="flex items-center justify-center gap-2.5 bg-red-600 px-5 py-4 font-display text-sm font-extrabold tracking-[0.16em] text-white uppercase shadow-e4"
        >
          <Heart size={17} strokeWidth={2.75} />
          Support the Campaign
          <ArrowRight size={17} strokeWidth={2.75} />
        </Link>
      </div>
    </>
  );
}
