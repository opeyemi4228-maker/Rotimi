import Link from "next/link";
import { ArrowRight, TriangleAlert } from "lucide-react";

import Avatar from "@/components/ui/Avatar";
import { currentSession } from "@/lib/session";
import { leadership } from "@/lib/dashboard";
import { Card, Empty, PageTitle, StatTile, Table, Row, Cell, Tag } from "../ui";
import { UserCheck, UserX, Users } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * The LGA executive across the territory — the one tier a State Coordinator
 * spends most of their week on.
 *
 * It is its own page rather than a filter on the directory because that is how
 * the work is actually organised: "which of my LGAs still has no coordinator"
 * is a question asked on its own, repeatedly, and it should not require
 * remembering which dropdown to set.
 *
 * Vacancies lead. A page that lists only the people who exist hides the thing
 * the movement most needs to see.
 */
export default async function LgaCoordinatorsPage() {
  const { scope } = await currentSession();
  const seats = await leadership(scope, { tier: "LGA" });

  if (!seats) return <Empty>No territory is assigned to your seat.</Empty>;

  /* Appendix B gives every LGA a five-person executive. The coordinator is the
     office that appoints the ward tier beneath, so it is the one whose vacancy
     compounds — it gets the table, and the other four are counted beside it. */
  const coordinators = seats.filter((seat) => seat.roleCode === "LG_COORD");
  const others = seats.filter((seat) => seat.roleCode !== "LG_COORD");

  const filled = coordinators.filter((seat) => seat.holder).length;
  const vacant = coordinators.length - filled;

  // Vacancies first, then alphabetically by LGA.
  const rows = [...coordinators].sort(
    (a, b) =>
      Number(Boolean(a.holder)) - Number(Boolean(b.holder)) ||
      a.scope.localeCompare(b.scope, "en")
  );

  return (
    <>
      <PageTitle
        title="LGA Coordinators"
        lead={`The Local Government Area executive across ${scope.label}. Until an LGA has a coordinator, no ward seat beneath it can be filled.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          icon={Users}
          label="LGAs in your territory"
          value={coordinators.length}
          sub="one coordinator each"
        />
        <StatTile icon={UserCheck} label="With a coordinator" value={filled} sub="appointed and active" />
        <StatTile
          icon={UserX}
          label="Still vacant"
          value={vacant}
          sub="nobody appointing wards beneath"
          tone="alert"
        />
      </div>

      {vacant > 0 && (
        <p className="mt-4 flex items-start gap-3 border-l-4 border-red-600 bg-red-50 p-4 text-[0.875rem] leading-relaxed text-red-900">
          <TriangleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            {vacant} of {coordinators.length} LGAs have no coordinator. Each one
            is ten ward seats × its wards that cannot be filled until somebody
            holds it.
          </span>
        </p>
      )}

      <div className="mt-8">
        <Table
          head={[
            { label: "LGA" },
            { label: "Coordinator" },
            { label: "Membership no." },
            { label: "Status", align: "right" },
          ]}
          empty={
            rows.length === 0 && (
              <Empty>
                No LGA sits beneath {scope.label}. This page is for the tiers
                above LGA level.
              </Empty>
            )
          }
        >
          {rows.map((seat) => (
            <Row key={seat.id}>
              <Cell className="font-semibold">{seat.scope}</Cell>
              <Cell>
                {seat.holder ? (
                  <Link
                    href={`/admin/members/${seat.holder.id}`}
                    className="group flex items-center gap-3"
                  >
                    <Avatar name={seat.holder.name} src={seat.holder.photoUrl} size="xs" ring={false} />
                    <span className="font-semibold group-hover:text-brand-700 group-hover:underline group-hover:underline-offset-2">
                      {seat.holder.name}
                    </span>
                  </Link>
                ) : (
                  <span className="text-ink-400">Nobody yet</span>
                )}
              </Cell>
              <Cell className="text-content-muted tabular-nums">
                {seat.holder?.membershipNo ?? <span className="text-ink-400">—</span>}
              </Cell>
              <Cell align="right">
                <Tag tone={seat.holder ? "filled" : "vacant"}>
                  {seat.holder ? "Filled" : "Vacant"}
                </Tag>
              </Cell>
            </Row>
          ))}
        </Table>
      </div>

      {others.length > 0 && (
        <Card className="mt-6 p-5">
          <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
            The rest of the LGA executive
          </p>
          <p className="mt-2 text-[0.875rem] leading-relaxed text-content-muted">
            {others.filter((seat) => seat.holder).length.toLocaleString()} of{" "}
            {others.length.toLocaleString()} other LGA seats are held — secretary,
            organising, publicity and treasurer, across every LGA in{" "}
            {scope.label}.
          </p>
          <Link
            href="/admin/leadership?tier=LGA"
            className="mt-4 flex items-center gap-1.5 text-[0.6875rem] font-bold tracking-[0.08em] text-brand-700 uppercase hover:text-ember-600"
          >
            See every LGA seat
            <ArrowRight size={13} strokeWidth={3} />
          </Link>
        </Card>
      )}
    </>
  );
}
