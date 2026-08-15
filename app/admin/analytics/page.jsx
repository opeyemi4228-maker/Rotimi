import Link from "next/link";
import { BadgeCheck, Share2, TrendingUp, Users } from "lucide-react";

import GrowthChart from "@/components/ui/GrowthChart";
import { requireSecretariat } from "@/lib/guard";
import { overview, territory, verificationSplit } from "@/lib/dashboard";
import { growthSeries } from "@/lib/referrals";
import { cn } from "@/lib/utils";
import { Card, Coverage, Empty, PageTitle, SectionHead, StatTile, Table, Row, Cell } from "../ui";

export const dynamic = "force-dynamic";

const LEVEL_LABEL = { zone: "Zone", state: "State", lga: "LGA", ward: "Ward" };
/* "LGA" is an abbreviation, so it does not lowercase with the others: the
   heading has to read "Strongest LGAs", not "Strongest lgas". */
const LEVEL_PLURAL = { zone: "zones", state: "states", lga: "LGAs", ward: "wards" };
const RANGES = [
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

/**
 * The territory read as numbers rather than as a list.
 *
 * Everything here is derived from the register — there is no analytics
 * pipeline, no event stream, and nothing is modelled or projected. Four
 * questions, in the order a coordinator asks them: how fast is it growing,
 * how much of that is the movement recruiting itself, how much of the register
 * is verified, and which units are carrying it.
 */
export default async function AnalyticsPage({ searchParams }) {
  const params = await searchParams;
  const days = RANGES.some((range) => String(range.days) === params?.range)
    ? Number(params.range)
    : 90;

  const { scope } = await requireSecretariat();
  const [stats, series, units, verification] = await Promise.all([
    overview(scope),
    growthSeries({ scope, days }),
    territory(scope),
    verificationSplit(scope),
  ]);

  if (!stats) return <Empty>No territory is assigned to your seat.</Empty>;

  // Everyone who joined inside the window, counted from the series itself.
  const joinedInWindow = series.reduce((total, point) => total + point.joined, 0);

  // Strongest first here, unlike the dashboard: this page is the read, not the
  // to-do list, and the question it answers is "who is carrying this".
  const strongest = units ? [...units.rows].sort((a, b) => b.members - a.members).slice(0, 10) : [];
  const mostMembers = strongest[0]?.members ?? 0;

  return (
    <>
      <PageTitle
        title="Analytics"
        lead={`Everything on this page is counted from the register of ${scope.label} at the moment you loaded it. Nothing is estimated.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <StatTile
          icon={Users}
          label="Members"
          value={stats.members}
          delta={stats.growth}
          sub={`${stats.recent.toLocaleString()} joined in 30 days`}
        />
        {/* A count, not a rate. "0.0 a day" is what a rate becomes at the
            volume a new ward actually registers at, and it reads as though
            nothing is happening when four people just joined. */}
        <StatTile
          icon={TrendingUp}
          label={`Joined in ${days} days`}
          value={joinedInWindow}
          sub={`${Math.round((joinedInWindow / days) * 7).toLocaleString()} a week on average`}
        />
        <StatTile
          icon={Share2}
          label="Referral share"
          value={`${stats.referredShare}%`}
          sub={`${stats.referred.toLocaleString()} invited by a member`}
        />
        <StatTile
          icon={BadgeCheck}
          label="Verified"
          value={verification.verified}
          sub={`${verification.verifiedShare}% of the register`}
        />
      </div>

      <Card className="mt-8 p-5 sm:p-6">
        <SectionHead
          title="Growth"
          lead="Both lines count members, so the gap between them is the movement's own recruiting."
          action={
            <div className="flex shrink-0 border border-ink-200">
              {RANGES.map((range) => (
                <Link
                  key={range.days}
                  href={range.days === 90 ? "/admin/analytics" : `/admin/analytics?range=${range.days}`}
                  scroll={false}
                  aria-current={range.days === days ? "true" : undefined}
                  className={cn(
                    "px-3.5 py-2 text-[0.6875rem] font-bold tracking-[0.08em] uppercase transition-colors",
                    range.days === days ? "bg-ink-950 text-white" : "text-ink-500 hover:text-ink-950"
                  )}
                >
                  {range.label}
                </Link>
              ))}
            </div>
          }
        />
        <GrowthChart
          data={series}
          caption={`Membership of ${scope.label} over the last ${days} days, with the number who joined through a referral`}
        />
      </Card>

      {/* ── Verification ─────────────────────────────────────────────────── */}
      <section className="mt-10">
        <SectionHead
          title="Verification"
          lead="§7.2: only a verified member may hold office at LGA level and above, so this figure is the ceiling on how much of the structure can be filled."
        />
        <Card className="p-5 sm:p-6">
          <dl className="grid gap-6 sm:grid-cols-3">
            {[
              ["Verified", verification.verified, verification.verifiedShare, "bg-brand-600"],
              ["Pending", verification.pending, verification.pendingShare, "bg-ember-500"],
              ["Rejected", verification.rejected, verification.rejectedShare, "bg-red-600"],
            ].map(([label, value, share, colour]) => (
              <div key={label}>
                <dt className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                  {label}
                </dt>
                <dd className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-ink-950 tabular-nums">
                  {value.toLocaleString()}
                  <span className="ml-2 text-[0.875rem] font-bold text-content-subtle">
                    {share}%
                  </span>
                </dd>
                <div className="mt-3 h-1.5 w-full bg-ink-200">
                  <div
                    className={cn("h-full", colour)}
                    style={{ width: `${Math.max(share, share > 0 ? 2 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </dl>
        </Card>
      </section>

      {/* ── Where the members are ────────────────────────────────────────── */}
      {strongest.length > 0 && (
        <section className="mt-10">
          <SectionHead
            title={`Strongest ${LEVEL_PLURAL[units.level]}`}
            lead="By registered members. The dashboard sorts the same list the other way up, because that one is the work and this one is the read."
            href="/admin"
            hrefLabel="Weakest first"
          />
          <Table
            head={[
              { label: LEVEL_LABEL[units.level] },
              { label: "Members", align: "right" },
              { label: "Against the strongest" },
              { label: "Seats", align: "right" },
            ]}
          >
            {strongest.map((row) => (
              <Row key={row.id}>
                <Cell className="font-semibold">{row.name}</Cell>
                <Cell align="right">{row.members.toLocaleString()}</Cell>
                <Cell>
                  {/* Scaled against the biggest unit, not against the whole
                      register: at 774 LGAs every true share is a rounding
                      error and every bar would be invisible. The column is
                      named for what it actually shows. */}
                  <Coverage
                    value={mostMembers ? Math.round((row.members / mostMembers) * 100) : 0}
                  />
                </Cell>
                <Cell align="right">
                  {row.filled.toLocaleString()}
                  <span className="text-ink-400"> / {row.seats.toLocaleString()}</span>
                </Cell>
              </Row>
            ))}
          </Table>
        </section>
      )}
    </>
  );
}
