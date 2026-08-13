import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The two levels below the local government, drawn as tiles rather than as a map.
 *
 * ── WHY THERE IS NO WARD MAP ───────────────────────────────────────────────
 * There is no open boundary dataset for Nigerian wards. geoBoundaries publishes
 * ADM1 and ADM2 for Nigeria — states and local governments — and stops there.
 * INEC's 8,809 ward delimitations and 176,623 polling units exist as codes and
 * names, not as polygons, and nobody has released the shapes.
 *
 * The options were to invent boundaries, to fall back to a bare table, or to
 * drop the geography and keep the grammar. Inventing them is out: a map is read
 * as a claim about where things are, and a wrong one on election night is worse
 * than none. A table loses the thing the map was for — the whole area at a
 * glance, with the leader legible in one sweep.
 *
 * So: one tile per unit, filled with the leading party's colour, in the same
 * order every time. It is a cartogram with the cartography removed. It answers
 * "who is leading across this LGA" in one look, the way the map above it does,
 * and it does not pretend to say where anything is.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * ── COLOUR IS NEVER THE ONLY ENCODING ──────────────────────────────────────
 * The same rule as the map. PDP red against APC green is the pair the commonest
 * colour blindness cannot separate, so every reporting tile carries the party
 * code in type, the name and the figures are on the tile in words and numbers,
 * and the table beneath is the same data with no colour in it at all.
 *
 * And silence is not zero: a unit nobody has reported from is flat grey with no
 * party on it, never a party's colour and never a low number.
 * ───────────────────────────────────────────────────────────────────────────
 */
export default function UnitGrid({ rows, className, emptyLabel = "No returns yet" }) {
  if (rows.length === 0) {
    return (
      <p className={cn("border border-ink-200 bg-white p-8 text-center text-[0.875rem] text-content-subtle", className)}>
        Nothing to show here yet.
      </p>
    );
  }

  return (
    <ul
      className={cn(
        "grid gap-px bg-ink-200 [grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr))]",
        className
      )}
    >
      {rows.map((row) => {
        const leader = row.leader;
        const tile = (
          <>
            <span
              aria-hidden="true"
              className="block h-1.5 w-full"
              style={{ background: leader ? leader.colour : "#E7E5E1" }}
            />
            <span className="flex min-h-24 flex-col p-3">
              <span className="line-clamp-2 text-[0.8125rem] leading-snug font-bold text-ink-950">
                {row.name}
              </span>

              {leader ? (
                <>
                  <span className="mt-auto flex items-baseline gap-1.5 pt-2">
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 translate-y-px"
                      style={{ background: leader.colour }}
                    />
                    <span className="font-display text-[0.9375rem] font-extrabold text-ink-950">
                      {leader.code}
                    </span>
                    <span className="text-[0.75rem] font-bold text-content-muted tabular-nums">
                      {row.leaderShare}%
                    </span>
                  </span>
                  <span className="mt-0.5 text-[0.6875rem] text-content-subtle tabular-nums">
                    {row.total.toLocaleString()} votes
                    {row.unitsReported != null && row.boothCount != null
                      ? ` · ${row.unitsReported}/${row.boothCount} in`
                      : ""}
                  </span>
                </>
              ) : (
                <span className="mt-auto pt-2 text-[0.75rem] text-ink-400">{emptyLabel}</span>
              )}
            </span>
          </>
        );

        return (
          <li key={row.id} className="bg-white">
            {row.href ? (
              <Link
                href={row.href}
                className="group block h-full transition-colors hover:bg-ink-50 focus-visible:bg-ink-50"
              >
                {tile}
              </Link>
            ) : (
              <div className="h-full">{tile}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
