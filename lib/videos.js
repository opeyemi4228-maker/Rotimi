/**
 * The video library.
 *
 * ── HOW TO ADD ONE ─────────────────────────────────────────────────────────
 * Drop the file in `public/videos/`, a still frame in `public/videos/posters/`,
 * and add a line here:
 *
 *   {
 *     slug: "abuja-rally",
 *     title: "Amaechi at the Abuja mobilisation rally",
 *     src: "/videos/abuja-rally.mp4",
 *     poster: "/videos/posters/abuja-rally.jpg",
 *     date: "2026-02-10",
 *     category: "Rally",
 *     duration: "12:04",
 *   }
 *
 * Only `slug`, `title` and `src` are required. A missing poster shows the mark
 * on a dark field, which is tidier than a browser's own black rectangle.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * ── ON THE EMPTY SLOTS ─────────────────────────────────────────────────────
 * `SLOTS` is how many placeholder tiles the grid draws when there is nothing to
 * show yet. They exist so the page has its real shape before the footage does —
 * and so whoever is uploading can see exactly how many they are filling and
 * what each one will look like.
 *
 * Delete nothing when the videos arrive: a slot is only drawn where there is no
 * video to draw instead, so the placeholders disappear on their own, one at a
 * time, as the library fills up.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * MP4/H.264 is the one format every Nigerian phone plays without a codec
 * argument. Keep files under about 40MB — most of this audience is on mobile
 * data, and `preload="none"` means nothing downloads until somebody presses
 * play, but the first press still has to finish on their connection.
 */

export const videos = [
  // Add entries here. See the example in the comment above.
];

/** How many placeholder tiles to draw where there is no video yet. */
export const SLOTS = 6;

/** Categories actually present, in the order they first appear. */
export const videoCategories = [...new Set(videos.map((video) => video.category))].filter(Boolean);

/** Newest first. Entries without a date sort last, rather than to the top. */
export const videosByDate = [...videos].sort((a, b) =>
  (b.date ?? "").localeCompare(a.date ?? "")
);

/** The one to lead the page with, if the library names one. */
export const featuredVideo =
  videosByDate.find((video) => video.featured) ?? videosByDate[0] ?? null;

/**
 * The grid the page renders: every video, then empty slots to make the count
 * up. Returns `{ video }` or `{ slot: n }`, so the component never has to work
 * out which it is looking at.
 */
export function videoGrid(count = SLOTS) {
  const filled = videosByDate.map((video) => ({ video }));
  const empty = Array.from({ length: Math.max(0, count - filled.length) }, (_, index) => ({
    slot: filled.length + index + 1,
  }));
  return [...filled, ...empty];
}
