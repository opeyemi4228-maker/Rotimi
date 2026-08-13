import Link from "next/link";
import { ArrowRight, Radio } from "lucide-react";

import { currentElection, reporting, resultsWhere, tally } from "@/lib/elections";
import { cn } from "@/lib/utils";

/**
 * Live results, on the homepage.
 *
 * ── WHY THIS SHOWS REAL NUMBERS AND NOT JUST A LINK ────────────────────────
 * A band that says "see the results" is a navigation item. On the night, the
 * homepage is where people land first and what they want is one line: who is
 * ahead and how much is in. Giving them that here, with the reporting share
 * next to it, means the page has answered the question before they click — and
 * the ones who click arrive already knowing not to read too much into a lead at
 * 4% in.
 *
 * ── AND WHY THE REPORTING SHARE IS AS BIG AS THE LEAD ──────────────────────
 * The same rule as the results page itself. A leader with almost nothing
 * counted is not a leader, and a homepage is the single easiest place in a
 * product to accidentally call an election. The share sits in the same weight
 * as the party, and under 20% it says so in words.
 *
 * When no election is open the band still renders, explaining what it is for.
 * A homepage that grows a whole new section on election night is a homepage
 * whose shape nobody can plan around.
 * ───────────────────────────────────────────────────────────────────────────
 */
export default async function ResultsBand() {
  const election = await currentElection("PRESIDENTIAL");

  if (!election) {
    return (
      <Frame>
        <div className="max-w-2xl">
          <p className="prose-body text-[0.9375rem]">
            When polls close, this is where the movement&rsquo;s own count appears — filed
            by our agents from the polling units they were appointed to, booth by booth,
            as it comes in. Not an INEC declaration, and never presented as one.
          </p>
        </div>
        <Cta />
      </Frame>
    );
  }

  const where = resultsWhere({ electionId: election.id });
  const [totals, coverage] = await Promise.all([
    tally(where),
    reporting({ electionId: election.id }),
  ]);

  const leaders = totals.parties.slice(0, 3);
  const thin = coverage.share < 20;

  return (
    <Frame live>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <p className="text-[0.75rem] font-bold tracking-[0.14em] text-ink-500 uppercase">
            {election.name}
          </p>

          {leaders.length === 0 ? (
            <p className="prose-body mt-3 max-w-2xl text-[0.9375rem]">
              Polls are open and no agent has filed yet. The first returns appear here the
              moment they are sent.
            </p>
          ) : (
            <ol className="mt-5 flex flex-wrap gap-x-10 gap-y-5">
              {leaders.map((party, index) => (
                <li key={party.code} className="min-w-0">
                  <p className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-3 shrink-0"
                      style={{ background: party.colour }}
                    />
                    <span
                      className={cn(
                        "font-display font-extrabold tracking-tight text-ink-950",
                        index === 0 ? "text-2xl" : "text-lg"
                      )}
                    >
                      {party.code}
                    </span>
                  </p>
                  <p
                    className={cn(
                      "mt-1 font-display font-extrabold tabular-nums text-ink-950",
                      index === 0 ? "text-fluid-2xl" : "text-xl"
                    )}
                  >
                    {party.share}%
                  </p>
                  <p className="mt-0.5 text-[0.8125rem] text-content-muted tabular-nums">
                    {party.votes.toLocaleString()} votes
                  </p>
                </li>
              ))}
            </ol>
          )}

          {/* The coverage, in the same weight as the lead beside it. */}
          <div className="mt-7 max-w-md">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                Polling units reporting
              </p>
              <p className="font-display text-[0.9375rem] font-extrabold text-ink-950 tabular-nums">
                {coverage.share}%
              </p>
            </div>
            <div className="mt-2 h-2 w-full bg-ink-200">
              <div
                className={cn("h-full", thin ? "bg-ember-500" : "bg-brand-600")}
                style={{ width: `${Math.max(coverage.share, coverage.share > 0 ? 1 : 0)}%` }}
              />
            </div>
            <p className="mt-2 text-[0.8125rem] text-content-muted tabular-nums">
              {coverage.reported.toLocaleString()} of {coverage.booths.toLocaleString()} units
              {thin && " — far too little in to read anything into the lead."}
            </p>
          </div>
        </div>

        <Cta />
      </div>
    </Frame>
  );
}

function Frame({ live, children }) {
  return (
    <div className="border-2 border-ink-950 bg-white p-7 sm:p-9">
      <p className="mb-5 flex items-center gap-2.5">
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
      className="mt-8 inline-flex shrink-0 items-center gap-2 self-start border-2 border-ink-950 bg-ink-950 px-6 py-3.5 text-[0.8125rem] font-bold tracking-[0.08em] text-white uppercase transition-colors hover:bg-ember-500 hover:text-ink-950 lg:mt-0"
    >
      Open the results map
      <ArrowRight size={16} strokeWidth={3} />
    </Link>
  );
}
