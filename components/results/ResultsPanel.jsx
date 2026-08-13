import Link from "next/link";
import { ArrowRight, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The numbers beside the map: who is leading, by how much, and — first, before
 * any of it — how much has actually reported.
 *
 * The reporting figure leads deliberately. A results page that opens with a
 * leader and buries the coverage is a results page that calls an election at
 * 2% in, and the reader has no way to know. Here the share of units reporting
 * is the first thing on the panel, in the same weight as the totals.
 */
export function Reporting({ reported, booths, share, className }) {
  const thin = share < 20;

  return (
    <div className={cn("border-2 border-ink-950 bg-white p-5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
          Polling units reporting
        </p>
        <p className="font-display text-lg font-extrabold text-ink-950 tabular-nums">{share}%</p>
      </div>

      <div className="mt-3 h-2 w-full bg-ink-200">
        <div
          className={cn("h-full transition-[width]", thin ? "bg-ember-500" : "bg-brand-600")}
          style={{ width: `${Math.max(share, share > 0 ? 1 : 0)}%` }}
        />
      </div>

      <p className="mt-2.5 text-[0.8125rem] text-content-muted tabular-nums">
        {reported.toLocaleString()} of {booths.toLocaleString()} units
      </p>

      {thin && (
        <p className="mt-4 flex items-start gap-2.5 border-t border-ink-200 pt-4 text-[0.8125rem] leading-relaxed text-content-muted">
          <TriangleAlert size={15} className="mt-0.5 shrink-0 text-ember-600" aria-hidden="true" />
          <span>
            Too little is in to read anything into the lead. Early returns are
            not a small version of the final result — they are whichever booths
            happened to report first.
          </span>
        </p>
      )}
    </div>
  );
}

/**
 * Party totals as a bar chart made of type.
 *
 * No colour is load-bearing: every row states the party code and the number,
 * and the bar is a redundant second reading of the same figure.
 */
export function Standings({ tally, className }) {
  const top = tally.parties[0]?.votes ?? 0;

  if (!tally.parties.length) {
    return (
      <p className={cn("border border-ink-200 bg-white p-8 text-center text-[0.875rem] text-content-subtle", className)}>
        No returns have been filed yet.
      </p>
    );
  }

  return (
    <div className={cn("border-2 border-ink-950 bg-white", className)}>
      {tally.parties.map((party, index) => (
        <div key={party.partyId} className={cn("p-4", index > 0 && "border-t border-ink-200")}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="size-3 shrink-0"
                style={{ background: party.colour }}
              />
              <span className="font-display text-[0.9375rem] font-extrabold text-ink-950">
                {party.code}
              </span>
              <span className="truncate text-[0.75rem] text-content-subtle">{party.name}</span>
            </p>
            <p className="flex items-baseline gap-2.5">
              <span className="font-display text-lg font-extrabold text-ink-950 tabular-nums">
                {party.votes.toLocaleString()}
              </span>
              <span className="w-12 text-right text-[0.8125rem] font-bold text-content-muted tabular-nums">
                {party.share}%
              </span>
            </p>
          </div>
          <div className="mt-2.5 h-1.5 w-full bg-ink-100">
            <div
              className="h-full"
              style={{
                width: `${top ? (party.votes / top) * 100 : 0}%`,
                background: party.colour,
              }}
            />
          </div>
        </div>
      ))}

      <dl className="grid grid-cols-2 gap-px border-t-2 border-ink-950 bg-ink-200 sm:grid-cols-4">
        <Figure label="Total votes" value={tally.total} />
        <Figure label="Accredited" value={tally.accredited} />
        <Figure label="Turnout" value={tally.turnout == null ? "—" : `${tally.turnout}%`} />
        <Figure label="Rejected" value={tally.rejected} />
      </dl>
    </div>
  );
}

function Figure({ label, value }) {
  return (
    <div className="bg-white p-4">
      <dt className="text-[0.625rem] font-bold tracking-[0.1em] text-ink-500 uppercase">{label}</dt>
      <dd className="mt-1 font-display text-base font-extrabold text-ink-950 tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </dd>
    </div>
  );
}

/**
 * The gap between what our agents counted and what INEC declared.
 *
 * Shown only where there is something to compare. This is the whole reason the
 * two figures are stored in separate columns, and burying it would waste that.
 */
export function InecGap({ tally, className }) {
  if (!tally.inecTotal) return null;

  const gap = tally.total - tally.inecTotal;
  const share = tally.inecTotal ? Math.abs(gap / tally.inecTotal) * 100 : 0;

  return (
    <div className={cn("border border-ink-200 bg-white p-5", className)}>
      <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
        Against INEC&rsquo;s declared figures
      </p>
      <div className="mt-3 grid grid-cols-3 gap-4">
        <div>
          <p className="text-[0.625rem] font-bold tracking-[0.1em] text-ink-400 uppercase">Ours</p>
          <p className="mt-1 font-display text-base font-extrabold text-ink-950 tabular-nums">
            {tally.total.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[0.625rem] font-bold tracking-[0.1em] text-ink-400 uppercase">INEC</p>
          <p className="mt-1 font-display text-base font-extrabold text-ink-950 tabular-nums">
            {tally.inecTotal.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[0.625rem] font-bold tracking-[0.1em] text-ink-400 uppercase">Gap</p>
          <p
            className={cn(
              "mt-1 font-display text-base font-extrabold tabular-nums",
              share > 1 ? "text-red-700" : "text-ink-950"
            )}
          >
            {gap > 0 ? "+" : ""}
            {gap.toLocaleString()}
          </p>
        </div>
      </div>
      <p className="mt-3 border-t border-ink-200 pt-3 text-[0.75rem] leading-relaxed text-content-subtle">
        Only counts the units where an agent could read a declared figure, so it
        is a comparison of those units and not of the whole territory.
      </p>
    </div>
  );
}

/** The drill-down table under the map: the same data, with no colour in it. */
export function UnitTable({ rows, hrefFor, unitLabel, className }) {
  return (
    <div className={cn("overflow-x-auto border-2 border-ink-950 bg-white", className)}>
      <table className="w-full min-w-[36rem] border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-ink-950">
            {[unitLabel, "Leading", "Share", "Votes", "Units in"].map((head, index) => (
              <th
                key={head}
                scope="col"
                className={cn(
                  "px-4 py-3 text-[0.6875rem] font-bold tracking-[0.1em] text-ink-500 uppercase whitespace-nowrap",
                  index > 1 && "text-right"
                )}
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-ink-200 last:border-0">
              <td className="px-4 py-3 text-[0.875rem] font-semibold text-ink-950">
                {hrefFor?.(row) ? (
                  <Link
                    href={hrefFor(row)}
                    className="group inline-flex items-center gap-1.5 hover:text-brand-700"
                  >
                    {row.name}
                    <ArrowRight
                      size={13}
                      strokeWidth={3}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </Link>
                ) : (
                  row.name
                )}
              </td>
              <td className="px-4 py-3 text-[0.875rem]">
                {row.leader ? (
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0"
                      style={{ background: row.leader.colour }}
                    />
                    <span className="font-bold text-ink-950">{row.leader.code}</span>
                  </span>
                ) : (
                  <span className="text-ink-400">No returns</span>
                )}
              </td>
              <td className="px-4 py-3 text-right text-[0.875rem] text-content-muted tabular-nums">
                {row.leader ? `${row.leaderShare}%` : "—"}
              </td>
              <td className="px-4 py-3 text-right text-[0.875rem] text-ink-950 tabular-nums">
                {row.total ? row.total.toLocaleString() : "—"}
              </td>
              <td className="px-4 py-3 text-right text-[0.875rem] text-content-muted tabular-nums">
                {(row.unitsReported ?? 0).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The bottom of the tree: one row per polling unit, with the votes as filed.
 *
 * ── WHY THIS TABLE IS DIFFERENT FROM UnitTable ─────────────────────────────
 * Every level above this one shows a leader and an aggregate, because an LGA
 * does not have votes of its own — it has a sum of the booths inside it. A
 * polling unit is where the numbers actually come from, so this shows the
 * numbers themselves: every party's count, the accreditation, and whether there
 * is a photograph of the sheet behind it.
 *
 * The sheet column is the point of the whole system. A return with no
 * photograph is a number somebody typed, and it is marked as such rather than
 * shown identically to one with evidence behind it.
 * ───────────────────────────────────────────────────────────────────────────
 */
export function BoothTable({ rows, parties, className }) {
  return (
    <div className={cn("overflow-x-auto border-2 border-ink-950 bg-white", className)}>
      <table className="w-full min-w-[52rem] border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-ink-950">
            <th scope="col" className="px-4 py-3 text-[0.6875rem] font-bold tracking-[0.1em] text-ink-500 uppercase">
              Polling unit
            </th>
            {parties.map((party) => (
              <th
                key={party.id}
                scope="col"
                className="px-3 py-3 text-right text-[0.6875rem] font-bold tracking-[0.1em] whitespace-nowrap text-ink-500 uppercase"
              >
                <span className="flex items-center justify-end gap-1.5">
                  <span aria-hidden="true" className="size-2 shrink-0" style={{ background: party.colour }} />
                  {party.code}
                </span>
              </th>
            ))}
            {["Total", "Accredited", "Sheet"].map((head) => (
              <th
                key={head}
                scope="col"
                className="px-4 py-3 text-right text-[0.6875rem] font-bold tracking-[0.1em] whitespace-nowrap text-ink-500 uppercase"
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-ink-200 last:border-0">
              <td className="px-4 py-3 text-[0.875rem] text-ink-950">
                <span className="font-semibold">{row.name}</span>
                <span className="mt-0.5 block font-mono text-[0.6875rem] text-content-subtle">
                  {row.code}
                </span>
              </td>
              {parties.map((party) => {
                const votes = row.votes[party.id] ?? null;
                const leading = row.leader?.partyId === party.id;
                return (
                  <td
                    key={party.id}
                    className={cn(
                      "px-3 py-3 text-right text-[0.875rem] tabular-nums",
                      votes == null
                        ? "text-ink-300"
                        : leading
                          ? "font-bold text-ink-950"
                          : "text-content-muted"
                    )}
                  >
                    {votes == null ? "—" : votes.toLocaleString()}
                  </td>
                );
              })}
              <td className="px-4 py-3 text-right text-[0.875rem] font-bold text-ink-950 tabular-nums">
                {row.reported ? row.total.toLocaleString() : "—"}
              </td>
              <td className="px-4 py-3 text-right text-[0.875rem] text-content-muted tabular-nums">
                {row.accredited == null ? "—" : row.accredited.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right text-[0.8125rem]">
                {!row.reported ? (
                  <span className="text-ink-400">Not in</span>
                ) : row.hasSheet ? (
                  <span className="font-bold text-brand-700">On file</span>
                ) : (
                  <span className="font-bold text-ember-700">None</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * State → LGA → ward, as a trail you can walk back up.
 *
 * The drilldown is three clicks deep and the map stops being a map at the ward,
 * so without this a reader two levels in has no way to tell where they are or
 * how to get out.
 */
export function Trail({ steps, className }) {
  return (
    <nav aria-label="Where you are" className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      {steps.map((step, index) => (
        <span key={step.label} className="flex items-center gap-2">
          {index > 0 && (
            <span aria-hidden="true" className="text-ink-300">
              /
            </span>
          )}
          {step.href ? (
            <Link
              href={step.href}
              className="text-[0.75rem] font-bold tracking-[0.08em] text-ink-500 uppercase hover:text-ink-950"
            >
              {step.label}
            </Link>
          ) : (
            <span
              aria-current="page"
              className="text-[0.75rem] font-bold tracking-[0.08em] text-ink-950 uppercase"
            >
              {step.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
