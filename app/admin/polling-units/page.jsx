import Link from "next/link";
import { MapPin, Search, Users, CircleSlash } from "lucide-react";

import { requireSecretariat } from "@/lib/guard";
import { pollingUnits } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import { Card, Coverage, Empty, PageTitle, StatTile, Table, Row, Cell } from "../ui";

export const dynamic = "force-dynamic";

const PER_PAGE = 40;
const ORDERS = [
  { key: "empty", label: "Emptiest first" },
  { key: "members", label: "Most members" },
];

/**
 * Every polling unit in the coordinator's territory, and how many members are
 * registered at each.
 *
 * ── WHY EMPTIEST FIRST ─────────────────────────────────────────────────────
 * A unit with nobody registered is not a blank row to be scrolled past; it is
 * the point of the page. It is a building where the movement has no one on
 * election day, and the list sorted that way is the shortest honest answer to
 * "where do I go this week". Sorting by the biggest numbers would make the page
 * a trophy cabinet.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * INEC's own delimitation code is shown beside every name, because that is the
 * identifier a coordinator will be reading off an INEC list in their hand — the
 * names in the register are addresses, and two units in one ward can share one.
 */
export default async function PollingUnitsPage({ searchParams }) {
  const params = await searchParams;
  const q = String(params?.q ?? "");
  const page = Math.max(1, Number(params?.page ?? 1) || 1);
  const order = ORDERS.some((o) => o.key === params?.order) ? params.order : "empty";

  const { scope } = await requireSecretariat();
  const result = await pollingUnits(scope, { q, page, perPage: PER_PAGE, order });

  if (!result) return <Empty>No territory is assigned to your seat.</Empty>;

  const href = (next) =>
    `/admin/polling-units?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(order !== "empty" ? { order } : {}),
      ...next,
    })}`;

  const empty = result.total - result.covered;

  return (
    <>
      <PageTitle
        title="Polling units"
        lead={`Every polling unit INEC lists in ${scope.label}, and who the movement has registered at each.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={MapPin} label="Polling units" value={result.total} sub="in your territory" />
        <StatTile
          icon={Users}
          label="With a member"
          value={result.covered}
          sub={`${result.coverage}% covered`}
        />
        <StatTile
          icon={CircleSlash}
          label="With nobody"
          value={empty}
          sub="no member on the register"
          tone="alert"
        />
      </div>

      <Card className="mt-4 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
            Polling unit coverage
          </p>
          <p className="text-[0.8125rem] text-content-subtle">
            {result.covered.toLocaleString()} of {result.total.toLocaleString()} units reached
          </p>
        </div>
        <Coverage value={result.coverage} className="mt-3" />
      </Card>

      {/* A plain GET form: it works with JavaScript disabled, and it makes the
          search shareable as a URL. */}
      <div className="mt-8 mb-6 flex flex-wrap items-center gap-3">
        <form method="get" className="flex min-w-64 flex-1 gap-2">
          {order !== "empty" && <input type="hidden" name="order" value={order} />}
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-400"
              aria-hidden="true"
            />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Polling unit, ward or INEC code"
              aria-label="Search polling units"
              className="h-12 w-full border-2 border-ink-200 bg-white pr-4 pl-11 text-[0.875rem] text-ink-950 focus:border-brand-600 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 border-2 border-ink-950 bg-ink-950 px-5 text-[0.75rem] font-bold tracking-[0.08em] text-white uppercase"
          >
            Search
          </button>
        </form>

        <div className="flex shrink-0 border border-ink-200">
          {ORDERS.map((option) => (
            <Link
              key={option.key}
              href={href({ order: option.key })}
              aria-current={option.key === order ? "true" : undefined}
              className={cn(
                "px-3.5 py-2.5 text-[0.6875rem] font-bold tracking-[0.08em] uppercase transition-colors",
                option.key === order ? "bg-ink-950 text-white" : "text-ink-500 hover:text-ink-950"
              )}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      <Table
        head={[
          { label: "Polling unit" },
          { label: "Ward" },
          { label: "INEC code" },
          { label: "Members", align: "right" },
        ]}
        empty={
          result.rows.length === 0 && (
            <Empty>
              {q
                ? `No polling unit in ${scope.label} matches “${q}”.`
                : `No polling units are listed for ${scope.label}.`}
            </Empty>
          )
        }
      >
        {result.rows.map((unit) => (
          <Row key={unit.id}>
            <Cell className="font-semibold">{unit.name}</Cell>
            <Cell className="text-content-muted">
              {unit.ward}
              <span className="block text-[0.75rem] text-ink-400">{unit.lga}</span>
            </Cell>
            <Cell className="text-content-muted tabular-nums">{unit.code}</Cell>
            <Cell align="right">
              {unit.members > 0 ? (
                <span className="font-bold text-ink-950">{unit.members.toLocaleString()}</span>
              ) : (
                <span className="text-ink-400">—</span>
              )}
            </Cell>
          </Row>
        ))}
      </Table>

      {result.pages > 1 && (
        <nav className="mt-6 flex items-center justify-between gap-4" aria-label="Pagination">
          <p className="text-[0.8125rem] text-content-subtle">
            Page {result.page.toLocaleString()} of {result.pages.toLocaleString()}
          </p>
          <div className="flex gap-2">
            {result.page > 1 && (
              <Link
                href={href({ page: String(result.page - 1) })}
                className="border-2 border-ink-950 px-4 py-2 text-[0.75rem] font-bold tracking-[0.08em] text-ink-950 uppercase"
              >
                Previous
              </Link>
            )}
            {result.page < result.pages && (
              <Link
                href={href({ page: String(result.page + 1) })}
                className="border-2 border-ink-950 bg-ink-950 px-4 py-2 text-[0.75rem] font-bold tracking-[0.08em] text-white uppercase"
              >
                Next
              </Link>
            )}
          </div>
        </nav>
      )}
    </>
  );
}
