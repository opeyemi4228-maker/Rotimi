"use client";

import { Printer } from "lucide-react";

/**
 * The one interactive control on the card page, isolated so the page itself
 * stays a server component and the card renders — and prints — with JavaScript
 * off, which is the state a shared library computer is often in.
 */
export default function PrintCard() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-2 border-2 border-ink-950 px-5 py-3 text-[0.6875rem] font-bold tracking-[0.08em] text-ink-950 uppercase transition-colors hover:bg-ink-950 hover:text-white"
    >
      <Printer size={15} strokeWidth={2.5} aria-hidden="true" />
      Print
    </button>
  );
}
