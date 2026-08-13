import { cn } from "@/lib/utils";

/* The console's own parts. Everything general enough to be shared already
   lives in app/admin/ui.jsx; these three exist only because this page is the
   only one that shows a whole-platform figure, and a figure about the platform
   reads differently from a figure about a territory. */

/**
 * A labelled proportion — "8 of 37 states, 21.6%" — as a bar with both numbers
 * on it.
 *
 * The percentage alone is the number people quote and the fraction is the
 * number that is actually true: 21.6% of states sounds like progress until you
 * read that it is eight of them. Both, always, side by side.
 */
export function Proportion({ label, live, all, sub }) {
  const share = all ? (live / all) * 100 : 0;
  const rounded = Math.round(share * 10) / 10;

  return (
    <div className="border border-ink-200 bg-white p-5">
      <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-2">
        <span className="font-display text-2xl font-extrabold tracking-tight tabular-nums text-ink-950">
          {live.toLocaleString()}
        </span>
        <span className="text-[0.875rem] text-content-subtle tabular-nums">
          of {all.toLocaleString()}
        </span>
        <span className="ml-auto text-[0.875rem] font-bold tabular-nums text-ink-950">
          {rounded}%
        </span>
      </p>
      <div className="mt-3 h-1.5 w-full bg-ink-200">
        <div
          className={cn(
            "h-full",
            share >= 70 ? "bg-brand-600" : share >= 30 ? "bg-ember-500" : "bg-red-600"
          )}
          style={{ width: `${Math.max(share, share > 0 ? 1.5 : 0)}%` }}
        />
      </div>
      {sub && <p className="mt-2 text-[0.8125rem] leading-snug text-content-subtle">{sub}</p>}
    </div>
  );
}

/**
 * Registrations per day as bare bars.
 *
 * The cumulative chart above it answers "how big is the movement"; this answers
 * "is the form still working this morning", which on any given day is the more
 * urgent of the two and is invisible on a running total.
 */
export function DailyBars({ data, caption }) {
  const peak = Math.max(1, ...data.map((point) => point.value));
  const total = data.reduce((sum, point) => sum + point.value, 0);

  return (
    <figure>
      <div className="flex h-24 items-end gap-px border-b-2 border-ink-950" role="img"
           aria-label={`${total.toLocaleString()} registrations over ${data.length} days, highest ${peak} in one day`}>
        {data.map((point) => (
          <div
            key={point.date}
            title={`${point.date}: ${point.value}`}
            className={cn(
              "min-w-px flex-1",
              point.value ? "bg-brand-600" : "bg-ink-100"
            )}
            /* A day with one registration must not round to nothing — 2% keeps
               it visible next to a day with two hundred. */
            style={{ height: `${point.value ? Math.max((point.value / peak) * 100, 4) : 2}%` }}
          />
        ))}
      </div>
      <figcaption className="mt-2 flex justify-between text-[0.75rem] text-content-subtle tabular-nums">
        <span>{data[0]?.date}</span>
        <span>{caption ?? `peak ${peak.toLocaleString()} in a day`}</span>
        <span>{data[data.length - 1]?.date}</span>
      </figcaption>
    </figure>
  );
}

/** A small two-column fact list. Used where a table would be four rows of one
    number each. */
export function Facts({ rows }) {
  return (
    <dl className="divide-y divide-ink-200 border border-ink-200 bg-white">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
          <dt className="text-[0.8125rem] text-content-muted">{row.label}</dt>
          <dd
            className={cn(
              "shrink-0 text-[0.875rem] font-bold tabular-nums",
              row.tone === "alert" && row.value ? "text-red-700" : "text-ink-950"
            )}
          >
            {typeof row.value === "number" ? row.value.toLocaleString() : row.value}
            {row.note && (
              <span className="ml-2 font-normal text-content-subtle">{row.note}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Section anchor. The console is long on purpose, so every block is
    addressable and the jump-list at the top actually goes somewhere. */
export function Anchor({ id, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      {children}
    </section>
  );
}
