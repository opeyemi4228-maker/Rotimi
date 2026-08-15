import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  CreditCard,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Crown,
} from "lucide-react";

import Avatar from "@/components/ui/Avatar";
import GrowthChart from "@/components/ui/GrowthChart";
import PhotoUploader from "@/components/PhotoUploader";
import ReferralCard from "@/components/ReferralCard";
import SignOutForm from "@/components/SignOutForm";
import VerifyCard from "./VerifyCard";
import { currentSession } from "@/lib/session";
import { growthSeries, referralList, referralSummary } from "@/lib/referrals";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Your membership — MAP",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The member dashboard (§3.3, /portal).
 *
 * This is where signing in lands, and it is deliberately NOT /admin. Every
 * registered member has a portal; only the few thousand holding a seat have a
 * secretariat dashboard. Landing everyone on /admin would show most of the
 * movement a refusal page immediately after a successful sign-in.
 *
 * It also does the job the sign-in form cannot: a member who has just typed
 * their password needs to see their own name and membership number to know it
 * worked. A redirect to the homepage tells them nothing.
 */
export default async function Portal() {
  const { member, scope } = await currentSession();

  if (!member) redirect("/login?next=/portal");

  const [referrals, brought, series] = await Promise.all([
    referralSummary(member.id),
    referralList(member.id),
    growthSeries({ referredById: member.id, days: 90 }),
  ]);

  const verified = member.verification === "VERIFIED";

  return (
    <div className="min-h-screen bg-ink-50">
      <section className="border-b-2 border-ink-950 bg-white">
        <div className="shell flex flex-wrap items-center gap-x-6 gap-y-5 py-10">
          {/* The portrait leads. A membership card with no photograph on it is
              the thing this page has always looked like it was missing. */}
          <Avatar name={member.name} src={member.photoUrl} size="lg" className="sm:size-24" />

          <div className="min-w-0">
            <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
              Your membership
            </p>
            <h1 className="mt-2 font-display text-fluid-2xl font-extrabold tracking-[-0.02em] text-ink-950">
              {member.name}
            </h1>

            {/* The membership number is the confirmation. It is permanent, it
                is what identifies them everywhere in the movement, and it is
                the one thing on this page they may need to read out loud. */}
            <p className="mt-4 inline-block border-2 border-ink-950 px-4 py-2 font-display text-lg font-extrabold tracking-tight text-ink-950 tabular-nums">
              {member.membershipNo ?? "Number pending"}
            </p>
          </div>
        </div>
      </section>

      <main className="shell grid gap-8 py-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-8">
          {/* ── Photograph ───────────────────────────────────────────────────
              First card on the page, and the same one for everybody. A Ward
              Officer and a State Coordinator are both members here, and giving
              office holders a separate way to do this would be two
              implementations of one feature waiting to disagree. */}
          <div className="border-2 border-ink-950 bg-white p-6">
            <div className="flex items-center gap-2.5">
              <Camera size={16} className="text-brand-600" aria-hidden="true" />
              <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                Your photograph
              </p>
            </div>
            <p className="mt-3 mb-6 max-w-prose text-[0.875rem] leading-relaxed text-content-muted">
              A photograph is what lets a coordinator recognise you at a
              congress and what makes your entry in the ward register a person
              rather than a row.
              {!verified &&
                " It is also one of the two things verification asks for, alongside your voter's card number."}
            </p>
            <PhotoUploader name={member.name} photoUrl={member.photoUrl} />
          </div>

          {/* ── Office, if they hold one ─────────────────────────────────── */}
          {scope ? (
            <div className="border-2 border-ink-950 bg-white p-6">
              <div className="flex items-start gap-4">
                <Crown size={20} className="mt-0.5 shrink-0 text-ember-600" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                    You hold office
                  </p>
                  <p className="mt-1.5 font-display text-xl font-extrabold tracking-tight text-ink-950">
                    {scope.roleTitle}
                  </p>
                  <p className="mt-1 text-[0.875rem] text-content-muted">{scope.label}</p>
                  <Link
                    href="/admin"
                    className="mt-5 inline-flex items-center gap-2 border-2 border-ink-950 bg-ink-950 px-5 py-3 text-[0.75rem] font-bold tracking-[0.08em] text-white uppercase"
                  >
                    Open the secretariat dashboard
                    <ArrowRight size={15} strokeWidth={3} />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-ink-200 bg-white p-6">
              <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                Office
              </p>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-content-muted">
                You do not currently hold a seat. Seats are filled by
                appointment from the authority above them — your LGA
                Coordinator appoints ward officers, and the State Coordinator
                appoints LGA executives.
              </p>
              <Link
                href="/structure"
                className="mt-5 inline-flex items-center gap-2 text-[0.75rem] font-bold tracking-[0.08em] text-brand-700 uppercase hover:text-ember-600"
              >
                See where the vacancies are
                <ArrowRight size={14} strokeWidth={3} />
              </Link>
            </div>
          )}

          {/* ── Where they vote ──────────────────────────────────────────── */}
          <div className="border-2 border-ink-950 bg-white p-6">
            <div className="flex items-center gap-2.5">
              <MapPin size={16} className="text-brand-600" aria-hidden="true" />
              <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                Where you vote
              </p>
            </div>
            <dl className="mt-5 grid gap-5 sm:grid-cols-3">
              {[
                ["Ward", member.ward],
                ["LGA", member.lga],
                ["State", member.state],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                    {label}
                  </dt>
                  <dd className="mt-1 text-[0.9375rem] font-semibold text-ink-950">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 border-t border-ink-200 pt-4 text-[0.8125rem] leading-snug text-content-subtle">
              Your ward is where you appear in the register and the only tier
              you can be appointed in. Moving requires a transfer approved by
              the receiving LGA Coordinator.
            </p>
          </div>

          {/* ── Who you have brought in ──────────────────────────────────
              The movement's growth is not the secretariat's job alone, and
              this is the only page most members will ever open. So the code
              is here, on it, with the names of everyone who used it — a
              number on its own would be a scoreboard, and the names are what
              make it a ward. */}
          <section id="referrals" className="scroll-mt-24">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b-2 border-ink-950 pb-4">
              <h2 className="font-display text-xl font-extrabold tracking-tight text-ink-950">
                People you have brought in
              </h2>
              <p className="text-[0.8125rem] text-content-muted">
                <span className="font-display text-lg font-extrabold text-ink-950 tabular-nums">
                  {referrals?.total.toLocaleString() ?? 0}
                </span>{" "}
                registered with your code
                {referrals?.recent > 0 && `, ${referrals.recent.toLocaleString()} this month`}
              </p>
            </div>

            {brought.length > 0 ? (
              <>
                <ul className="border-2 border-ink-950 bg-white">
                  {brought.map((person) => (
                    <li
                      key={person.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-ink-200 p-4 last:border-0"
                    >
                      <Avatar name={person.name} src={person.photoUrl} size="xs" ring={false} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9375rem] font-bold text-ink-950">
                          {person.name}
                        </span>
                        <span className="block truncate text-[0.8125rem] text-content-subtle">
                          {person.ward}, {person.lga}
                        </span>
                      </span>
                      {person.referrals > 0 && (
                        <span className="shrink-0 border border-ink-200 px-2.5 py-1 text-[0.6875rem] font-bold text-ink-600">
                          brought in {person.referrals}
                        </span>
                      )}
                      <span className="shrink-0 text-[0.8125rem] text-content-subtle tabular-nums">
                        {new Intl.DateTimeFormat("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          timeZone: "Africa/Lagos",
                        }).format(new Date(person.joinedAt))}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Only once there is a shape to see. Two points and a flat
                    line is a chart that tells them nothing they cannot read
                    off the list above it. */}
                {referrals.total > 1 && (
                  <div className="mt-6 border-2 border-ink-950 bg-white p-6">
                    <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                      Your recruiting, last 90 days
                    </p>
                    <div className="mt-5">
                      <GrowthChart
                        data={series}
                        caption="Members you have brought in over the last 90 days"
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="border-2 border-ink-200 bg-white p-6">
                <p className="text-[0.9375rem] leading-relaxed text-content-muted">
                  Nobody has registered with your code yet. Give it to one
                  person this week — a member who brings in five people has done
                  more for their ward than most offices do in a month.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* ── Verification ─────────────────────────────────────────────── */}
        <aside className="min-w-0 space-y-6">
          <ReferralCard code={member.referralCode} />

          {/* Every member has a card, so the link to it is on every member's
              page — not tucked inside the dashboard only office holders see. */}
          <Link
            href="/portal/id-card"
            className="flex items-center gap-3 border-2 border-ink-950 bg-white p-4 transition-colors hover:bg-ink-950 hover:text-white"
          >
            <CreditCard size={18} className="shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.8125rem] font-bold">Your membership card</span>
              <span className="block text-[0.75rem] opacity-70">Download, print or save it</span>
            </span>
            <ArrowRight size={15} strokeWidth={3} className="shrink-0" aria-hidden="true" />
          </Link>

          {referrals?.invitedBy && (
            <p className="border border-ink-200 bg-white p-4 text-[0.8125rem] leading-relaxed text-content-muted">
              You were invited by{" "}
              <strong className="font-bold text-ink-950">{referrals.invitedBy.name}</strong>.
            </p>
          )}

          <VerifyCard verified={verified} hasNin={member.hasNin} />

          <div className="border-2 border-ink-200 bg-white p-6">
            <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
              Signed in as
            </p>
            <p className="mt-2 text-[0.875rem] font-semibold text-ink-950 tabular-nums">
              {member.phone}
            </p>
            {member.email && (
              <p className="mt-0.5 text-[0.8125rem] break-all text-content-muted">
                {member.email}
              </p>
            )}
            <SignOutForm className="mt-5">
              <button
                type="submit"
                className="w-full border-2 border-ink-950 px-4 py-2.5 text-[0.75rem] font-bold tracking-[0.08em] text-ink-950 uppercase transition-colors hover:bg-ink-950 hover:text-white"
              >
                Sign out
              </button>
            </SignOutForm>
          </div>

          <p className="flex items-start gap-3 bg-white p-4 text-[0.8125rem] leading-relaxed text-content-muted">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" />
            <span>
              MAP never asks for payment to register, to be appointed to any
              office, or to keep one.
            </span>
          </p>
        </aside>
      </main>
    </div>
  );
}
