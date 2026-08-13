import { Film } from "lucide-react";

import PageHeader from "@/components/ui/PageHeader";
import Reveal from "@/components/ui/Reveal";
import VideoCard, { VideoSlot } from "@/components/VideoCard";
import { SLOTS, videoCategories, videoGrid, videos } from "@/lib/videos";

export const metadata = {
  title: "Videos",
  description:
    "Speeches, rallies and field footage from the Movement for Amaechi Presidency.",
};

/**
 * The video library.
 *
 * The grid draws every video there is and then empty slots to make the count
 * up, so the page has its real shape before the footage does. The placeholders
 * are not a loading state and are not pretending to be one — they are labelled
 * slots, and each disappears the moment a video takes its place.
 */
export default function Videos() {
  const grid = videoGrid(SLOTS);
  const empty = videos.length === 0;

  return (
    <>
      <PageHeader
        breadcrumb="Videos"
        kicker="Watch"
        title="Amaechi, on the record"
        lead="Speeches, rallies and footage from the field. What he has said, in his own words, rather than a paraphrase of it."
      />

      <section className="section bg-white">
        <div className="shell">
          {videoCategories.length > 1 && (
            <div className="mb-12 flex flex-wrap gap-2">
              {videoCategories.map((category) => (
                <span
                  key={category}
                  className="border-2 border-ink-200 px-4 py-2 text-[0.75rem] font-bold tracking-[0.06em] text-ink-600 uppercase"
                >
                  {category}
                </span>
              ))}
            </div>
          )}

          <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map((entry, index) => (
              <Reveal
                as="li"
                key={entry.video?.slug ?? `slot-${entry.slot}`}
                delay={index * 60}
              >
                {entry.video ? (
                  <VideoCard video={entry.video} priority={index < 3} />
                ) : (
                  <VideoSlot index={entry.slot} />
                )}
              </Reveal>
            ))}
          </ul>

          {empty && (
            <div className="mt-14 border-2 border-ink-950 bg-white p-6">
              <div className="flex items-start gap-4">
                <Film size={20} className="mt-0.5 shrink-0 text-ember-600" aria-hidden="true" />
                <div>
                  <p className="font-display text-lg font-extrabold tracking-tight text-ink-950">
                    The slots above are waiting for footage
                  </p>
                  <p className="mt-2 max-w-prose text-[0.9375rem] leading-relaxed text-content-muted">
                    Drop the files in <code className="font-bold">public/videos/</code>, a still
                    frame each in <code className="font-bold">public/videos/posters/</code>, and add
                    a line per video to <code className="font-bold">lib/videos.js</code>. Each slot
                    fills in as its video arrives — nothing here needs deleting.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
