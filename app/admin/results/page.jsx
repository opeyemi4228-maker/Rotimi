import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ExternalLink, ShieldAlert, Vote } from "lucide-react";

import LiveRefresh from "@/components/results/LiveRefresh";
import UnitGrid from "@/components/results/UnitGrid";
import { InecGap, Reporting, Standings, UnitTable } from "@/components/results/ResultsPanel";
import { prisma } from "@/lib/db";
import { requireSecretariat } from "@/lib/guard";
import { resultScope } from "@/lib/permissions";
import {
  breakdown,
  electionsOnOffer,
  latestReturns,
  reporting,
  resultsWhere,
  tally,
} from "@/lib/elections";
import { cn } from "@/lib/utils";
import { Card, Cell, Empty, PageTitle, Row, SectionHead, StatTile, Table } from "../ui";
import ReviewRow from "./ReviewRow";

export const metadata = { title: "Results — MAP Secretariat", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;

const LAGOS = "Africa/Lagos";

const when = (value) =>
  value
    ? new Intl.DateTimeFormat("en-NG", {
        hour: "2-digit",
        minute: "2-digit",
        day: "numeric",
        month: "short",
        timeZone: LAGOS,
      }).format(new Date(value))
    : "—";

/* What sits one level below each tier, and what to call it. A National
   Coordinator's children are states; a Ward Coordinator's are booths. */
const BELOW = {
  nation: { label: "State", plural: "states" },
  zone: { label: "State", plural: "states" },
  state: { label: "LGA", plural: "local governments" },
  lga: { label: "Ward", plural: "wards" },
  ward: { label: "Polling unit", plural: "polling units" },
};

/**
 * The results dashboard, cut to the territory you hold.
 *
 * ── ONE PAGE, EVERY TIER ───────────────────────────────────────────────────
 *   National Coordinator   the federation, broken down by state
 *   Zonal Coordinator      their zone's states
 *   State Coordinator      their state, broken down by LGA
 *   LGA Coordinator        their LGA, broken down by ward
 *   Ward Coordinator       their ward, broken down by polling unit
 *
 * The filter comes from `resultScope()` in lib/permissions, the same file every
 * other scope filter in this app lives in. There is no control on this page
 * that widens it, because §13.2 does not let one exist: the territory is read
 * from the seat on the server, on every request.
 *
 * ── WHY IT IS NOT THE PUBLIC PAGE WITH A FILTER ────────────────────────────
 * The public page answers "who is winning". This one answers "is my territory
 * reporting", which is a different question with a different lead figure. A
 * coordinator's job on the night is not to watch the score — it is to find the
 * wards that have gone quiet and telephone somebody. So coverage leads, the
 * units that have NOT reported are listed as work rather than hidden as
 * absence, and returns filed without a photograph of the sheet are counted
 * separately, because that is the other thing only they can chase.
 * ───────────────────────────────────────────────────────────────────────────
 */
export default async function AdminResults({ searchParams }) {
  const { scope } = await requireSecretariat();
  if (!scope) notFound();

  const cut = resultScope(scope);
  if (!cut) notFound();

  const params = await searchParams;
  const elections = await electionsOnOffer();

  if (!elections.length) {
    return (
      <>
        <PageTitle
          title="Results"
          lead={`Returns from ${scope.label}, live, as your agents file them.`}
        />
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <Vote size={20} className="mt-0.5 shrink-0 text-ink-400" aria-hidden="true" />
            <div>
              <p className="font-display text-lg font-extrabold tracking-tight text-ink-950">
                No election is running
              </p>
              <p className="mt-2 max-w-prose text-[0.9375rem] leading-relaxed text-content-muted">
                This page fills up on election day, with one row for every unit beneath
                you. Until then the thing that decides whether it works is whether your
                polling units have coordinators in them.
              </p>
              <Link
                href="/admin/polling-units"
                className="mt-5 inline-flex items-center gap-1.5 text-[0.75rem] font-bold tracking-[0.08em] text-brand-700 uppercase hover:text-ember-600"
              >
                Check your booth coverage
                <ArrowUpRight size={14} strokeWidth={3} />
              </Link>
            </div>
          </div>
        </Card>
      </>
    );
  }

  const election =
    elections.find((row) => String(row.id) === params?.election) ?? elections[0];

  /* A zone is a set of states rather than a column, so it is the one scope that
     has to be expanded before anything can be counted. */
  const stateIds =
    cut.level === "zone"
      ? (
          await prisma.state.findMany({
            where: { zoneId: cut.zoneId },
            select: { id: true },
          })
        ).map((row) => row.id)
      : undefined;

  const filter = {
    electionId: election.id,
    stateIds,
    stateId: cut.stateId,
    lgaId: cut.lgaId,
    wardId: cut.wardId,
    pollingUnitId: cut.pollingUnitId,
  };

  const [totals, coverage, children, latest] = await Promise.all([
    tally(resultsWhere(filter)),
    reporting(filter),
    cut.level === "pollingUnit"
      ? []
      : breakdown({
          electionId: election.id,
          level: cut.level,
          parentId: cut.parentId,
          stateIds,
        }),
    scopedReturns(filter, 12, scope.memberId),
  ]);

  const rows =
    cut.level === "pollingUnit" ? [] : await childRows(cut, stateIds, children);

  /* Only a coordinator strictly above the booth may check a return, which is
     everybody with a seat except the agent who filed it. The server checks this
     again on every PATCH — this only decides what is drawn. */
  const canReview = cut.level !== "pollingUnit";

  const silent = rows.filter((row) => !row.leader);
  const unevidenced = latest.filter((row) => !row.hasSheet).length;
  const below = BELOW[cut.level];

  return (
    <>
      <LiveRefresh seconds={45} />

      <PageTitle
        title="Results"
        lead={`${election.name}. Your agents' returns from ${scope.label} — MAP's own count, not an INEC declaration.`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            {elections.length > 1 && (
              <div className="flex gap-px bg-ink-200">
                {elections.map((row) => (
                  <Link
                    key={row.id}
                    href={`/admin/results?election=${row.id}`}
                    aria-current={row.id === election.id ? "page" : undefined}
                    className={cn(
                      "px-3 py-2 text-[0.6875rem] font-bold tracking-[0.08em] uppercase",
                      row.id === election.id
                        ? "bg-ink-950 text-white"
                        : "bg-white text-ink-600 hover:text-ink-950"
                    )}
                  >
                    {row.type.replace("_", " ")}
                  </Link>
                ))}
              </div>
            )}
            <Link
              href={`/results?election=${election.id}`}
              className="flex shrink-0 items-center gap-1.5 text-[0.75rem] font-bold tracking-[0.08em] text-brand-700 uppercase hover:text-ember-600"
            >
              <ExternalLink size={14} strokeWidth={3} />
              Public map
            </Link>
          </div>
        }
      />

      {/* ── coverage first, because that is the coordinator's actual job ── */}
      <div className="grid gap-px bg-ink-200 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={Vote}
          label="Booths reporting"
          value={coverage.reported}
          sub={`${coverage.share}% of the ${coverage.booths.toLocaleString()} in ${scope.unitName}`}
        />
        <StatTile
          icon={ShieldAlert}
          label={`${below?.label ?? "Unit"}s with nothing in`}
          value={silent.length}
          tone="alert"
          sub={
            silent.length
              ? "Somebody has to telephone these."
              : `Every ${below?.label.toLowerCase() ?? "unit"} beneath you has reported.`
          }
        />
        <StatTile
          icon={Vote}
          label="Votes counted"
          value={totals.total}
          sub={
            totals.parties[0]
              ? `${totals.parties[0].code} leading on ${totals.parties[0].share}%`
              : "No returns yet."
          }
        />
        <StatTile
          icon={ShieldAlert}
          label="Returns with no sheet"
          value={unevidenced}
          tone="alert"
          sub="A number with no photograph behind it."
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem] lg:gap-10">
        <div className="min-w-0">
          {cut.level === "pollingUnit" ? (
            <Card className="p-6">
              <p className="font-display text-lg font-extrabold tracking-tight text-ink-950">
                Your booth
              </p>
              <p className="mt-2 max-w-prose text-[0.9375rem] leading-relaxed text-content-muted">
                You hold one polling unit, so there is nothing beneath you to break down.
                File your return on the election page; it appears here and on the public
                map the moment it is sent.
              </p>
              <Link
                href="/admin/election"
                className="mt-5 inline-flex items-center gap-1.5 text-[0.75rem] font-bold tracking-[0.08em] text-brand-700 uppercase hover:text-ember-600"
              >
                File a return
                <ArrowUpRight size={14} strokeWidth={3} />
              </Link>
            </Card>
          ) : (
            <>
              <SectionHead
                title={`Who is leading, by ${below.label.toLowerCase()}`}
                lead={`${rows.length.toLocaleString()} ${below.plural} in ${scope.unitName}. Grey has not reported.`}
              />
              <UnitGrid rows={rows} emptyLabel="Nothing in" />

              <div className="mt-12">
                <SectionHead
                  title={`Every ${below.label.toLowerCase()} in ${scope.unitName}`}
                  lead="Sorted by votes counted, so the quiet units are at the bottom."
                />
                <UnitTable unitLabel={below.label} rows={rows} />
              </div>
            </>
          )}

          {/* ── the ticker ─────────────────────────────────────────────── */}
          <div className="mt-12">
            <SectionHead
              title="Latest returns"
              lead="As they arrive from your booths. A return with no sheet is marked."
            />
            <Table
              head={[
                { label: "Filed" },
                { label: "Polling unit" },
                { label: "Ward" },
                { label: "Votes", align: "right" },
                { label: "Status" },
                { label: "Check it against the sheet", align: "right" },
              ]}
              empty={latest.length === 0 ? <Empty>No agent has filed yet.</Empty> : null}
            >
              {latest.map((row) => (
                <Row key={row.id}>
                  <Cell className="whitespace-nowrap text-content-muted">{when(row.submittedAt)}</Cell>
                  <Cell>
                    <span className="font-bold">{row.unit}</span>
                    <span className="mt-0.5 block font-mono text-[0.6875rem] text-content-subtle">
                      {row.code}
                    </span>
                  </Cell>
                  <Cell className="text-content-muted">{row.ward}</Cell>
                  <Cell align="right" className="font-bold">{row.total.toLocaleString()}</Cell>
                  <ReviewRow row={row} canReview={canReview} />
                </Row>
              ))}
            </Table>
          </div>
        </div>

        <aside className="min-w-0 space-y-6">
          <Reporting {...coverage} />
          <Standings tally={totals} />
          <InecGap tally={totals} />

          {silent.length > 0 && (
            <Card className="border-red-600 p-5">
              <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-red-700 uppercase">
                Nothing in from
              </p>
              <ul className="mt-3 divide-y divide-ink-200">
                {silent.slice(0, 12).map((row) => (
                  <li key={row.id} className="py-1.5 text-[0.8125rem] text-ink-950">
                    {row.name}
                  </li>
                ))}
              </ul>
              {silent.length > 12 && (
                <p className="mt-3 border-t border-ink-200 pt-3 text-[0.75rem] text-content-subtle">
                  and {(silent.length - 12).toLocaleString()} more.
                </p>
              )}
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────── data */

/** The units one level below, named, with their tallies merged in. */
async function childRows(cut, stateIds, children) {
  const byId = new Map(children.map((row) => [row.unitId, row]));

  const rows =
    cut.level === "nation"
      ? await prisma.state.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
      : cut.level === "zone"
        ? await prisma.state.findMany({
            where: { id: { in: stateIds ?? [] } },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })
        : cut.level === "state"
          ? await prisma.lga.findMany({
              where: { stateId: cut.stateId },
              select: { id: true, name: true },
              orderBy: { name: "asc" },
            })
          : cut.level === "lga"
            ? await prisma.ward.findMany({
                where: { lgaId: cut.lgaId },
                select: { id: true, name: true },
                orderBy: { code: "asc" },
              })
            : await prisma.pollingUnit.findMany({
                where: { wardId: cut.wardId },
                select: { id: true, name: true },
                orderBy: { code: "asc" },
              });

  return rows
    .map((row) => ({ ...row, ...(byId.get(row.id) ?? { total: 0, unitsReported: 0 }) }))
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0) || a.name.localeCompare(b.name, "en"));
}

/**
 * The most recent returns inside this territory.
 *
 * `latestReturns()` in lib/elections is nationwide — it feeds the public
 * ticker. This one takes the same scope filter as everything else on the page,
 * because a Ward Coordinator watching the national feed scroll past would learn
 * nothing about their own ward.
 */
async function scopedReturns(filter, take, viewerId) {
  const rows = await prisma.pollingUnitResult.findMany({
    where: resultsWhere(filter),
    orderBy: { submittedAt: "desc" },
    take,
    select: {
      id: true,
      submittedAt: true,
      status: true,
      pollingUnit: { select: { name: true, code: true } },
      ward: { select: { name: true } },
      votes: { select: { votes: true } },
      sheet: { select: { resultId: true } },
      note: true,
      submittedById: true,
    },
  });

  return rows.map((row) => ({
    id: String(row.id),
    submittedAt: row.submittedAt,
    status: row.status,
    unit: row.pollingUnit.name,
    code: row.pollingUnit.code,
    ward: row.ward.name,
    total: row.votes.reduce((sum, vote) => sum + vote.votes, 0),
    hasSheet: Boolean(row.sheet),
    note: row.note,
    /* Nobody checks their own work. Flagged here so the row can say why the
       buttons are missing rather than just omitting them. */
    mine: String(row.submittedById) === String(viewerId),
  }));
}
