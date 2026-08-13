import { readFile } from "node:fs/promises";
import path from "node:path";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import ResultsMap from "@/components/results/ResultsMap";
import { InecGap, Reporting, Standings, UnitTable } from "@/components/results/ResultsPanel";
import LiveRefresh from "@/components/results/LiveRefresh";
import { prisma } from "@/lib/db";
import { breakdown, currentElection, reporting, resultsWhere, tally } from "@/lib/elections";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { state } = await params;
  const row = await prisma.state.findUnique({ where: { slug: state }, select: { name: true } });
  return { title: row ? `${row.name} results — MAP` : "Results — MAP" };
}

/**
 * One state: its own totals, and a map of its local governments.
 *
 * Same three components as the national page, pointed one level down. The map
 * is drawn on the national projection rather than fitted to the state, so a
 * state looks the same shape here as it does in the country — refitting each
 * one would silently rescale Kano against Lagos and the eye would read that as
 * a difference in size.
 */
export default async function StateResults({ params, searchParams }) {
  const { state: slug } = await params;
  const query = await searchParams;

  const state = await prisma.state.findUnique({
    where: { slug },
    select: { id: true, name: true, code: true, slug: true },
  });
  if (!state) notFound();

  const election =
    (query?.election &&
      (await prisma.election.findUnique({ where: { id: Number(query.election) } }))) ||
    (await currentElection("PRESIDENTIAL"));

  if (!election) notFound();

  const where = resultsWhere({ electionId: election.id, stateId: state.id });

  const [totals, coverage, lgaResults, lgaRows, shapes] = await Promise.all([
    tally(where),
    reporting({ electionId: election.id, stateId: state.id }),
    breakdown({ electionId: election.id, level: "state", parentId: state.id }),
    prisma.lga.findMany({
      where: { stateId: state.id },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    lgaShapes(state),
  ]);

  const byLga = new Map(lgaResults.map((row) => [row.unitId, row]));
  const rows = lgaRows
    .map((lga) => ({ ...lga, ...(byLga.get(lga.id) ?? { total: 0, unitsReported: 0 }) }))
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0) || a.name.localeCompare(b.name, "en"));

  return (
    <>
      <LiveRefresh seconds={45} />

      <section className="border-b-2 border-ink-950 bg-white">
        <div className="shell py-10">
          <Link
            href={`/results?election=${election.id}`}
            className="inline-flex items-center gap-2 text-[0.75rem] font-bold tracking-[0.08em] text-ink-500 uppercase hover:text-ink-950"
          >
            <ArrowLeft size={14} strokeWidth={3} />
            All states
          </Link>
          <h1 className="mt-4 font-display text-fluid-3xl font-extrabold tracking-[-0.03em] text-ink-950">
            {state.name}
          </h1>
          <p className="prose-body mt-3 max-w-2xl text-[0.9375rem]">
            {election.name}. MAP&rsquo;s own agents&rsquo; returns from the polling units of{" "}
            {state.name} — not an INEC declaration.
          </p>
        </div>
      </section>

      <section className="section-tight bg-white">
        <div className="shell">
          <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:gap-10">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-extrabold tracking-tight text-ink-950">
                Who is leading, by local government
              </h2>
              <p className="mt-1.5 text-[0.8125rem] text-content-muted">
                Grey is an LGA nobody has reported from yet.
              </p>

              {shapes.units.length > 0 ? (
                <ResultsMap className="mt-6" shapes={shapes} results={lgaResults} />
              ) : (
                <p className="mt-6 border border-ink-200 bg-white p-8 text-center text-[0.875rem] text-content-subtle">
                  No boundary data for {state.name}&rsquo;s local governments.
                </p>
              )}
            </div>

            <aside className="min-w-0 space-y-6">
              <Reporting {...coverage} />
              <Standings tally={totals} />
              <InecGap tally={totals} />
            </aside>
          </div>

          <section className="mt-14">
            <h2 className="font-display text-xl font-extrabold tracking-tight text-ink-950">
              Every local government in {state.name}
            </h2>
            <UnitTable className="mt-6" unitLabel="LGA" rows={rows} />
          </section>
        </div>
      </section>
    </>
  );
}

/**
 * One state's LGA outlines.
 *
 * The map pipeline assigned each LGA polygon to a state by point-in-polygon
 * rather than by name, so these are matched back to the register by normalised
 * name — the two spelling conventions disagree often enough ("Obio/Akpor"
 * against "Obio Akpor") that an exact match would silently lose LGAs.
 */
async function lgaShapes(state) {
  let data;
  try {
    data = JSON.parse(
      await readFile(path.join(process.cwd(), "public", "geo", "map", `${state.code}.json`), "utf8")
    );
  } catch {
    return { width: 1000, height: 812, units: [] };
  }

  const lgas = await prisma.lga.findMany({
    where: { stateId: state.id },
    select: { id: true, name: true },
  });

  const key = (name) => String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
  const byName = new Map(lgas.map((lga) => [key(lga.name), lga]));

  const units = data.lgas
    .map((shape) => {
      const lga = byName.get(key(shape.name));
      return lga && { id: lga.id, name: lga.name, d: shape.d, at: shape.at };
    })
    .filter(Boolean);

  /* Crop to what is actually drawn, so a single state fills the frame instead
     of sitting as a speck inside the national bounding box. The shapes keep
     the national projection; only the window onto them moves. */
  const box = units.reduce(
    (acc, unit) => {
      for (const match of unit.d.matchAll(/([ML])(-?[\d.]+) (-?[\d.]+)/g)) {
        const x = Number(match[2]);
        const y = Number(match[3]);
        acc.minX = Math.min(acc.minX, x);
        acc.maxX = Math.max(acc.maxX, x);
        acc.minY = Math.min(acc.minY, y);
        acc.maxY = Math.max(acc.maxY, y);
      }
      return acc;
    },
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  );

  if (!Number.isFinite(box.minX)) return { width: 1000, height: 812, units };

  const pad = 12;
  return {
    viewBox: `${box.minX - pad} ${box.minY - pad} ${box.maxX - box.minX + pad * 2} ${box.maxY - box.minY + pad * 2}`,
    width: box.maxX - box.minX + pad * 2,
    height: box.maxY - box.minY + pad * 2,
    offsetX: box.minX - pad,
    offsetY: box.minY - pad,
    labelSize: Math.max(6, (box.maxX - box.minX) / 40),
    units,
  };
}
