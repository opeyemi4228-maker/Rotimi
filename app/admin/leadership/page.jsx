import Link from "next/link";

import Avatar from "@/components/ui/Avatar";
import { requireSecretariat } from "@/lib/guard";
import { leadership } from "@/lib/dashboard";
import { PageTitle, Table, Row, Cell, Empty, Tag } from "../ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TIERS = [
  { key: "NATIONAL", label: "National" },
  { key: "ZONAL", label: "Zonal" },
  { key: "STATE", label: "State" },
  { key: "LGA", label: "LGA" },
  { key: "WARD", label: "Ward" },
];

export default async function LeadershipPage({ searchParams }) {
  const params = await searchParams;
  const tier = TIERS.some((t) => t.key === params?.tier) ? params.tier : null;

  const { scope } = await requireSecretariat();
  const seats = await leadership(scope, { tier });

  if (!seats) return <Empty>No territory is assigned to your seat.</Empty>;

  const held = seats.filter((s) => s.holder).length;

  return (
    <>
      <PageTitle
        title="Leadership"
        lead={`Who holds office in ${scope.label}. Vacant seats are listed too — a leadership page that shows only the people who exist hides the thing the movement most needs to see.`}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <TierLink href="/admin/leadership" active={!tier}>
          All tiers
        </TierLink>
        {TIERS.map((t) => (
          <TierLink
            key={t.key}
            href={`/admin/leadership?tier=${t.key}`}
            active={tier === t.key}
          >
            {t.label}
          </TierLink>
        ))}
        <p className="ml-auto text-[0.8125rem] text-content-subtle">
          {held} of {seats.length} shown seats held
        </p>
      </div>

      <Table
        head={[
          { label: "Office" },
          { label: "Territory" },
          { label: "Holder" },
          { label: "Since" },
          { label: "Seat" },
        ]}
        empty={seats.length === 0 && <Empty>No seats at this tier in your territory.</Empty>}
      >
        {seats.map((seat) => (
          <Row key={seat.id}>
            <Cell>
              <span className="font-semibold">{seat.title}</span>
              {/* §6.10: functional offices read nationwide but appoint nobody.
                  Marking them stops anyone wondering why the Director of
                  Mobilization has no appoint button. */}
              <span className="mt-1 flex flex-wrap gap-1.5">
                {seat.isAdmin && <Tag tone="admin">Admin</Tag>}
                {seat.isFunctional && <Tag tone="functional">Functional</Tag>}
              </span>
            </Cell>
            <Cell className="text-content-muted">{seat.scope}</Cell>
            <Cell>
              {seat.holder ? (
                <span className="flex items-center gap-3">
                  <Avatar name={seat.holder.name} src={seat.holder.photoUrl} size="sm" />
                  <span className="min-w-0">
                    <span className="block font-semibold">{seat.holder.name}</span>
                    <span className="block text-[0.75rem] tabular-nums text-ink-400">
                      {seat.holder.membershipNo ?? seat.holder.phone}
                    </span>
                  </span>
                </span>
              ) : (
                <span className="text-ink-400">Vacant</span>
              )}
            </Cell>
            <Cell className="tabular-nums text-content-muted">
              {seat.holder
                ? new Date(seat.holder.since).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </Cell>
            <Cell>
              <Tag tone={seat.status === "FILLED" ? "filled" : "vacant"}>
                {seat.status === "FILLED" ? "Filled" : "Vacant"}
              </Tag>
            </Cell>
          </Row>
        ))}
      </Table>

      {/* The ward tier alone is 88,130 seats; the query caps at 500 rather
          than trying to paint them. §10.2 routes ward detail through the
          territory table instead. */}
      {seats.length >= 500 && (
        <p className="mt-4 text-[0.8125rem] leading-relaxed text-content-subtle">
          Showing the first 500 seats. Ward seats number in the tens of thousands
          — use{" "}
          <Link href="/admin/structure" className="font-bold text-brand-700 underline underline-offset-2">
            Structure
          </Link>{" "}
          for coverage by tier, or the territory table on{" "}
          <Link href="/admin" className="font-bold text-brand-700 underline underline-offset-2">
            Overview
          </Link>{" "}
          to drill down.
        </p>
      )}
    </>
  );
}

function TierLink({ href, active, children }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "border-2 px-3.5 py-2 text-[0.75rem] font-bold tracking-[0.08em] uppercase transition-colors",
        active
          ? "border-ink-950 bg-ink-950 text-white"
          : "border-ink-200 bg-white text-ink-600 hover:border-ink-950 hover:text-ink-950"
      )}
    >
      {children}
    </Link>
  );
}
