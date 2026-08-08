import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Crown,
  MapPin,
  Phone,
  Share2,
  ShieldAlert,
} from "lucide-react";

import Avatar from "@/components/ui/Avatar";
import GrowthChart from "@/components/ui/GrowthChart";
import { currentSession } from "@/lib/session";
import { memberDetail } from "@/lib/dashboard";
import { growthSeries, referralList } from "@/lib/referrals";
import { Card, SectionHead, Table, Row, Cell, Empty, Tag } from "../../ui";

export const dynamic = "force-dynamic";

const date = (iso) =>
  new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));

/**
 * One member, as their coordinator sees them.
 *
 * The whole page is behind `memberDetail`, which applies the reader's scope in
 * the same query as the id. An LGA Coordinator following a link to a member in
 * the next LGA gets the same 404 as a link to a member who does not exist —
 * there is no response that distinguishes them, because a difference here is
 * how you enumerate a register you have no right to read.
 */
export default async function MemberPage({ params }) {
  const { id } = await params;
  const { scope } = await currentSession();

  const member = await memberDetail(scope, id);
  if (!member) notFound();

  const [brought, series] = await Promise.all([
    referralList(member.id),
    growthSeries({ referredById: member.id, days: 90 }),
  ]);

  const verified = member.verification === "VERIFIED";

  return (
    <div className="space-y-8">
      <Link
        href="/admin/members"
        className="inline-flex items-center gap-2 text-[0.75rem] font-bold tracking-[0.08em] text-ink-500 uppercase hover:text-ink-950"
      >
        <ArrowLeft size={14} strokeWidth={3} />
        All members
      </Link>

      {/* ── Who they are ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start gap-x-8 gap-y-5 border-b-2 border-ink-950 pb-7">
        <Avatar name={member.name} src={member.photoUrl} size="lg" className="sm:size-24" />

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-fluid-2xl font-extrabold tracking-[-0.025em] text-ink-950">
            {member.name}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.875rem] text-content-muted">
            <span className="font-semibold text-ink-950 tabular-nums">
              {member.membershipNo ?? "Number not yet issued"}
            </span>
            <span aria-hidden="true" className="text-ink-300">
              ·
            </span>
            <span>Joined {date(member.joinedAt)}</span>
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Tag tone={verified ? "verified" : member.verification === "REJECTED" ? "rejected" : "pending"}>
              {member.verification}
            </Tag>
            {member.offices.map((office) => (
              <Tag key={office.title} tone="admin">
                {office.title}
              </Tag>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-2 border-ink-950 px-5 py-4 text-center">
          <p className="text-[0.625rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
            Brought in
          </p>
          <p className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink-950 tabular-nums">
            {member.referrals.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[0.75rem] text-content-subtle">
            member{member.referrals === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-8">
          {/* ── Their referrals ────────────────────────────────────────── */}
          <section>
            <SectionHead
              title="Members they brought in"
              lead={
                member.referrals > 0
                  ? `Everyone who registered with ${member.name.split(" ")[0]}'s code, newest first.`
                  : "Nobody has registered with their code yet."
              }
            />

            {brought.length > 0 ? (
              <Table
                head={[
                  { label: "Member" },
                  { label: "Ward" },
                  { label: "Joined" },
                  { label: "Their own", align: "right" },
                  { label: "Status" },
                ]}
              >
                {brought.map((person) => (
                  <Row key={person.id}>
                    <Cell>
                      {/* Recursive by design: the chain of who brought whom is
                          the thing a coordinator is actually trying to follow. */}
                      <Link
                        href={`/admin/members/${person.id}`}
                        className="group flex items-center gap-3"
                      >
                        <Avatar name={person.name} src={person.photoUrl} size="xs" ring={false} />
                        <span className="font-semibold group-hover:text-brand-700 group-hover:underline group-hover:underline-offset-2">
                          {person.name}
                        </span>
                      </Link>
                    </Cell>
                    <Cell className="text-content-muted">
                      {person.ward}
                      <span className="block text-[0.75rem] text-ink-400">{person.lga}</span>
                    </Cell>
                    <Cell className="text-content-muted tabular-nums">{date(person.joinedAt)}</Cell>
                    <Cell align="right">
                      {person.referrals > 0 ? (
                        <span className="font-bold">{person.referrals.toLocaleString()}</span>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </Cell>
                    <Cell>
                      <Tag
                        tone={
                          person.verification === "VERIFIED"
                            ? "verified"
                            : person.verification === "REJECTED"
                              ? "rejected"
                              : "pending"
                        }
                      >
                        {person.verification}
                      </Tag>
                    </Cell>
                  </Row>
                ))}
              </Table>
            ) : (
              <Card>
                <Empty>
                  Their code is {member.referralCode ?? "not yet issued"}. Nobody
                  has registered with it so far.
                </Empty>
              </Card>
            )}
          </section>

          {/* Only worth the space once there is a shape to see. One member and
              a flat line is a chart that says nothing. */}
          {member.referrals > 1 && (
            <Card className="p-5 sm:p-6">
              <SectionHead
                title="Their recruiting"
                lead="Members brought in over the last 90 days."
              />
              <GrowthChart
                data={series}
                caption={`Members brought in by ${member.name} over the last 90 days`}
              />
            </Card>
          )}
        </div>

        {/* ── The record ───────────────────────────────────────────────── */}
        <aside className="min-w-0 space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2.5">
              <Share2 size={15} className="text-brand-600" aria-hidden="true" />
              <p className="text-[0.625rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                Referral code
              </p>
            </div>
            <p className="mt-2.5 font-display text-xl font-extrabold tracking-[0.16em] text-ink-950 tabular-nums">
              {member.referralCode ?? "—"}
            </p>

            <div className="mt-5 border-t border-ink-200 pt-4">
              <p className="text-[0.625rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                Invited by
              </p>
              {member.invitedBy ? (
                <Link
                  href={`/admin/members/${member.invitedBy.id}`}
                  className="mt-1.5 flex items-center gap-1.5 text-[0.875rem] font-bold text-brand-700 hover:text-ember-600"
                >
                  {member.invitedBy.name}
                  <ArrowRight size={13} strokeWidth={3} />
                </Link>
              ) : (
                <p className="mt-1.5 text-[0.875rem] text-content-subtle">
                  Registered directly
                </p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2.5">
              <MapPin size={15} className="text-brand-600" aria-hidden="true" />
              <p className="text-[0.625rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                Where they vote
              </p>
            </div>
            <dl className="mt-4 space-y-3">
              {[
                ["Ward", member.ward],
                ["LGA", member.lga],
                ["State", member.state],
                ["Polling unit", member.pollingUnit ?? "Not given"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[0.625rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-[0.875rem] font-semibold text-ink-950">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2.5">
              <Phone size={15} className="text-brand-600" aria-hidden="true" />
              <p className="text-[0.625rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                Contact
              </p>
            </div>
            <p className="mt-3 text-[0.875rem] font-semibold text-ink-950 tabular-nums">
              {member.phone}
            </p>
            {member.email && (
              <p className="mt-1 text-[0.8125rem] break-all text-content-muted">{member.email}</p>
            )}
            <p className="mt-4 flex items-start gap-2 border-t border-ink-200 pt-4 text-[0.8125rem] leading-snug text-content-muted">
              {verified ? (
                <BadgeCheck size={15} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" />
              ) : (
                <ShieldAlert size={15} className="mt-0.5 shrink-0 text-ember-600" aria-hidden="true" />
              )}
              <span>
                {verified
                  ? "Verified — eligible for office at any tier."
                  : "Not verified. Eligible for a ward seat only, until a photograph and voter's card number are on file."}
              </span>
            </p>
          </Card>

          {member.offices.length > 0 && (
            <Card className="border-2 border-ink-950 p-6">
              <div className="flex items-center gap-2.5">
                <Crown size={15} className="text-ember-600" aria-hidden="true" />
                <p className="text-[0.625rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                  Office held
                </p>
              </div>
              {member.offices.map((office) => (
                <div key={office.title} className="mt-3">
                  <p className="font-display text-[0.9375rem] font-extrabold tracking-tight text-ink-950">
                    {office.title}
                  </p>
                  {office.since && (
                    <p className="mt-0.5 text-[0.8125rem] text-content-muted">
                      Since {date(office.since)}
                    </p>
                  )}
                </div>
              ))}
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
