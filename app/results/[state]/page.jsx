import { readFile } from "node:fs/promises";
import path from "node:path";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import ResultsMap from "@/components/results/ResultsMap";
import UnitGrid from "@/components/results/UnitGrid";
import {
  BoothTable,
  InecGap,
  Reporting,
  Standings,
  Trail,
  UnitTable,
} from "@/components/results/ResultsPanel";
import LiveRefresh from "@/components/results/LiveRefresh";
import { prisma } from "@/lib/db";
import { breakdown, currentElection, reporting, resultsWhere, tally } from "@/lib/elections";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params, searchParams }) {
  const [{ state }, query] = await Promise.all([params, searchParams]);
  const row = await prisma.state.findUnique({ where: { slug: state }, select: { name: true } });
  if (!row) return { title: "Results — MAP" };

  /* The ward and LGA names come from the same lookups the page does, so a
     shared link says which place it is about rather than repeating the state
     three levels down. */
  const place = query?.ward
    ? await prisma.ward.findUnique({ where: { id: Number(query.ward) }, select: { name: true } })
    : query?.lga
      ? await prisma.lga.findUnique({ where: { id: Number(query.lga) }, select: { name: true } })
      : null;

  return {
    title: place ? `${place.name}, ${row.name} results — MAP` : `${row.name} results — MAP`,
  };
}

/**
 * One state, drilled down as far as the booth.
 *
 * ── ONE PAGE, THREE DEPTHS ─────────────────────────────────────────────────
 *   /results/rivers                       every LGA in the state
 *   /results/rivers?lga=142               every ward in that LGA
 *   /results/rivers?lga=142&ward=1907     every polling unit in that ward
 *
 * One route rather than three because the frame never changes — the same
 * reporting figure, the same standings, the same INEC gap, pointed one level
 * further down each time. Three routes would be three copies of that frame and
 * they would drift apart within a month.
 *
 * The query parameters are ids, not slugs, because wards and polling units have
 * no slug in the register — and both are checked against the state before
 * anything is read, so a Rivers URL cannot be edited into a Lagos ward.
 * ───────────────────────────────────────────────────────────────────────────
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

  /* Both parents are resolved and both are checked against the level above.
     A ward that is not in the requested LGA, or an LGA that is not in this
     state, is a 404 — not a silent fall back to the state, which would show a
     reader numbers for a place they did not ask about. */
  const lga = query?.lga
    ? await prisma.lga.findFirst({
        where: { id: Number(query.lga) || 0, stateId: state.id },
        select: { id: true, name: true, code: true },
      })
    : null;
  if (query?.lga && !lga) notFound();

  const ward = lga && query?.ward
    ? await prisma.ward.findFirst({
        where: { id: Number(query.ward) || 0, lgaId: lga.id },
        select: { id: true, name: true, code: true },
      })
    : null;
  if (query?.ward && !ward) notFound();

  const link = (next) => {
    const search = new URLSearchParams({ election: String(election.id) });
    if (next.lga) search.set("lga", String(next.lga));
    if (next.ward) search.set("ward", String(next.ward));
    return `/results/${state.slug}?${search}`;
  };

  const level = ward ? "ward" : lga ? "lga" : "state";
  const place = ward ?? lga ?? state;

  const where = resultsWhere({
    electionId: election.id,
    stateId: state.id,
    lgaId: lga?.id,
    wardId: ward?.id,
  });

  const [totals, coverage] = await Promise.all([
    tally(where),
    reporting({
      electionId: election.id,
      stateId: state.id,
      lgaId: lga?.id,
      wardId: ward?.id,
    }),
  ]);

  const trail = [
    { label: "All states", href: `/results?election=${election.id}` },
    { label: state.name, href: level === "state" ? null : link({}) },
    ...(lga ? [{ label: lga.name, href: level === "lga" ? null : link({ lga: lga.id }) }] : []),
    ...(ward ? [{ label: `${ward.name} Ward`, href: null }] : []),
  ];

  return (
    <>
      <LiveRefresh seconds={45} />

      <section className="border-b-2 border-ink-950 bg-white">
        <div className="shell py-10">
          <Trail steps={trail} />
          <h1 className="mt-4 font-display text-fluid-3xl font-extrabold tracking-[-0.03em] text-ink-950">
            {ward ? `${ward.name} Ward` : place.name}
          </h1>
          <p className="prose-body mt-3 max-w-2xl text-[0.9375rem]">
            {election.name}. MAP&rsquo;s own agents&rsquo; returns from the polling units of{" "}
            {ward ? `${ward.name} Ward, ${lga.name}` : lga ? `${lga.name}, ${state.name}` : state.name}{" "}
            — not an INEC declaration.
          </p>
        </div>
      </section>

      <section className="section-tight bg-white">
        <div className="shell">
          <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:gap-10">
            <div className="min-w-0">
              {level === "state" && (
                <LgaLevel state={state} election={election} link={link} />
              )}
              {level === "lga" && <WardLevel lga={lga} election={election} link={link} />}
              {level === "ward" && <BoothLevel ward={ward} election={election} />}
            </div>

            <aside className="min-w-0 space-y-6">
              <Reporting {...coverage} />
              <Standings tally={totals} />
              <InecGap tally={totals} />

              {level !== "state" && (
                <Link
                  href={level === "ward" ? link({ lga: lga.id }) : link({})}
                  className="flex items-center gap-2 border-2 border-ink-950 px-4 py-3 text-[0.75rem] font-bold tracking-[0.08em] text-ink-950 uppercase transition-colors hover:bg-ink-950 hover:text-white"
                >
                  <ArrowLeft size={14} strokeWidth={3} />
                  Back to {level === "ward" ? lga.name : state.name}
                </Link>
              )}
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─────────────────────────────────────────────────── level one: the LGA map */

async function LgaLevel({ state, election, link }) {
  const [results, rows, shapes] = await Promise.all([
    breakdown({ electionId: election.id, level: "state", parentId: state.id }),
    prisma.lga.findMany({
      where: { stateId: state.id },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    lgaShapes(state, link),
  ]);

  const byId = new Map(results.map((row) => [row.unitId, row]));
  const merged = rows
    .map((row) => ({ ...row, ...(byId.get(row.id) ?? { total: 0, unitsReported: 0 }) }))
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0) || a.name.localeCompare(b.name, "en"));

  return (
    <>
      <h2 className="font-display text-xl font-extrabold tracking-tight text-ink-950">
        Who is leading, by local government
      </h2>
      <p className="mt-1.5 text-[0.8125rem] text-content-muted">
        Grey is an LGA nobody has reported from yet. Click one for its wards.
      </p>

      {shapes.units.length > 0 ? (
        <ResultsMap className="mt-6" shapes={shapes} results={results} />
      ) : (
        <p className="mt-6 border border-ink-200 bg-white p-8 text-center text-[0.875rem] text-content-subtle">
          No boundary data for {state.name}&rsquo;s local governments.
        </p>
      )}

      <h2 className="mt-14 font-display text-xl font-extrabold tracking-tight text-ink-950">
        Every local government in {state.name}
      </h2>
      <UnitTable
        className="mt-6"
        unitLabel="LGA"
        rows={merged}
        hrefFor={(row) => link({ lga: row.id })}
      />
    </>
  );
}

/* ────────────────────────────────────────────────── level two: the ward grid */

async function WardLevel({ lga, election, link }) {
  const [results, wards, booths] = await Promise.all([
    breakdown({ electionId: election.id, level: "lga", parentId: lga.id }),
    prisma.ward.findMany({
      where: { lgaId: lga.id },
      select: { id: true, name: true, code: true },
      orderBy: { code: "asc" },
    }),
    /* How many booths each ward has, so "3 of 41 in" is a real fraction rather
       than a count with nothing to measure it against. */
    prisma.pollingUnit.groupBy({
      by: ["wardId"],
      where: { ward: { lgaId: lga.id } },
      _count: { _all: true },
    }),
  ]);

  const byId = new Map(results.map((row) => [row.unitId, row]));
  const boothCount = new Map(booths.map((row) => [row.wardId, row._count._all]));

  const merged = wards.map((row) => ({
    ...row,
    ...(byId.get(row.id) ?? { total: 0, unitsReported: 0 }),
    boothCount: boothCount.get(row.id) ?? 0,
    href: link({ lga: lga.id, ward: row.id }),
  }));

  const table = [...merged].sort(
    (a, b) => (b.total ?? 0) - (a.total ?? 0) || a.name.localeCompare(b.name, "en")
  );

  return (
    <>
      <h2 className="font-display text-xl font-extrabold tracking-tight text-ink-950">
        Who is leading, by ward
      </h2>
      <p className="mt-1.5 text-[0.8125rem] leading-snug text-content-muted">
        {wards.length.toLocaleString()} wards in {lga.name}, in delimitation order. There is
        no open boundary data for Nigerian wards, so these are tiles rather than a map —
        the colours mean the same thing, they just do not say where anything is. Click a
        ward for its polling units.
      </p>

      <UnitGrid className="mt-6" rows={merged} emptyLabel="No returns yet" />

      <h2 className="mt-14 font-display text-xl font-extrabold tracking-tight text-ink-950">
        Every ward in {lga.name}
      </h2>
      <UnitTable
        className="mt-6"
        unitLabel="Ward"
        rows={table}
        hrefFor={(row) => link({ lga: lga.id, ward: row.id })}
      />
    </>
  );
}

/* ────────────────────────────────────────── level three: the polling units */

async function BoothLevel({ ward, election }) {
  const [units, returns, parties] = await Promise.all([
    prisma.pollingUnit.findMany({
      where: { wardId: ward.id },
      select: { id: true, name: true, code: true },
      orderBy: { code: "asc" },
    }),
    prisma.pollingUnitResult.findMany({
      where: { electionId: election.id, wardId: ward.id, status: { in: ["SUBMITTED", "VERIFIED"] } },
      select: {
        pollingUnitId: true,
        accreditedVoters: true,
        votes: { select: { partyId: true, votes: true } },
        sheet: { select: { resultId: true } },
      },
    }),
    prisma.party.findMany({ select: { id: true, code: true, colour: true }, orderBy: { code: "asc" } }),
  ]);

  const byUnit = new Map(returns.map((row) => [row.pollingUnitId, row]));

  const rows = units.map((unit) => {
    const filed = byUnit.get(unit.id);
    if (!filed) {
      return { ...unit, reported: false, votes: {}, total: 0, accredited: null, hasSheet: false };
    }

    const votes = {};
    let total = 0;
    let leader = null;
    for (const vote of filed.votes) {
      votes[vote.partyId] = vote.votes;
      total += vote.votes;
      if (!leader || vote.votes > leader.votes) leader = { partyId: vote.partyId, votes: vote.votes };
    }

    return {
      ...unit,
      reported: true,
      votes,
      total,
      leader,
      accredited: filed.accreditedVoters,
      hasSheet: Boolean(filed.sheet),
    };
  });

  /* Only the parties that actually scored somewhere in this ward. All seven
     columns on a booth where four of them are dashes is a wider table saying
     less. */
  const scored = new Set(rows.flatMap((row) => Object.keys(row.votes).map(Number)));
  const columns = parties.filter((party) => scored.has(party.id));

  const reported = rows.filter((row) => row.reported).length;

  return (
    <>
      <h2 className="font-display text-xl font-extrabold tracking-tight text-ink-950">
        Every polling unit in {ward.name} Ward
      </h2>
      <p className="mt-1.5 text-[0.8125rem] leading-snug text-content-muted">
        {reported.toLocaleString()} of {units.length.toLocaleString()} booths have filed.
        This is the bottom of the tree — every number above this page is a sum of these,
        exactly as the agents filed them.
      </p>

      <UnitGrid
        className="mt-6"
        rows={rows.map((row) => ({
          ...row,
          leader: row.leader
            ? {
                ...row.leader,
                code: parties.find((party) => party.id === row.leader.partyId)?.code ?? "—",
                colour: parties.find((party) => party.id === row.leader.partyId)?.colour ?? "#6B6660",
              }
            : null,
          leaderShare: row.leader && row.total ? Math.round((row.leader.votes / row.total) * 1000) / 10 : 0,
        }))}
        emptyLabel="Not in"
      />

      {columns.length > 0 ? (
        <>
          <h2 className="mt-14 font-display text-xl font-extrabold tracking-tight text-ink-950">
            The returns as filed
          </h2>
          <p className="mt-1.5 text-[0.8125rem] text-content-muted">
            A booth with no photograph of its sheet is a number somebody typed. It is
            marked, not hidden.
          </p>
          <BoothTable className="mt-6" rows={rows} parties={columns} />
        </>
      ) : (
        <p className="mt-8 border-2 border-ink-950 bg-white p-8 text-center text-[0.875rem] text-content-subtle">
          No agent has filed a return from this ward yet.
        </p>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────── the shapes */

/**
 * One state's LGA outlines.
 *
 * The map pipeline assigned each LGA polygon to a state by point-in-polygon
 * rather than by name, so these are matched back to the register by normalised
 * name — the two spelling conventions disagree often enough ("Obio/Akpor"
 * against "Obio Akpor") that an exact match would silently lose LGAs.
 */
async function lgaShapes(state, link) {
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
      return (
        lga && {
          id: lga.id,
          name: lga.name,
          d: shape.d,
          at: shape.at,
          /* Precomputed here rather than passed as a callback: a function
             cannot cross into the client component that draws the map. */
          href: link({ lga: lga.id }),
        }
      );
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
