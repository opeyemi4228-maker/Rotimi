"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Film, Play } from "lucide-react";

import { assets } from "@/assets/assets";
import { cn } from "@/lib/utils";

/**
 * A video, as a still until somebody asks for it.
 *
 * ── WHY NOTHING LOADS UNTIL PLAY ───────────────────────────────────────────
 * `preload="none"` and no <video> element at all until the first click. A grid
 * of nine videos that each begin buffering on page load is nine simultaneous
 * downloads on a connection that is usually mobile data — the page would take
 * minutes to settle and cost the viewer real money before they had watched
 * anything.
 *
 * So the card is a poster and a play button, and the player is created on
 * click, by which point the viewer has actually asked for it.
 * ───────────────────────────────────────────────────────────────────────────
 */
export default function VideoCard({ video, priority = false, className }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef(null);

  return (
    <article className={cn("group", className)}>
      <div className="relative aspect-video w-full overflow-hidden bg-ink-950">
        {playing ? (
           
          <video
            ref={ref}
            src={video.src}
            poster={video.poster}
            controls
            autoPlay
            playsInline
            preload="none"
            className="absolute inset-0 size-full bg-ink-950"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="absolute inset-0 size-full cursor-pointer"
            aria-label={`Play: ${video.title}`}
          >
            {video.poster ? (
              <Image
                src={video.poster}
                alt=""
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                priority={priority}
                className="object-cover transition-transform duration-500 ease-out-quart group-hover:scale-[1.03]"
              />
            ) : (
              /* No still supplied. The mark on a dark field beats a browser's
                 own black rectangle, and it is obviously deliberate. */
              <span className="absolute inset-0 grid place-items-center bg-ink-900">
                <Image
                  src={assets.mapMark}
                  alt=""
                  sizes="96px"
                  className="h-14 w-auto object-contain opacity-25"
                />
              </span>
            )}

            <span className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-ink-950/10 to-transparent" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid size-16 place-items-center bg-white/95 transition-colors duration-300 group-hover:bg-ember-500">
                <Play
                  size={24}
                  strokeWidth={2.5}
                  className="ml-1 text-ink-950 transition-colors duration-300 group-hover:text-white"
                  aria-hidden="true"
                />
              </span>
            </span>

            {video.duration && (
              <span className="absolute right-3 bottom-3 bg-ink-950/90 px-2 py-1 text-[0.6875rem] font-bold text-white tabular-nums">
                {video.duration}
              </span>
            )}
          </button>
        )}
      </div>

      <div className="pt-4">
        {video.category && (
          <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ember-600 uppercase">
            {video.category}
          </p>
        )}
        <h3 className="mt-2 font-display text-lg leading-tight font-extrabold tracking-tight text-ink-950">
          {video.title}
        </h3>
        {video.description && (
          <p className="mt-2 text-[0.875rem] leading-snug text-content-muted">{video.description}</p>
        )}
        {video.date && (
          <p className="mt-3 text-[0.75rem] text-content-subtle tabular-nums">
            {new Intl.DateTimeFormat("en-NG", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "Africa/Lagos",
            }).format(new Date(video.date))}
          </p>
        )}
      </div>
    </article>
  );
}

/**
 * An empty slot, where a video will go.
 *
 * Drawn to the same proportions as a real card so the page has its finished
 * shape before the footage exists, and so whoever is uploading can see how many
 * they are filling. Each disappears on its own as the library fills up.
 */
export function VideoSlot({ index, className }) {
  return (
    <div className={cn("group", className)}>
      <div className="relative flex aspect-video w-full items-center justify-center border-2 border-dashed border-ink-300 bg-ink-50">
        <div className="text-center">
          <Film size={26} className="mx-auto text-ink-300" aria-hidden="true" />
          <p className="mt-2.5 font-display text-[0.8125rem] font-extrabold tracking-tight text-ink-400">
            Video {String(index).padStart(2, "0")}
          </p>
        </div>
      </div>
      <div className="pt-4">
        <p className="h-2.5 w-20 bg-ink-100" />
        <p className="mt-3 h-3.5 w-4/5 bg-ink-100" />
        <p className="mt-2 h-3.5 w-2/3 bg-ink-100" />
      </div>
    </div>
  );
}
