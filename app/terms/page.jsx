import React from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { site } from "@/lib/site";

export const metadata = {
  title: "Terms of Use",
  description:
    "The terms on which the Movement for Amaechi Presidency provides this website and membership platform.",
};

/**
 * NOT LEGAL ADVICE, AND NOT YET COUNSEL-APPROVED. See the note in
 * app/privacy/page.jsx. This page exists for the same reason: the footer's
 * "Terms of Use" link previously pointed at the donation page.
 *
 * Everything stated here is drawn from the movement's own rules as set out in
 * the platform plan (§8.1 appointment rules, §8.4 removal and resignation,
 * §13.2 security). Nothing about liability, jurisdiction or dispute resolution
 * is asserted, because that is counsel's to draft.
 */

const sections = [
  {
    heading: "Membership",
    body: [
      `Membership of MAP is free. The movement never asks for payment to register, to be appointed to any office, or to keep one. Any person, page or account demanding money for membership or for a position is not acting for this movement.`,
      `You must be at least 18 years old to register. One membership per person, and one membership per phone number, because your phone number is how the movement identifies you.`,
      `The information you give at registration must be accurate. Registrations found to be duplicated or falsified may be cancelled.`,
    ],
  },
  {
    heading: "Holding office",
    body: [
      `Office in MAP is by appointment. Members do not apply for seats and cannot nominate themselves. Every seat is filled by the officer the movement's structure names as the appointing authority for it, appointing from the members registered in that territory, and the National Coordinator, as Super Admin, may appoint anywhere in the structure.`,
      `A member may hold one office at a time, and may only be appointed to a seat within the territory they registered in. If you relocate, you request a transfer of registration, and an officer must vacate their seat before transferring.`,
      `Appointments are recorded permanently against the name of the officer who made them. No appointment made outside this chain is valid, and nobody may promise you a seat.`,
    ],
  },
  {
    heading: "Removal and resignation",
    body: [
      `An officer may be removed by an admin above their tier, for a reason recorded from a defined list: inactivity, misconduct, activity against the party, restructuring, or another reason stated in writing. The seat becomes vacant and the member reverts to ordinary membership.`,
      `An officer may resign through the member portal. A resignation takes effect when accepted by the officer who appointed them, or automatically after seven days.`,
    ],
  },
  {
    heading: "Conduct",
    body: [
      `Members accept the movement's Code of Conduct at registration. Using MAP's name, marks or structure to solicit money, to impersonate an officer, or to make claims on the movement's behalf without authority is grounds for removal.`,
      `Content on this site, meaning text, photographs, the MAP mark and the movement's branding, belongs to the movement and may not be reproduced to suggest endorsement or affiliation that does not exist. Press use of the media kit is welcome.`,
    ],
  },
  {
    heading: "Availability and accuracy",
    body: [
      `This platform is provided as it stands. Coverage figures, seat vacancies and officer listings reflect the movement's register at the time you view them, and change as appointments are made.`,
      `Where a page states that an officer, address or record is "to be announced", that is what it means: the movement has not published it yet, and nothing should be inferred from its absence.`,
    ],
  },
];

export default function Terms() {
  return (
    <>
      <PageHeader
        breadcrumb="Terms"
        kicker="Using this platform"
        title="Terms of Use"
        lead="The terms on which MAP provides this website, and the rules that govern membership and office within the movement."
      />

      <Section className="bg-white">
        <div className="shell-text mx-auto">
          <div className="flex items-start gap-3.5 border-l-4 border-ember-500 bg-ink-50 p-5">
            <ShieldAlert
              size={19}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-ember-600"
            />
            <p className="text-[0.875rem] leading-relaxed text-content-muted">
              <strong className="font-bold text-ink-950">
                These terms are in draft.
              </strong>{" "}
              They set out the movement&rsquo;s own membership rules accurately, but
              they have not yet been reviewed by legal counsel and do not address
              liability or dispute resolution.
            </p>
          </div>

          <div className="mt-14 space-y-12">
            {sections.map((section, index) => (
              <section key={section.heading}>
                <h2 className="flex items-baseline gap-4 border-t-2 border-ink-950 pt-5 font-display text-xl font-extrabold tracking-tight text-ink-950">
                  <span className="text-[0.75rem] font-extrabold text-ember-600 tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {section.heading}
                </h2>
                <div className="prose-body mt-5 space-y-4">
                  {section.body.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <p className="prose-body mt-14 border-t border-ink-200 pt-8 text-[0.875rem]">
            How we handle your personal data is set out separately in our{" "}
            <Link
              href="/privacy"
              className="font-bold text-brand-700 underline underline-offset-4 transition-colors hover:text-ember-600"
            >
              Privacy Policy
            </Link>
            . {site.movement}. Last updated July 2026.
          </p>
        </div>
      </Section>
    </>
  );
}
