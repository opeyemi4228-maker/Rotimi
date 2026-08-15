import Link from "next/link";
import {
  ArrowRight,
  CircleCheck,
  Crown,
  MapPin,
  Share2,
  TriangleAlert,
  UserPlus,
  Users,
} from "lucide-react";

import Avatar from "@/components/ui/Avatar";
import GrowthChart from "@/components/ui/GrowthChart";
import { requireSecretariat } from "@/lib/guard";
import { newestMembers, overview, ownSeats, pollingUnits, territory } from "@/lib/dashboard";
import { growthSeries, topRecruiters } from "@/lib/referrals";
import { cn } from "@/lib/utils";
import {
  Card,
  Coverage,
  Empty,
  SectionHead,
  StatTile,
  Table,
  Row,
  Cell,
  Tag,
} from "./ui";

export const dynamic = "force-dynamic";

const LEVEL_LABEL = { zone: "Zone", state: "State", lga: "LGA", ward: "Ward" };
const RANGES = [
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

/* Everything on this page is Nigerian local time, because everybody reading it
   is standing in Nigeria. */
const LAGOS = "Africa/Lagos";

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-NG", { hour: "numeric", hour12: false, timeZone: LAGOS }).format(
      new Date()
    )
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function AdminOverview({ searchParams }) {
  const { member, scope } = await requireSecretariat();
  const params = await searchParams;
  const days = RANGES.some((range) => String(range.days) === params?.range)
    ? Number(params.range)
    : 30;

  /* A Ward Coordinator has no tier beneath them, so the table every other tier
     fills with "the units under you" would be empty. They get the two things
     that ARE beneath them instead: the ten seats of their own ward, and the
     polling units they organise. A dashboard whose main table is blank tells
     the person at the bottom of the structure that the platform was built for
     everybody else. */
  const isWard = scope.scopeType === "WARD";

  const [stats, units, series, recruiters, seats, booths, newest] = await Promise.all([
    overview(scope),
    territory(scope),
    growthSeries({ scope, days }),
    topRecruiters(scope, { take: 5 }),
    isWard ? ownSeats(scope) : null,
    isWard ? pollingUnits(scope, { perPage: 12 }) : null,
    newestMembers(scope, { take: 6 }),
  ]);

  if (!stats) return <Empty>No territory is assigned to your seat.</Empty>;

  /* A unit whose coordinator seat is empty has nobody appointing beneath it,
     so it is the one gap that compounds. Counted from the table already loaded
     below rather than by a second query. */
  const leaderless = units?.rows.filter((row) => !row.coordinator).length ?? 0;
  const unitWord = units ? LEVEL_LABEL[units.level].toLowerCase() : "unit";
  const firstName = member.name.split(" ")[0];

  /* "13 people joined Federation" is not a sentence anybody writes. Every other
     scope names a place and reads correctly; the national one names the whole
     movement, so it is said that way. */
  const place = scope.scopeType === "NATION" ? "the movement" : scope.label;

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-10">
      <div className="min-w-0 space-y-8">
        {/* ── Greeting ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b-2 border-ink-950 pb-6">
          <div className="min-w-0">
            <h1 className="font-display text-fluid-2xl font-extrabold tracking-[-0.025em] text-ink-950">
              {greeting()}, {firstName}
            </h1>
            <p className="mt-2 text-[0.9375rem] leading-snug text-content-muted">
              {stats.growth > 0
                ? `${stats.recent.toLocaleString()} people joined ${place} in the last 30 days — ${stats.growth.toLocaleString()} more than the month before.`
                : stats.recent > 0
                  ? `${stats.recent.toLocaleString()} people joined ${place} in the last 30 days.`
                  : `Nobody has joined ${place} in the last 30 days.`}
            </p>
          </div>
          <p className="shrink-0 text-[0.8125rem] font-semibold text-content-subtle tabular-nums">
            {new Intl.DateTimeFormat("en-NG", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: LAGOS,
            }).format(new Date())}
          </p>
        </div>

        {/* ── The four figures ─────────────────────────────────────────── */}
        {/* Two across, not four. The rail on either side leaves this column
            about 700px on a laptop, and four tiles in it turned every label
            into a five-line tower. Four only once there is room for four. */}
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          <StatTile
            icon={Users}
            label="Members"
            value={stats.members}
            delta={stats.growth}
            sub={`${stats.recent.toLocaleString()} joined in 30 days`}
          />
          <StatTile
            icon={Share2}
            label="Through referrals"
            value={stats.referred}
            sub={`${stats.referredShare}% of the register`}
          />
          <StatTile
            icon={CircleCheck}
            label="Seats filled"
            value={stats.filled}
            sub={`of ${stats.seats.toLocaleString()} in your territory`}
          />
          {isWard ? (
            <StatTile
              icon={MapPin}
              label="Polling units covered"
              value={booths?.covered ?? 0}
              sub={`of ${(booths?.total ?? 0).toLocaleString()} in ${scope.unitName} — ${booths?.coverage ?? 0}%`}
            />
          ) : (
            <StatTile
              icon={TriangleAlert}
              label={`${unitWord}s with no coordinator`}
              value={leaderless}
              sub="nobody appointing beneath them"
              tone="alert"
            />
          )}
        </div>

        {/* §10.1 makes coverage the headline the secretariat manages towards.
            It is a bar and not a fifth tile because at eight seats in ninety
            thousand the number rounds to 0% and reads as a broken figure,
            where the bar reads correctly as "barely started". */}
        <Card className="p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
              Structure coverage
            </p>
            <p className="text-[0.8125rem] text-content-subtle">
              {stats.filled.toLocaleString()} of {stats.seats.toLocaleString()} seats held
            </p>
          </div>
          <Coverage value={stats.coverage} className="mt-3" />
        </Card>

        {leaderless > 0 && (
          <p className="flex items-start gap-3 border-l-4 border-red-600 bg-red-50 p-4 text-[0.875rem] leading-relaxed text-red-900">
            <TriangleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              {leaderless} {unitWord}
              {leaderless === 1 ? "" : "s"} in your territory{" "}
              {leaderless === 1 ? "has" : "have"} no coordinator. Until you
              appoint one, no seat beneath {leaderless === 1 ? "it" : "them"} can
              be filled.
            </span>
          </p>
        )}

        {/* ── Growth ───────────────────────────────────────────────────── */}
        <Card className="p-5 sm:p-6">
          <SectionHead
            title="Growth"
            lead={`Members of ${place}, and how many of them a member brought in.`}
            action={
              <div className="flex shrink-0 border border-ink-200">
                {RANGES.map((range) => (
                  <Link
                    key={range.days}
                    href={range.days === 30 ? "/admin" : `/admin?range=${range.days}`}
                    scroll={false}
                    aria-current={range.days === days ? "true" : undefined}
                    className={cn(
                      "px-3.5 py-2 text-[0.6875rem] font-bold tracking-[0.08em] uppercase transition-colors",
                      range.days === days
                        ? "bg-ink-950 text-white"
                        : "text-ink-500 hover:text-ink-950"
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

        {/* ── A ward's own seats ───────────────────────────────────────── */}
        {isWard && seats?.length > 0 && (
          <section>
            <SectionHead
              title={`The ten seats of ${scope.unitName}`}
              lead="Appendix C: a Ward Coordinator and nine Ward Officers. Filling them is the work this dashboard exists for."
              href="/admin/members"
              hrefLabel="Find someone to appoint"
            />
            <Table
              head={[{ label: "Seat" }, { label: "Held by" }, { label: "Status", align: "right" }]}
            >
              {seats.map((seat) => (
                <Row key={seat.id}>
                  <Cell className="font-semibold">
                    {seat.title}
                    {seat.seatIndex && (
                      <span className="ml-1.5 text-ink-400 tabular-nums">{seat.seatIndex}</span>
                    )}
                  </Cell>
                  <Cell>
                    {seat.holder ? (
                      <Link
                        href={`/admin/members/${seat.holder.id}`}
                        className="group flex items-center gap-3"
                      >
                        <Avatar
                          name={seat.holder.name}
                          src={seat.holder.photoUrl}
                          size="xs"
                          ring={false}
                        />
                        <span className="font-semibold group-hover:text-brand-700 group-hover:underline group-hover:underline-offset-2">
                          {seat.holder.name}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-ink-400">Nobody yet</span>
                    )}
                  </Cell>
                  <Cell align="right">
                    <Tag tone={seat.holder ? "filled" : "vacant"}>
                      {seat.holder ? "Filled" : "Vacant"}
                    </Tag>
                  </Cell>
                </Row>
              ))}
            </Table>
          </section>
        )}

        {/* ── A ward's polling units ───────────────────────────────────── */}
        {isWard && booths?.rows.length > 0 && (
          <section>
            <SectionHead
              title="Polling units with nobody registered"
              lead={`${booths.total - booths.covered} of ${booths.total} units in ${scope.unitName} have no member on the register. Emptiest first.`}
              href="/admin/polling-units"
              hrefLabel="All polling units"
            />
            <Table
              head={[
                { label: "Polling unit" },
                { label: "INEC code" },
                { label: "Members", align: "right" },
              ]}
            >
              {booths.rows.map((unit) => (
                <Row key={unit.id}>
                  <Cell className="font-semibold">{unit.name}</Cell>
                  <Cell className="text-content-muted tabular-nums">{unit.code}</Cell>
                  <Cell align="right">
                    {unit.members > 0 ? (
                      <span className="font-bold">{unit.members}</span>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </Cell>
                </Row>
              ))}
            </Table>
          </section>
        )}

        {/* ── The tier beneath ─────────────────────────────────────────── */}
        {units?.rows.length > 0 && (
          <section>
            <SectionHead
              title={`${LEVEL_LABEL[units.level]}s beneath you`}
              lead={`Weakest coverage first. ${units.rows.length.toLocaleString()} ${LEVEL_LABEL[units.level].toLowerCase()}${units.rows.length === 1 ? "" : "s"} in your territory.`}
              href="/admin/structure"
              hrefLabel="Full seat map"
            />
            <Table
              head={[
                { label: LEVEL_LABEL[units.level] },
                { label: "Coordinator" },
                { label: "Members", align: "right" },
                { label: "Seats", align: "right" },
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
      </div>

      {/* ── Rail ───────────────────────────────────────────────────────── */}
      <aside className="min-w-0 space-y-6 xl:sticky xl:top-10 xl:self-start">
        <Card className="p-6 text-center">
          <Avatar
            name={member.name}
            src={member.photoUrl}
            size="lg"
            className="mx-auto sm:size-24"
          />
          <p className="mt-4 font-display text-lg font-extrabold tracking-tight text-ink-950">
            {member.name}
          </p>
          <p className="mt-1 text-[0.8125rem] text-content-muted">{scope.roleTitle}</p>
          <p className="mt-3 inline-block border border-ink-200 px-3 py-1.5 text-[0.75rem] font-bold text-ink-700 tabular-nums">
            {member.membershipNo ?? member.phone}
          </p>
          <Link
            href="/portal"
            className="mt-5 flex items-center justify-center gap-2 border-2 border-ink-950 px-4 py-2.5 text-[0.6875rem] font-bold tracking-[0.08em] text-ink-950 uppercase transition-colors hover:bg-ink-950 hover:text-white"
          >
            Your membership
            <ArrowRight size={14} strokeWidth={3} />
          </Link>
        </Card>

        {/* Their own code, on the dashboard they use every day. A coordinator
            asking their ward to recruit while never handing out their own code
            is the gap this closes. */}
        {member.referralCode && (
          <Card className="border-2 border-ink-950 p-6">
            <p className="text-[0.625rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
              Your referral code
            </p>
            <p className="mt-2.5 font-display text-2xl font-extrabold tracking-[0.16em] text-ink-950 tabular-nums">
              {member.referralCode}
            </p>
            <p className="mt-2 text-[0.8125rem] leading-snug text-content-muted">
              Everyone who registers with it is credited to you and appears on
              your membership page.
            </p>
            <Link
              href="/portal#referrals"
              className="mt-4 flex items-center gap-1.5 text-[0.6875rem] font-bold tracking-[0.08em] text-brand-700 uppercase hover:text-ember-600"
            >
              Who you have brought in
              <ArrowRight size={13} strokeWidth={3} />
            </Link>
          </Card>
        )}

        {/* ── Who has just joined ──────────────────────────────────────
            The reference this page is modelled on puts a chat feed here. MAP
            has no messaging, and a panel of invented activity would be worse
            than an empty one — so the rail carries the register's own
            activity instead: the last six people to walk in. */}
        <Card className="p-6">
          <div className="flex items-center gap-2.5">
            <UserPlus size={15} className="text-brand-600" aria-hidden="true" />
            <p className="text-[0.625rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
              Just joined
            </p>
          </div>

          {newest.length ? (
            <ul className="mt-5 space-y-4">
              {newest.map((person) => (
                <li key={person.id}>
                  <Link
                    href={`/admin/members/${person.id}`}
                    className="group flex items-start gap-3"
                  >
                    <Avatar name={person.name} src={person.photoUrl} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.875rem] font-bold text-ink-950 group-hover:text-brand-700">
                        {person.name}
                      </span>
                      <span className="block truncate text-[0.75rem] text-content-subtle">
                        {person.ward}
                        {person.invitedBy && ` · invited by ${person.invitedBy}`}
                      </span>
                    </span>
                    <time
                      dateTime={person.joinedAt}
                      className="shrink-0 text-[0.6875rem] font-semibold text-ink-400 tabular-nums"
                    >
                      {new Intl.DateTimeFormat("en-NG", {
                        day: "numeric",
                        month: "short",
                        timeZone: LAGOS,
                      }).format(new Date(person.joinedAt))}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[0.8125rem] leading-relaxed text-content-subtle">
              Nobody has registered in {scope.unitName} yet.
            </p>
          )}

          <Link
            href="/admin/members"
            className="mt-6 flex items-center gap-1.5 border-t border-ink-200 pt-4 text-[0.6875rem] font-bold tracking-[0.08em] text-brand-700 uppercase hover:text-ember-600"
          >
            The whole register
            <ArrowRight size={13} strokeWidth={3} />
          </Link>
        </Card>

        {/* ── Who is actually recruiting ───────────────────────────────── */}
        <Card className="p-6">
          <div className="flex items-center gap-2.5">
            <Crown size={15} className="text-ember-600" aria-hidden="true" />
            <p className="text-[0.625rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
              Bringing in the most
            </p>
          </div>

          {recruiters?.length ? (
            <ul className="mt-5 space-y-4">
              {recruiters.map((person, index) => (
                <li key={person.id}>
                  <Link
                    href={`/admin/members/${person.id}`}
                    className="group flex items-center gap-3"
                  >
                    <span className="w-4 shrink-0 font-display text-[0.75rem] font-extrabold text-ink-400 tabular-nums">
                      {index + 1}
                    </span>
                    <Avatar name={person.name} src={person.photoUrl} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.875rem] font-bold text-ink-950 group-hover:text-brand-700">
                        {person.name}
                      </span>
                      <span className="block truncate text-[0.75rem] text-content-subtle">
                        {person.ward}, {person.lga}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-display text-[0.9375rem] font-extrabold text-ink-950 tabular-nums">
                        {person.referrals.toLocaleString()}
                      </span>
                      <span className="block text-[0.625rem] font-bold tracking-[0.06em] text-ink-400 uppercase">
                        brought in
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[0.8125rem] leading-relaxed text-content-subtle">
              Nobody in {scope.label} has registered a referral yet. Every member
              has a code from the day they join — the register grows fastest
              where coordinators hand theirs out.
            </p>
          )}

          <Link
            href="/admin/referrals"
            className="mt-6 flex items-center gap-1.5 border-t border-ink-200 pt-4 text-[0.6875rem] font-bold tracking-[0.08em] text-brand-700 uppercase hover:text-ember-600"
          >
            All referrals
            <ArrowRight size={13} strokeWidth={3} />
          </Link>
        </Card>
      </aside>
    </div>
  );
}
