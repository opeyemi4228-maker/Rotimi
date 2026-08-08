import { Download, FileCode2 } from "lucide-react";

import PrintCard from "./PrintCard";

/**
 * The membership card, on screen, with the two ways to take it away.
 *
 * The card itself is the exact SVG string the download route rasterises — it
 * is injected rather than re-implemented in JSX, so what is on screen and what
 * lands in the member's downloads folder cannot drift apart. See lib/idcard.js.
 *
 * `dangerouslySetInnerHTML` is doing what it says, and it is safe here for a
 * specific reason: the string is built by our own renderer from database
 * columns that it XML-escapes on the way in. No part of it is user-supplied
 * markup. If that ever stops being true, this is the line that stops being
 * safe.
 */
export default function MembershipCard({ svg, filename }) {
  return (
    <div className="mx-auto max-w-2xl">
      {/* The SVG carries width="856" height="540" because the rasteriser needs
          a real size to work from. In a browser that is an intrinsic size, not
          a maximum, so the card rendered at 856px wide and the container simply
          clipped it — half a card. These two child rules scale the injected
          <svg> to the column instead, and the viewBox keeps the proportions. */}
      <div
        // A drop shadow only here, not in the SVG: the card is a flat printed
        // object, and the shadow belongs to the screen previewing it.
        className="border border-ink-200 shadow-e3 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full print:border-0 print:shadow-none"
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      <div className="no-print mt-7 flex flex-wrap items-center justify-center gap-3">
        <a
          href="/api/member/id-card"
          download={filename}
          className="flex items-center gap-2 border-2 border-ink-950 bg-ink-950 px-5 py-3 text-[0.6875rem] font-bold tracking-[0.08em] text-white uppercase transition-colors hover:border-ember-600 hover:bg-ember-600"
        >
          <Download size={15} strokeWidth={2.5} aria-hidden="true" />
          Download card (PNG)
        </a>

        <PrintCard />

        {/* Vector, for anyone printing a batch of these properly. */}
        <a
          href="/api/member/id-card?format=svg"
          download={filename?.replace(/\.png$/, ".svg")}
          className="flex items-center gap-2 border-2 border-ink-200 px-5 py-3 text-[0.6875rem] font-bold tracking-[0.08em] text-ink-500 uppercase transition-colors hover:border-ink-950 hover:text-ink-950"
        >
          <FileCode2 size={15} strokeWidth={2.5} aria-hidden="true" />
          SVG
        </a>
      </div>
    </div>
  );
}
