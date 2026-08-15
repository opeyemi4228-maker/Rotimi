import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  CircleAlert,
  CircleCheck,
  Database,
  Download,
  MapPin,
  MessageSquare,
  ScrollText,
  ShieldCheck,
  Share2,
  UserCheck,
  Users,
  Vote,
} from "lucide-react";

import GrowthChart from "@/components/ui/GrowthChart";
import { requireSecretariat } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { growthSeries } from "@/lib/referrals";
import {
  accountSnapshot,
  auditFeed,
  broadcastSnapshot,
  coverage,
  electionSnapshot,
  growthByDay,
  integrity,
  latestMembers,
  leaderboard,
  referralSnapshot,
  registerSnapshot,
  stateTable,
  structureSnapshot,
  tableSizes,
  topVacancies,
} from "@/lib/console";
import { cn } from "@/lib/utils";
import { Card, Cell, Coverage, Empty, PageTitle, Row, SectionHead, StatTile, Table, Tag } from "../ui";
import { Anchor, DailyBars, Facts, Proportion } from "./ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Console — MAP Secretariat",
  robots: { index: false, follow: false },
};

const LAGOS = "Africa/Lagos";

const when = (value) =>
  value
    ? new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: LAGOS,
      }).format(new Date(value))
    : "—";

const day = (value) =>
  value
    ? new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: LAGOS,
      }).format(new Date(value))
    : "—";

function size(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value >= 10 ? Math.round(value) : Math.round(value * 10) / 10} ${units[index]}`;
}

const SECTIONS = [
  { id: "register", label: "Register" },
  { id: "integrity", label: "Integrity" },
  { id: "coverage", label: "Coverage" },
  { id: "states", label: "States" },
  { id: "structure", label: "Structure" },
  { id: "election", label: "Election" },
  { id: "referrals", label: "Referrals" },
  { id: "broadcasts", label: "Broadcasts" },
  { id: "accounts", label: "Accounts" },
  { id: "audit", label: "Audit" },
  { id: "storage", label: "Storage" },
];

const EXPORTS = [
  { key: "members", label: "Members" },
  { key: "states", label: "State summary" },
  { key: "seats", label: "Seats & holders" },
  { key: "returns", label: "Election returns" },
  { key: "referrals", label: "Referrals" },
  { key: "audit", label: "Audit log" },
];

/**
 * The administrator's console.
 *
 * ── WHO SEES THIS ──────────────────────────────────────────────────────────
 * Only a scope that reads nationwide, which by §6.11 is every national-tier
 * office — the National Coordinator, the two Assistant Coordinators, and the
 * functional directors, who read everywhere and appoint nobody.
 *
 * Everybody else gets a 404 rather than a refusal, because a page that says
 * "you are not allowed" has confirmed the page exists, and the whole point of
 * this one is that it has no scope filter on any query in it. A member holding
 * no seat at all never reaches the check: the admin layout stops them first
 * with a plain explanation, which is the right answer for somebody who has done
 * nothing wrong.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * ── WHY IT IS ONE LONG PAGE AND NOT SIX TABS ───────────────────────────────
 * Because the question this page answers is "is anything wrong", and that
 * question is not answerable one tab at a time. A tabbed console hides the
 * failing check behind the tab nobody clicked. The jump-list at the top gives
 * the same navigation without the hiding, and the failing checks are hoisted to
 * the second block so they are the first thing after the headline figures.
 * ───────────────────────────────────────────────────────────────────────────
 */
export default async function ConsolePage() {
  const { scope } = await requireSecretariat();

  if (!scope || !(scope.isSuperAdmin || can(scope, "viewNationwide"))) notFound();

  const [
    register,
    reach,
    states,
    structure,
    vacancies,
    elections,
    referrals,
    accounts,
    problems,
    audit,
    tables,
    newest,
    recruiters,
    daily,
    series,
    sms,
  ] = await Promise.all([
    registerSnapshot(),
    coverage(),
    stateTable(),
    structureSnapshot(),
    topVacancies(10),
    electionSnapshot(),
    referralSnapshot(),
    accountSnapshot(),
    integrity(),
    auditFeed(20),
    tableSizes(),
    latestMembers(8),
    leaderboard(8),
    growthByDay(90),
    growthSeries({ scope, days: 90 }),
    broadcastSnapshot(10),
  ]);

  const failing = problems.failing;
  const totalRows = tables.reduce((sum, table) => sum + table.rows, 0);
  const totalBytes = tables.reduce((sum, table) => sum + table.bytes, 0);
  const openElections = elections.filter((election) => election.status === "OPEN");

  return (
    <div className="space-y-12">
      <PageTitle
        title="Console"
        lead="Everything the platform holds, unscoped: the register, the structure, the returns, the accounts and the audit trail. This is the only page in the secretariat with no territory filter on it."
        action={
          <p className="text-[0.75rem] text-content-subtle tabular-nums">
            Read {when(new Date())} · {totalRows.toLocaleString()} rows · {size(totalBytes)}
          </p>
        }
      />

      {/* Jump list. The page is deliberately long; this is how it stays usable. */}
      <nav aria-label="Console sections" className="-mt-6 flex flex-wrap gap-px bg-ink-200">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="bg-white px-4 py-2.5 text-[0.6875rem] font-bold tracking-widest text-ink-600 uppercase transition-colors hover:bg-ink-950 hover:text-white"
          >
            {section.label}
          </a>
        ))}
      </nav>

      {/* ───────────────────────────────────────────────────────── register */}
      <Anchor id="register">
        <SectionHead
          title="The register"
          lead={`Since ${day(register.firstJoined)}. Every member the platform has, counted every way somebody is likely to ask.`}
        />

        <div className="grid gap-px bg-ink-200 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            icon={Users}
            label="Members"
            value={register.total}
            delta={register.growth}
            sub={`${register.today.toLocaleString()} today · ${register.week.toLocaleString()} this week · ${register.month.toLocaleString()} in 30 days`}
          />
          <StatTile
            icon={CircleCheck}
            label="Verified"
            value={register.verified}
            sub={`${register.verifiedShare}% of the register · ${register.pending.toLocaleString()} still pending`}
          />
          <StatTile
            icon={Share2}
            label="Brought in by a member"
            value={register.referred}
            sub={`${register.referredShare}% of the register arrived through a referral code`}
          />
          <StatTile
            icon={MapPin}
            label="Polling unit on file"
            value={register.withUnit}
            sub={`${register.total - register.withUnit} members cannot yet be matched to a booth`}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="p-6">
            <SectionHead
              title="Ninety days"
              lead="Cumulative members, and how many of them were brought in by somebody already here."
            />
            {series ? (
              <GrowthChart data={series} />
            ) : (
              <Empty>No growth data yet.</Empty>
            )}
            <div className="mt-8">
              <p className="mb-3 text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                Registrations per day
              </p>
              <DailyBars data={daily} />
            </div>
          </Card>

          <div className="space-y-6">
            <Facts
              rows={[
                { label: "Membership numbers issued", value: register.numbered },
                { label: "Photographs on file", value: register.photographed, note: `${register.photoShare}%` },
                { label: "Referral codes issued", value: register.coded },
                { label: "Voter card number held", value: register.withVin },
                { label: "NIN held", value: register.withNin },
                { label: "Date of birth given", value: register.withDob },
                { label: "Rejected", value: register.rejected, tone: "alert" },
              ]}
            />
            <Facts
              rows={[
                { label: "Women", value: register.female },
                { label: "Men", value: register.male },
                { label: "Not stated", value: register.genderUnknown },
                { label: "Under 25", value: register.ages.under25 },
                { label: "25 – 34", value: register.ages.to34 },
                { label: "35 – 49", value: register.ages.to49 },
                { label: "50 and over", value: register.ages.over50 },
              ]}
            />
          </div>
        </div>

        <div className="mt-8">
          <SectionHead
            title="Newest registrations"
            lead="The feed that tells you the form is still working."
            href="/admin/members"
            hrefLabel="All members"
          />
          <Table
            head={[
              { label: "Member" },
              { label: "Membership no." },
              { label: "Ward" },
              { label: "State" },
              { label: "Referred by" },
              { label: "Status" },
              { label: "Joined", align: "right" },
            ]}
            empty={newest.length === 0 ? <Empty>Nobody has registered yet.</Empty> : null}
          >
            {newest.map((member) => (
              <Row key={member.id}>
                <Cell>
                  <Link href={`/admin/members/${member.id}`} className="font-bold hover:text-ember-600">
                    {member.name}
                  </Link>
                </Cell>
                <Cell className="tabular-nums text-content-muted">{member.membershipNo ?? "—"}</Cell>
                <Cell className="text-content-muted">{member.ward}</Cell>
                <Cell className="text-content-muted">{member.state}</Cell>
                <Cell className="text-content-muted">{member.referrer ?? "—"}</Cell>
                <Cell>
                  <Tag tone={member.verification === "VERIFIED" ? "verified" : "pending"}>
                    {member.verification}
                  </Tag>
                </Cell>
                <Cell align="right" className="text-content-subtle">{when(member.joinedAt)}</Cell>
              </Row>
            ))}
          </Table>
        </div>
      </Anchor>

      {/* ──────────────────────────────────────────────────────── integrity */}
      <Anchor id="integrity">
        <SectionHead
          title="Integrity"
          lead={`Fourteen checks against the data. ${problems.clean} pass; ${failing.length} do not.`}
        />

        {failing.length === 0 ? (
          <Card className="flex items-start gap-4 border-brand-600 p-6">
            <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center bg-brand-50 text-brand-700">
              <ShieldCheck size={20} strokeWidth={2.25} />
            </span>
            <div>
              <p className="font-display text-lg font-extrabold tracking-tight text-ink-950">
                Every check passes
              </p>
              <p className="mt-1 text-[0.875rem] text-content-muted">
                No orphaned accounts, no geography that contradicts itself, no seat whose
                status disagrees with who is sitting in it, and no return that fails its
                own arithmetic.
              </p>
            </div>
          </Card>
        ) : (
          <ul className="grid gap-px bg-ink-200 md:grid-cols-2">
            {failing.map((check) => (
              <li key={check.key} className="flex items-start gap-4 border-l-4 border-l-red-600 bg-white p-5">
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center bg-red-50 text-red-700">
                  <CircleAlert size={18} strokeWidth={2.5} />
                </span>
                <div className="min-w-0">
                  <p className="flex items-baseline gap-2">
                    <span className="font-display text-xl font-extrabold tabular-nums text-red-700">
                      {check.count.toLocaleString()}
                    </span>
                    <span className="font-bold text-ink-950">{check.label}</span>
                  </p>
                  <p className="mt-1 text-[0.8125rem] leading-snug text-content-muted">
                    {check.meaning}
                  </p>
                  {check.href && (
                    <Link
                      href={check.href}
                      className="mt-2 inline-block text-[0.75rem] font-bold tracking-[0.08em] text-brand-700 uppercase hover:text-ember-600"
                    >
                      Go and look
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* The passing checks stay listed. A check nobody can see is a check
            nobody knows is being made. */}
        <details className="mt-4 border border-ink-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-[0.75rem] font-bold tracking-[0.08em] text-ink-600 uppercase">
            The {problems.clean} checks that pass
          </summary>
          <ul className="divide-y divide-ink-200 border-t border-ink-200">
            {problems.checks
              .filter((check) => check.count === 0)
              .map((check) => (
                <li key={check.key} className="flex items-center gap-3 px-4 py-2.5">
                  <CircleCheck size={15} strokeWidth={2.5} className="shrink-0 text-brand-600" aria-hidden="true" />
                  <span className="text-[0.8125rem] text-ink-950">{check.label}</span>
                  <span className="ml-auto text-[0.8125rem] font-bold tabular-nums text-content-subtle">0</span>
                </li>
              ))}
          </ul>
        </details>
      </Anchor>

      {/* ───────────────────────────────────────────────────────── coverage */}
      <Anchor id="coverage">
        <SectionHead
          title="Coverage of the federation"
          lead="Against the INEC delimitation, not against what has already been registered in — so these denominators do not move."
        />
        <div className="grid gap-px bg-ink-200 sm:grid-cols-2 xl:grid-cols-4">
          <Proportion label="States" live={reach.states.live} all={reach.states.all} />
          <Proportion label="Local governments" live={reach.lgas.live} all={reach.lgas.all} />
          <Proportion label="Wards" live={reach.wards.live} all={reach.wards.all} />
          <Proportion
            label="Polling units"
            live={reach.units.live}
            all={reach.units.all}
            sub="Units where at least one member has given their booth."
          />
        </div>
      </Anchor>

      {/* ─────────────────────────────────────────────────────────── states */}
      <Anchor id="states">
        <SectionHead
          title="Every state"
          lead="Sorted by members, so the states behind are at the bottom and the states ahead are at the top. Ward reach is the honest coverage figure: a state with ten thousand members in four wards has not covered the state."
          action={
            /* A file download, not a navigation: next/link would try to
               client-route it and the CSV would never reach the disk. */
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a
              href="/api/admin/export/states"
              className="flex shrink-0 items-center gap-1.5 text-[0.75rem] font-bold tracking-[0.08em] text-brand-700 uppercase hover:text-ember-600"
            >
              <Download size={14} strokeWidth={3} />
              CSV
            </a>
          }
        />
        <Table
          head={[
            { label: "State" },
            { label: "Zone" },
            { label: "Members", align: "right" },
            { label: "Verified", align: "right" },
            { label: "30 days", align: "right" },
            { label: "Ward reach" },
            { label: "Seats filled" },
            { label: "Booth agents" },
            { label: "Returns", align: "right" },
          ]}
        >
          {states.map((state) => (
            <Row key={state.id}>
              <Cell>
                <span className="font-bold">{state.name}</span>
                <span className="ml-2 text-[0.75rem] tabular-nums text-content-subtle">{state.code}</span>
              </Cell>
              <Cell className="text-content-muted">{state.zone}</Cell>
              <Cell align="right" className="font-bold">{state.members.toLocaleString()}</Cell>
              <Cell align="right" className="text-content-muted">{state.verified.toLocaleString()}</Cell>
              <Cell align="right" className="text-content-muted">{state.month.toLocaleString()}</Cell>
              <Cell>
                <Coverage value={Math.round(state.wardShare)} />
                <span className="mt-1 block text-[0.6875rem] tabular-nums text-content-subtle">
                  {state.wardsLive.toLocaleString()} of {state.wards.toLocaleString()} wards
                </span>
              </Cell>
              <Cell>
                <Coverage value={Math.round(state.seatShare)} />
                <span className="mt-1 block text-[0.6875rem] tabular-nums text-content-subtle">
                  {state.filled.toLocaleString()} of {state.seats.toLocaleString()}
                </span>
              </Cell>
              <Cell>
                <Coverage value={Math.round(state.agentShare)} />
                <span className="mt-1 block text-[0.6875rem] tabular-nums text-content-subtle">
                  {state.agents.toLocaleString()} of {state.agentSeats.toLocaleString()} booths
                </span>
              </Cell>
              <Cell align="right" className="text-content-muted">{state.returns.toLocaleString()}</Cell>
            </Row>
          ))}
        </Table>
      </Anchor>

      {/* ──────────────────────────────────────────────────────── structure */}
      <Anchor id="structure">
        <SectionHead
          title="The structure"
          lead="Seats that exist against seats with a person in them. The booth tier is reported apart from the rest — 176,623 agent seats against 92,184 in every other tier would swamp any combined figure."
          href="/admin/leadership"
          hrefLabel="Directory"
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Table
            head={[
              { label: "Tier" },
              { label: "Seats", align: "right" },
              { label: "Filled", align: "right" },
              { label: "Vacant", align: "right" },
              { label: "Coverage" },
            ]}
          >
            {structure.byTier.map((tier) => (
              <Row key={tier.tier}>
                <Cell>
                  <span className="font-bold">{tier.tier.replace("_", " ")}</span>
                  {tier.tier === "POLLING_UNIT" && (
                    <span className="ml-2 text-[0.75rem] text-content-subtle">election day</span>
                  )}
                </Cell>
                <Cell align="right">{tier.total.toLocaleString()}</Cell>
                <Cell align="right" className="font-bold">{tier.filled.toLocaleString()}</Cell>
                <Cell align="right" className="text-content-muted">{tier.vacant.toLocaleString()}</Cell>
                <Cell>
                  <Coverage value={Math.round(tier.share)} />
                </Cell>
              </Row>
            ))}
          </Table>

          <div className="space-y-6">
            <Facts
              rows={[
                { label: "Active appointments", value: structure.appointments.active },
                { label: "Ended appointments", value: structure.appointments.ended },
                { label: "Made in the last 30 days", value: structure.appointments.recent },
              ]}
            />
            <Card className="p-5">
              <p className="mb-3 text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                Highest vacancies
              </p>
              {vacancies.length === 0 ? (
                <p className="text-[0.875rem] text-content-subtle">Every seat is filled.</p>
              ) : (
                <ul className="divide-y divide-ink-200">
                  {vacancies.map((seat) => (
                    <li key={seat.id} className="flex items-baseline justify-between gap-4 py-2">
                      <span className="min-w-0 text-[0.875rem] text-ink-950">{seat.title}</span>
                      <span className="shrink-0 text-[0.75rem] text-content-subtle">{seat.unit}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </Anchor>

      {/* ───────────────────────────────────────────────────────── election */}
      <Anchor id="election">
        <SectionHead
          title="Election operations"
          lead={
            openElections.length
              ? `${openElections.length} election${openElections.length === 1 ? "" : "s"} open for returns. Reporting is measured against all ${reach.units.all.toLocaleString()} polling units in the federation.`
              : "No election is currently accepting returns."
          }
          href="/results"
          hrefLabel="Public results"
        />
        <Table
          head={[
            { label: "Election" },
            { label: "Held" },
            { label: "Status" },
            { label: "Returns", align: "right" },
            { label: "Reporting" },
            { label: "No sheet", align: "right" },
            { label: "Disputed", align: "right" },
            { label: "Votes counted", align: "right" },
            { label: "Last return", align: "right" },
          ]}
          empty={elections.length === 0 ? <Empty>No elections have been created.</Empty> : null}
        >
          {elections.map((election) => (
            <Row key={election.id}>
              <Cell>
                <span className="font-bold">{election.name}</span>
                <span className="ml-2 text-[0.75rem] text-content-subtle">{election.type}</span>
              </Cell>
              <Cell className="text-content-muted">{day(election.heldOn)}</Cell>
              <Cell>
                <Tag tone={election.status === "OPEN" ? "verified" : "vacant"}>{election.status}</Tag>
              </Cell>
              <Cell align="right" className="font-bold">{election.returns.toLocaleString()}</Cell>
              <Cell>
                <Coverage value={Math.round(election.reporting)} />
              </Cell>
              <Cell
                align="right"
                className={cn(election.unevidenced > 0 && "font-bold text-red-700")}
              >
                {election.unevidenced.toLocaleString()}
              </Cell>
              <Cell align="right" className={cn(election.disputed > 0 && "font-bold text-red-700")}>
                {election.disputed.toLocaleString()}
              </Cell>
              <Cell align="right" className="text-content-muted">{election.votes.toLocaleString()}</Cell>
              <Cell align="right" className="text-content-subtle">{when(election.lastAt)}</Cell>
            </Row>
          ))}
        </Table>
      </Anchor>

      {/* ──────────────────────────────────────────────────────── referrals */}
      <Anchor id="referrals">
        <SectionHead
          title="Referrals"
          lead="The one figure on this page that measures the members rather than the structure."
          href="/admin/referrals"
          hrefLabel="Full report"
        />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="space-y-6">
            <div className="grid gap-px bg-ink-200 sm:grid-cols-2 lg:grid-cols-1">
              <StatTile
                icon={Share2}
                label="Recruited members"
                value={referrals.referred}
                sub={`${referrals.share}% of the register`}
              />
              <StatTile
                icon={UserCheck}
                label="Members who have recruited"
                value={referrals.recruiters}
                sub={`Best ${referrals.best.toLocaleString()} · average ${referrals.mean} each`}
              />
            </div>
            <Facts
              rows={[
                { label: "Codes issued", value: referrals.coded },
                { label: "Members with no code", value: referrals.uncoded, tone: "alert" },
              ]}
            />
          </div>

          <Table
            head={[
              { label: "Member" },
              { label: "Code" },
              { label: "State" },
              { label: "Brought in", align: "right" },
            ]}
            empty={recruiters.length === 0 ? <Empty>Nobody has used a referral code yet.</Empty> : null}
          >
            {recruiters.map((person) => (
              <Row key={person.id}>
                <Cell>
                  <Link href={`/admin/members/${person.id}`} className="font-bold hover:text-ember-600">
                    {person.name}
                  </Link>
                  {person.membershipNo && (
                    <span className="ml-2 text-[0.75rem] tabular-nums text-content-subtle">
                      {person.membershipNo}
                    </span>
                  )}
                </Cell>
                <Cell className="font-mono text-[0.8125rem] tracking-wider">{person.referralCode ?? "—"}</Cell>
                <Cell className="text-content-muted">{person.state}</Cell>
                <Cell align="right" className="font-bold">{person.brought.toLocaleString()}</Cell>
              </Row>
            ))}
          </Table>
        </div>
      </Anchor>

      {/* ─────────────────────────────────────────────────────── broadcasts */}
      <Anchor id="broadcasts">
        <SectionHead
          title="Broadcasts"
          lead="Every bulk SMS sent from anywhere in the movement. A coordinator can only see sends from inside their own territory, so this is the only place the whole picture exists — and a broadcast is the one action here that reaches people who are not looking at the app."
          href="/admin/broadcast"
          hrefLabel="Send one"
        />

        <div className="grid gap-px bg-ink-200 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            icon={MessageSquare}
            label="Broadcasts sent"
            value={sms.sends}
            sub={`${sms.month.toLocaleString()} in the last 30 days, by ${sms.senders.toLocaleString()} ${sms.senders === 1 ? "coordinator" : "coordinators"}`}
          />
          <StatTile
            icon={Users}
            label="Messages delivered"
            value={sms.delivered}
            sub={`of ${sms.recipients.toLocaleString()} addressed`}
          />
          <StatTile
            icon={CircleAlert}
            label="Refused by the gateway"
            value={sms.failed}
            tone="alert"
            sub="Usually a number mistyped at registration."
          />
          <StatTile
            icon={Activity}
            label="SMS credits spent"
            value={sms.credits}
            sub="Parts × recipients. This is what the invoice will say."
          />
        </div>

        <div className="mt-6">
          <Table
            head={[
              { label: "Sent" },
              { label: "By" },
              { label: "Territory" },
              { label: "Message" },
              { label: "To", align: "right" },
              { label: "Delivered", align: "right" },
              { label: "Status" },
            ]}
            empty={sms.latest.length === 0 ? <Empty>Nothing has been broadcast yet.</Empty> : null}
          >
            {sms.latest.map((row) => (
              <Row key={row.id}>
                <Cell className="whitespace-nowrap text-content-muted">{when(row.createdAt)}</Cell>
                <Cell className="font-bold">{row.sender}</Cell>
                <Cell className="text-content-muted">{row.scopeLabel}</Cell>
                <Cell className="max-w-md">
                  <span className="line-clamp-2 text-[0.8125rem]">{row.body}</span>
                </Cell>
                <Cell align="right">{row.recipients.toLocaleString()}</Cell>
                <Cell align="right" className="font-bold">{row.delivered.toLocaleString()}</Cell>
                <Cell>
                  <Tag
                    tone={
                      row.status === "SENT"
                        ? "verified"
                        : row.status === "FAILED"
                          ? "rejected"
                          : "pending"
                    }
                  >
                    {row.status}
                  </Tag>
                </Cell>
              </Row>
            ))}
          </Table>
        </div>
      </Anchor>

      {/* ───────────────────────────────────────────────────────── accounts */}
      <Anchor id="accounts">
        <SectionHead
          title="Accounts and security"
          lead="Sign-in state for every account, and where the platform stands against the §13.2 requirements it has not finished implementing."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <Facts
            rows={[
              { label: "Accounts", value: accounts.total },
              { label: "Active", value: accounts.active },
              { label: "Suspended or locked", value: accounts.restricted, tone: "alert" },
              { label: "Email address on file", value: accounts.withEmail },
              { label: "Signed in today", value: accounts.today },
              { label: "Signed in this week", value: accounts.week },
              { label: "Signed in this month", value: accounts.month },
              { label: "Never signed in", value: accounts.never },
            ]}
          />
          <div className="space-y-4">
            <Facts
              rows={[
                { label: "Phone numbers verified", value: accounts.phoneVerified },
                { label: "Two-factor enabled", value: accounts.mfa },
                {
                  label: "State level and above (MFA required by §13.2)",
                  value: `${accounts.mfaMet} of ${accounts.mfaOwed}`,
                  tone: accounts.mfaMet < accounts.mfaOwed ? "alert" : undefined,
                },
              ]}
            />
            <Card className="border-ember-500 p-5">
              <p className="flex items-center gap-2 font-bold text-ink-950">
                <CircleAlert size={16} strokeWidth={2.5} className="text-ember-600" aria-hidden="true" />
                Two requirements are not yet enforced
              </p>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-content-muted">
                §7.2 requires an OTP at registration and §13.2 requires two-factor
                authentication for state level and above. The columns exist and are
                counted here; the flows that fill them are not built. Recorded on this
                page rather than in a backlog so nobody reads the zeros above as a
                security posture.
              </p>
            </Card>
          </div>
        </div>
      </Anchor>

      {/* ──────────────────────────────────────────────────────────── audit */}
      <Anchor id="audit">
        <SectionHead
          title="Audit trail"
          lead="Append-only: UPDATE and DELETE are revoked for the application role at the database level, so this is the whole record and it cannot be edited from inside the app."
          action={
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a
              href="/api/admin/export/audit"
              className="flex shrink-0 items-center gap-1.5 text-[0.75rem] font-bold tracking-[0.08em] text-brand-700 uppercase hover:text-ember-600"
            >
              <Download size={14} strokeWidth={3} />
              CSV
            </a>
          }
        />
        <Table
          head={[
            { label: "When" },
            { label: "Who" },
            { label: "Action" },
            { label: "Entity" },
            { label: "Address", align: "right" },
          ]}
          empty={audit.length === 0 ? <Empty>Nothing has been recorded yet.</Empty> : null}
        >
          {audit.map((entry) => (
            <Row key={entry.id}>
              <Cell className="whitespace-nowrap text-content-muted">{when(entry.createdAt)}</Cell>
              <Cell>
                <span className="font-bold">{entry.actor}</span>
                {entry.actorNo && (
                  <span className="ml-2 text-[0.75rem] tabular-nums text-content-subtle">
                    {entry.actorNo}
                  </span>
                )}
              </Cell>
              <Cell>
                <span className="font-mono text-[0.8125rem]">{entry.action}</span>
              </Cell>
              <Cell className="text-content-muted">
                {entry.entityType}
                {entry.entityId ? ` #${entry.entityId}` : ""}
              </Cell>
              <Cell align="right" className="font-mono text-[0.75rem] text-content-subtle">
                {entry.ipAddress ?? "—"}
              </Cell>
            </Row>
          ))}
        </Table>
      </Anchor>

      {/* ────────────────────────────────────────────────────────── storage */}
      <Anchor id="storage">
        <SectionHead
          title="Storage"
          lead="Live row counts, straight from the tables rather than from the planner's estimates — this is the page somebody opens to find out whether a bulk load actually worked."
        />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Table head={[{ label: "Table" }, { label: "Rows", align: "right" }, { label: "On disk", align: "right" }]}>
            {tables.map((table) => (
              <Row key={table.name}>
                <Cell className="font-mono text-[0.8125rem]">{table.name}</Cell>
                <Cell align="right" className="font-bold">{table.rows.toLocaleString()}</Cell>
                <Cell align="right" className="text-content-muted">{size(table.bytes)}</Cell>
              </Row>
            ))}
          </Table>

          <div className="space-y-6">
            <div className="grid gap-px bg-ink-200">
              <StatTile icon={Database} label="Rows in total" value={totalRows} sub={size(totalBytes)} />
              <StatTile
                icon={Activity}
                label="Tables"
                value={tables.length}
                sub="Every table the schema defines."
              />
            </div>

            <Card className="p-5">
              <p className="mb-3 flex items-center gap-2 text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                <Download size={13} strokeWidth={3} aria-hidden="true" />
                Export
              </p>
              <p className="mb-4 text-[0.8125rem] leading-snug text-content-muted">
                CSV, generated live and streamed. Every download is written to the audit
                trail above with your name against it.
              </p>
              <ul className="grid gap-px bg-ink-200">
                {EXPORTS.map((item) => (
                  <li key={item.key}>
                    <a
                      href={`/api/admin/export/${item.key}`}
                      className="flex items-center justify-between bg-white px-4 py-2.5 text-[0.875rem] font-bold text-ink-950 transition-colors hover:bg-ink-950 hover:text-white"
                    >
                      {item.label}
                      <Download size={14} strokeWidth={2.75} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </Anchor>

      <p className="flex items-center gap-2 border-t-2 border-ink-950 pt-5 text-[0.8125rem] text-content-subtle">
        <ScrollText size={15} strokeWidth={2.25} aria-hidden="true" />
        Every figure on this page is read live at the moment you loaded it. Nothing here
        is cached, and nothing here is scoped.
        <Vote size={15} strokeWidth={2.25} className="ml-auto" aria-hidden="true" />
      </p>
    </div>
  );
}
