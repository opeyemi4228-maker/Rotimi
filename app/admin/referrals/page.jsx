import Link from "next/link";
import { Share2, TrendingUp, UserPlus, Users } from "lucide-react";

import Avatar from "@/components/ui/Avatar";
import GrowthChart from "@/components/ui/GrowthChart";
import { currentSession } from "@/lib/session";
import { overview } from "@/lib/dashboard";
import { growthSeries, topRecruiters } from "@/lib/referrals";
import { cn } from "@/lib/utils";
import { Card, Empty, PageTitle, SectionHead, StatTile, Table, Row, Cell } from "../ui";

export const dynamic = "force-dynamic";

const RANGES = [
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

/**
 * Recruiting, as a coordinator's own page.
 *
 * §10.1 gives a coordinator coverage and vacancies — both facts about the
 * structure. This is the other half: whether the movement in their territory is
 * growing, and which members are doing the growing. It is the one page here
 * that reports on work the coordinator can start this afternoon.
 */
export default async function ReferralsPage({ searchParams }) {
  const params = await searchParams;
  const days = RANGES.some((range) => String(range.days) === params?.range)
    ? Number(params.range)
    : 30;

  const { scope } = await currentSession();
  const [stats, series, recruiters] = await Promise.all([
    overview(scope),
    growthSeries({ scope, days }),
    topRecruiters(scope, { take: 25 }),
  ]);

  if (!stats) return <Empty>No territory is assigned to your seat.</Empty>;

  const direct = stats.members - stats.referred;

  return (
    <>
      <PageTitle
        title="Referrals"
        lead={`How ${scope.label} is growing, and who is growing it. Every member has a permanent code from the day they register.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <StatTile icon={Users} label="Members" value={stats.members} delta={stats.growth} />
        <StatTile
          icon={Share2}
          label="Through referrals"
          value={stats.referred}
          sub={`${stats.referredShare}% of the register`}
        />
        <StatTile
          icon={UserPlus}
          label="Registered directly"
          value={direct}
          sub="nobody is credited for them"
        />
        <StatTile
          icon={TrendingUp}
          label="Referred this month"
          value={stats.referredRecent}
          sub={`of ${stats.recent.toLocaleString()} who joined`}
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
                  href={range.days === 30 ? "/admin/referrals" : `/admin/referrals?range=${range.days}`}
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

      <section className="mt-10">
        <SectionHead
          title="Who is bringing people in"
          lead={`Members of ${scope.label}, ranked by how many people have registered with their code.`}
        />

        {recruiters?.length ? (
          <Table
            head={[
              { label: "", key: "rank" },
              { label: "Member" },
              { label: "Code" },
              { label: "Ward" },
              { label: "Brought in", align: "right" },
            ]}
          >
            {recruiters.map((person, index) => (
              <Row key={person.id}>
                <Cell className="w-10 text-ink-400 tabular-nums">{index + 1}</Cell>
                <Cell>
                  <Link
                    href={`/admin/members/${person.id}`}
                    className="group flex items-center gap-3"
                  >
                    <Avatar name={person.name} src={person.photoUrl} size="xs" ring={false} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold group-hover:text-brand-700 group-hover:underline group-hover:underline-offset-2">
                        {person.name}
                      </span>
                      <span className="block truncate text-[0.75rem] text-ink-400 tabular-nums">
                        {person.membershipNo ?? "Number not yet issued"}
                      </span>
                    </span>
                  </Link>
                </Cell>
                <Cell className="font-bold tracking-[0.12em] text-content-muted tabular-nums">
                  {person.referralCode ?? "—"}
                </Cell>
                <Cell className="text-content-muted">
                  {person.ward}
                  <span className="block text-[0.75rem] text-ink-400">
                    {person.lga}, {person.state}
                  </span>
                </Cell>
                <Cell align="right">
                  <span className="font-display text-[1.0625rem] font-extrabold text-ink-950">
                    {person.referrals.toLocaleString()}
                  </span>
                </Cell>
              </Row>
            ))}
          </Table>
        ) : (
          <Card>
            <Empty>
              Nobody in {scope.label} has registered a referral yet. Every member
              holds a code from the day they join, and the fastest thing a
              coordinator can do about this page is hand out their own.
            </Empty>
          </Card>
        )}
      </section>
    </>
  );
}
