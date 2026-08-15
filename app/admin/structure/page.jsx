import { requireSecretariat } from "@/lib/guard";
import { structure, territory } from "@/lib/dashboard";
import { PageTitle, Coverage, Table, Row, Cell, Empty, Stat } from "../ui";

export const dynamic = "force-dynamic";

const TIER_LABEL = {
  NATIONAL: "National",
  ZONAL: "Zonal",
  STATE: "State",
  LGA: "LGA",
  WARD: "Ward",
};

const LEVEL_LABEL = { zone: "Zone", state: "State", lga: "LGA", ward: "Ward" };

export default async function StructurePage() {
  const { scope } = await requireSecretariat();
  const [tiers, units] = await Promise.all([structure(scope), territory(scope)]);

  if (!tiers) return <Empty>No territory is assigned to your seat.</Empty>;

  const total = tiers.reduce((n, t) => n + t.seats, 0);
  const filled = tiers.reduce((n, t) => n + t.filled, 0);

  return (
    <>
      <PageTitle
        title="Structure"
        lead={`Every seat in ${scope.label}, filled or vacant. Seats exist as records whether or not anyone holds them, so a vacancy is a fact to be read rather than an absence to be inferred.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Seats in scope" value={total} />
        <Stat label="Held" value={filled} sub={`${total - filled} vacant`} />
        <Stat
          label="Coverage"
          value={`${total ? Math.round((filled / total) * 100) : 0}%`}
        />
      </div>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-lg font-extrabold tracking-tight text-ink-950">
          By tier
        </h2>
        <Table
          head={[
            { label: "Tier" },
            { label: "Seats", align: "right" },
            { label: "Held", align: "right" },
            { label: "Vacant", align: "right" },
            { label: "Coverage" },
          ]}
        >
          {tiers.map((row) => (
            <Row key={row.tier}>
              <Cell className="font-semibold">{TIER_LABEL[row.tier]}</Cell>
              <Cell align="right">{row.seats.toLocaleString()}</Cell>
              <Cell align="right">{row.filled.toLocaleString()}</Cell>
              <Cell align="right" className={row.vacant ? "text-ink-950" : "text-ink-400"}>
                {row.vacant.toLocaleString()}
              </Cell>
              <Cell>
                <Coverage value={row.coverage} />
              </Cell>
            </Row>
          ))}
        </Table>
      </section>

      {units?.rows.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-1 font-display text-lg font-extrabold tracking-tight text-ink-950">
            By {LEVEL_LABEL[units.level].toLowerCase()}
          </h2>
          <p className="mb-4 text-[0.8125rem] text-content-muted">
            Weakest first — the {LEVEL_LABEL[units.level].toLowerCase()}s at the top are
            where the structure needs building.
          </p>
          <Table
            head={[
              { label: LEVEL_LABEL[units.level] },
              { label: "Coordinator" },
              { label: "Members", align: "right" },
              { label: "Held", align: "right" },
              { label: "Coverage" },
            ]}
          >
            {units.rows.map((row) => (
              <Row key={row.id}>
                <Cell className="font-semibold">{row.name}</Cell>
                <Cell className={row.coordinator ? "" : "text-ink-400"}>
                  {row.coordinator ?? "Vacant"}
                </Cell>
                <Cell align="right">{row.members.toLocaleString()}</Cell>
                <Cell align="right">
                  {row.filled.toLocaleString()}
                  <span className="text-ink-400"> / {row.seats.toLocaleString()}</span>
                </Cell>
                <Cell>
                  <Coverage value={row.coverage} />
                </Cell>
              </Row>
            ))}
          </Table>
        </section>
      )}
    </>
  );
}
