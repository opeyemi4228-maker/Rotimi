import { readFile } from "node:fs/promises";
import path from "node:path";

import Link from "next/link";
import { Radio, ShieldAlert } from "lucide-react";

import PageHeader from "@/components/ui/PageHeader";
import ResultsMap from "@/components/results/ResultsMap";
import { InecGap, Reporting, Standings, UnitTable } from "@/components/results/ResultsPanel";
import LiveRefresh from "@/components/results/LiveRefresh";
import { prisma } from "@/lib/db";
import { breakdown, currentElection, electionsOnOffer, reporting, resultsWhere, tally } from "@/lib/elections";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Live results — MAP",
  description:
    "The Movement for Amaechi Presidency's own returns, filed by its agents at the polling units they were appointed to.",
};

/* Election night. Nothing here may be cached for even a second. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const TYPE_LABEL = {
  PRESIDENTIAL: "Presidential",
  GOVERNORSHIP: "Governorship",
  SENATE: "Senate",
  HOUSE_OF_REPS: "House of Reps",
};

/**
 * The national results page.
 *
 * ── THE SENTENCE THIS PAGE HAS TO SAY OUT LOUD ─────────────────────────────
 * These are MAP's own agents' returns, not INEC's results. It is said in the
 * header, again above the map, and again at the foot — not because the reader
 * is slow, but because a page of Nigerian election numbers with a national map
 * on it will be screenshotted, and the screenshot has to carry the caveat.
 * ───────────────────────────────────────────────────────────────────────────
 */
export default async function ResultsPage({ searchParams }) {
  const params = await searchParams;
  const elections = await electionsOnOffer();

  if (!elections.length) {
    return (
      <>
        <PageHeader
          breadcrumb="Results"
          kicker="Election returns"
          title="No election is running"
          lead="This page shows the movement's own returns from its polling unit agents, live, as they are filed. It opens when polls close."
        />
      </>
    );
  }

  const chosen =
    elections.find((election) => String(election.id) === params?.election) ??
    (await currentElection("PRESIDENTIAL")) ??
    elections[0];

  const where = resultsWhere({ electionId: chosen.id });

  const [totals, coverage, states, shapes] = await Promise.all([
    tally(where),
    reporting({ electionId: chosen.id }),
    breakdown({ electionId: chosen.id, level: "nation" }),
    stateShapes(chosen.id),
  ]);

  /* The map needs a row per state whether or not it has reported, so the
     breakdown is joined onto the full list rather than the other way round —
     a state missing from the results must still be drawn, in grey. */
  const stateRows = await prisma.state.findMany({
    select: { id: true, name: true, code: true, slug: true },
    orderBy: { name: "asc" },
  });
  const byState = new Map(states.map((row) => [row.unitId, row]));

  const rows = stateRows
    .map((state) => ({ ...state, ...(byState.get(state.id) ?? { total: 0, unitsReported: 0 }) }))
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0) || a.name.localeCompare(b.name, "en"));

  return (
    <>
      <LiveRefresh seconds={45} />

      <PageHeader
        breadcrumb="Results"
        kicker={`${TYPE_LABEL[chosen.type]} · ${chosen.year}`}
        title="Live returns from our agents"
        lead="Every figure here was filed by a MAP Polling Unit Coordinator from the booth they were appointed to, with a photograph of the result sheet behind it."
      />

      <section className="section-tight bg-white">
        <div className="shell">
          {/* ── What these numbers are ─────────────────────────────────── */}
          <p className="flex items-start gap-3 border-l-4 border-ember-500 bg-ember-50 p-5 text-[0.9375rem] leading-relaxed text-ink-950">
            <ShieldAlert size={19} className="mt-0.5 shrink-0 text-ember-600" aria-hidden="true" />
            <span>
              <strong className="font-bold">This is not an INEC declaration.</strong> It is the
              movement&rsquo;s own parallel count, assembled from the returns of its own agents.
              Only INEC declares a result in Nigeria.
            </span>
          </p>

          {/* ── Which contest ──────────────────────────────────────────── */}
          {elections.length > 1 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {elections.map((election) => (
                <Link
                  key={election.id}
                  href={`/results?election=${election.id}`}
                  aria-current={election.id === chosen.id ? "page" : undefined}
                  className={cn(
                    "border-2 px-4 py-2.5 text-[0.75rem] font-bold tracking-[0.06em] uppercase transition-colors",
                    election.id === chosen.id
                      ? "border-ink-950 bg-ink-950 text-white"
                      : "border-ink-200 text-ink-500 hover:border-ink-950 hover:text-ink-950"
                  )}
                >
                  {TYPE_LABEL[election.type] ?? election.type}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_22rem] lg:gap-10">
            {/* ── The map ────────────────────────────────────────────── */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-display text-xl font-extrabold tracking-tight text-ink-950">
                  Who is leading, by state
                </h2>
                <p className="flex items-center gap-2 text-[0.75rem] font-bold tracking-[0.08em] text-brand-700 uppercase">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping bg-brand-600 opacity-75" />
                    <span className="relative inline-flex size-2 bg-brand-600" />
                  </span>
                  Live
                </p>
              </div>
              <p className="mt-1.5 text-[0.8125rem] text-content-muted">
                Grey is a state nobody has reported from yet — not a state where
                nobody is winning. Tap a state for its local governments.
              </p>

              <ResultsMap className="mt-6" shapes={shapes} results={states} />

              <p className="mt-4 text-[0.75rem] text-content-subtle">
                Boundaries: geoBoundaries (CC BY 4.0), geoboundaries.org
              </p>
            </div>

            {/* ── The numbers ────────────────────────────────────────── */}
            <aside className="min-w-0 space-y-6">
              <Reporting {...coverage} />
              <Standings tally={totals} />
              <InecGap tally={totals} />
            </aside>
          </div>

          {/* ── Every state, as a table ─────────────────────────────── */}
          <section className="mt-14">
            <h2 className="font-display text-xl font-extrabold tracking-tight text-ink-950">
              Every state
            </h2>
            <p className="mt-1.5 text-[0.8125rem] text-content-muted">
              The same figures as the map, in a form that does not depend on
              telling two colours apart.
            </p>
            <UnitTable
              className="mt-6"
              unitLabel="State"
              rows={rows}
              hrefFor={(row) => `/results/${row.slug}?election=${chosen.id}`}
            />
          </section>

          <p className="mt-10 flex items-start gap-3 border-t-2 border-ink-950 pt-6 text-[0.8125rem] leading-relaxed text-content-muted">
            <Radio size={16} className="mt-0.5 shrink-0 text-ink-400" aria-hidden="true" />
            <span>
              Refreshes every 45 seconds. Figures are MAP&rsquo;s own agents&rsquo;
              returns and carry no official status. Where an agent could also
              read INEC&rsquo;s declared figure it is recorded separately and the
              difference is shown, rather than the two being averaged into one
              number.
            </span>
          </p>
        </div>
      </section>
    </>
  );
}

/** The state outlines, read from the file the map pipeline wrote. */
async function stateShapes(electionId) {
  const file = await readFile(
    path.join(process.cwd(), "public", "geo", "map", "states.json"),
    "utf8"
  );
  const data = JSON.parse(file);

  const states = await prisma.state.findMany({ select: { id: true, code: true, name: true, slug: true } });
  const byCode = new Map(states.map((state) => [state.code, state]));

  return {
    width: data.width,
    height: data.height,
    labelSize: 13,
    units: data.states
      .map((shape) => {
        const state = byCode.get(shape.code);
        return (
          state && {
            id: state.id,
            name: state.name,
            href: `/results/${state.slug}?election=${electionId}`,
            d: shape.d,
            at: shape.at,
          }
        );
      })
      .filter(Boolean),
  };
}
