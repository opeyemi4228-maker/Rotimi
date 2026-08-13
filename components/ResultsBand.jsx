import { readFile } from "node:fs/promises";
import path from "node:path";

import Link from "next/link";
import { ArrowRight, Radio } from "lucide-react";

import { prisma } from "@/lib/db";
import { breakdown, currentElection, reporting, resultsWhere, tally } from "@/lib/elections";
import { cn } from "@/lib/utils";

/**
 * Live results, on the homepage.
 *
 * ── WHY THIS SHOWS REAL NUMBERS AND NOT JUST A LINK ────────────────────────
 * A band that says "see the results" is a navigation item. On the night, the
 * homepage is where people land first and what they want is one look: who is
 * ahead, where, and how much is in. Giving them that here means the page has
 * answered the question before they click — and the ones who click arrive
 * already knowing not to read too much into a lead at 4% in.
 *
 * ── AND WHY THE REPORTING SHARE IS AS LOUD AS THE LEAD ─────────────────────
 * A homepage is the single easiest place in a product to accidentally call an
 * election. The coverage figure sits in the same weight as the leader, directly
 * under it, and below 20% it says in words that the lead means nothing yet.
 *
 * ── THE MAP IS A THUMBNAIL, NOT A CONTROL ──────────────────────────────────
 * No hover, no per-state links, no labels: at this size a party code would not
 * be legible and a click target would be four pixels wide. It is here to answer
 * "where has reported" at a glance, and the whole band is one link through to
 * the real map where all of that works. Colour is never the only encoding on
 * the page — the standings beside it name every party in type.
 * ───────────────────────────────────────────────────────────────────────────
 */
export default async function ResultsBand() {
  const election = await currentElection("PRESIDENTIAL");

  if (!election) {
    return (
      <Frame>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-center lg:gap-12">
          <MiniMap shapes={await nationShapes()} colours={new Map()} />
          <div>
            <p className="prose-body max-w-xl text-[0.9375rem]">
              When polls close, this is where the movement&rsquo;s own count appears — filed
              by our agents from the polling units they were appointed to, booth by booth,
              as it comes in. Not an INEC declaration, and never presented as one.
            </p>
            <Cta />
          </div>
        </div>
      </Frame>
    );
  }

  const [totals, coverage, states, shapes, byState] = await Promise.all([
    tally(resultsWhere({ electionId: election.id })),
    reporting({ electionId: election.id }),
    prisma.state.findMany({ select: { id: true, code: true } }),
    nationShapes(),
    breakdown({ electionId: election.id, level: "nation" }),
  ]);

  /* State id → leading party's colour. Anything absent stays grey, which is the
     whole point: silence is not zero. */
  const codeById = new Map(states.map((row) => [row.id, row.code]));
  const colours = new Map();
  for (const row of byState) {
    if (row.leader) colours.set(codeById.get(row.unitId), row.leader.colour);
  }

  const leaders = totals.parties.slice(0, 4);
  const thin = coverage.share < 20;

  return (
    <Frame live>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start lg:gap-12">
        <div>
          <MiniMap shapes={shapes} colours={colours} />
          <p className="mt-3 text-[0.75rem] leading-snug text-content-subtle">
            Grey is a state nobody has reported from yet.
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[0.6875rem] font-bold tracking-[0.16em] text-ink-500 uppercase">
            {election.name}
          </p>

          {leaders.length === 0 ? (
            <p className="prose-body mt-4 max-w-xl text-[0.9375rem]">
              Polls are open and no agent has filed yet. The first returns appear here the
              moment they are sent.
            </p>
          ) : (
            /* A table, not a flex row of stacked figures. Four parties with
               four different magnitudes need columns that line up — the
               previous version let the leader's larger type push the others
               into each other. */
            <ol className="mt-5 space-y-3">
              {leaders.map((party, index) => (
                <li key={party.code} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-x-4">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-3 shrink-0"
                      style={{ background: party.colour }}
                    />
                    <span
                      className={cn(
                        "font-display font-extrabold tracking-tight text-ink-950",
                        index === 0 ? "text-[1.0625rem]" : "text-[0.9375rem]"
                      )}
                    >
                      {party.code}
                    </span>
                  </span>

                  <span aria-hidden="true" className="block h-3 w-full bg-ink-100">
                    <span
                      className="block h-full"
                      style={{
                        background: party.colour,
                        width: `${Math.max(party.share, party.share > 0 ? 1.5 : 0)}%`,
                      }}
                    />
                  </span>

                  <span className="flex items-baseline gap-2.5 whitespace-nowrap">
                    <span
                      className={cn(
                        "font-display font-extrabold tabular-nums text-ink-950",
                        index === 0 ? "text-xl" : "text-base"
                      )}
                    >
                      {party.share}%
                    </span>
                    <span className="w-20 text-right text-[0.8125rem] text-content-muted tabular-nums">
                      {party.votes.toLocaleString()}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}

          {/* Coverage, in the same weight as the leader above it. */}
          <div className="mt-7 border-t-2 border-ink-950 pt-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[0.6875rem] font-bold tracking-[0.14em] text-ink-500 uppercase">
                Polling units reporting
              </p>
              <p className="font-display text-xl font-extrabold text-ink-950 tabular-nums">
                {coverage.share}%
              </p>
            </div>
            <div className="mt-2.5 h-2 w-full bg-ink-200">
              <div
                className={cn("h-full", thin ? "bg-ember-500" : "bg-brand-600")}
                style={{ width: `${Math.max(coverage.share, coverage.share > 0 ? 0.8 : 0)}%` }}
              />
            </div>
            <p className="mt-2.5 text-[0.8125rem] leading-snug text-content-muted">
              <span className="tabular-nums">
                {coverage.reported.toLocaleString()} of {coverage.booths.toLocaleString()}
              </span>{" "}
              units
              {thin && " — far too little in to read anything into the lead."}
            </p>
          </div>

          <Cta />
        </div>
      </div>
    </Frame>
  );
}

/* ─────────────────────────────────────────────────────────────── the map */

/**
 * Nigeria at thumbnail size.
 *
 * Server-rendered SVG with no client component behind it: there is nothing to
 * interact with, so shipping a hydration boundary for it would be paying for
 * behaviour the design deliberately does not have.
 */
function MiniMap({ shapes, colours }) {
  const reported = shapes.units.filter((unit) => colours.get(unit.code)).length;

  return (
    <svg
      viewBox={`0 0 ${shapes.width} ${shapes.height}`}
      className="w-full max-w-sm"
      role="img"
      aria-label={
        reported
          ? `Nigeria: ${reported} of ${shapes.units.length} states have returns in, each shaded by its leading party.`
          : "Nigeria: no state has reported yet."
      }
    >
      {shapes.units.map((unit) => (
        <path
          key={unit.code}
          d={unit.d}
          fill={colours.get(unit.code) ?? "#E7E5E1"}
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

/** The 37 state outlines, straight off the build artefact. */
async function nationShapes() {
  try {
    const data = JSON.parse(
      await readFile(path.join(process.cwd(), "public", "geo", "map", "states.json"), "utf8")
    );
    return {
      width: data.width,
      height: data.height,
      units: data.states.map((shape) => ({ code: shape.code, d: shape.d })),
    };
  } catch {
    /* The band still renders without the map rather than taking the homepage
       down with it. */
    return { width: 1000, height: 812, units: [] };
  }
}

/* ────────────────────────────────────────────────────────────── fittings */

function Frame({ live, children }) {
  return (
    <div className="border-2 border-ink-950 bg-white p-7 sm:p-9">
      <p className="mb-6 flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className={cn(
            "grid size-7 place-items-center",
            live ? "bg-ember-500 text-white" : "bg-ink-100 text-ink-500"
          )}
        >
          <Radio size={14} strokeWidth={2.75} />
        </span>
        <span className="text-[0.6875rem] font-bold tracking-[0.16em] text-ink-950 uppercase">
          {live ? "Counting now" : "Not yet counting"}
        </span>
      </p>
      {children}
    </div>
  );
}

function Cta() {
  return (
    <Link
      href="/results"
      className="mt-7 inline-flex items-center gap-2 border-2 border-ink-950 bg-ink-950 px-6 py-3.5 text-[0.8125rem] font-bold tracking-[0.08em] text-white uppercase transition-colors hover:bg-ember-500 hover:text-ink-950"
    >
      Open the results map
      <ArrowRight size={16} strokeWidth={3} />
    </Link>
  );
}
