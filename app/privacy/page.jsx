import React from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { site } from "@/lib/site";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How the Movement for Amaechi Presidency collects, uses and protects the personal data of its members.",
};

/**
 * NOT LEGAL ADVICE, AND NOT YET COUNSEL-APPROVED.
 *
 * The platform plan §13.3 requires a published privacy policy, a named Data
 * Protection Officer and NDPC registration under the Nigeria Data Protection
 * Act 2023. This page exists because the footer previously linked "Privacy
 * Policy" at /support, the donation page, on a site that collects phone
 * numbers and National Identification Numbers.
 *
 * What it states about current practice is factually accurate as of writing,
 * including the disclosure that registration data goes to a third-party Google
 * Form. That disclosure is deliberate: members are entitled to know where their
 * NIN actually lands. It must be reviewed by the movement's counsel, and the
 * DPO's name and contact filled in, before it can be relied on.
 */

const sections = [
  {
    heading: "Who we are",
    body: [
      `The Movement for Amaechi Presidency (MAP) is the data controller for personal data collected through this website. MAP is a membership movement organising in support of the presidential aspiration of Rt. Hon. Chibuike Rotimi Amaechi.`,
      `Contact details for the movement's Data Protection Officer are published here once appointed. Until then, data protection enquiries should be sent through the Complaint category on our contact page.`,
    ],
  },
  {
    heading: "What we collect",
    body: [
      `When you register as a member we ask for your full name, phone number, state, Local Government Area, and the membership identifier of the person who referred you, if any. We also ask for your National Identification Number (NIN).`,
      `Providing your NIN is optional. It is used only to distinguish genuine members from duplicate or fraudulent registrations. If you would rather not supply it, you can still register.`,
    ],
  },
  {
    heading: "Where your registration is currently stored",
    body: [
      `Registrations submitted through this website are presently delivered to a Google Form operated by the movement, and are stored in Google's systems outside Nigeria. This includes any NIN you choose to provide.`,
      `MAP is migrating registration onto its own membership database, where personal data will be held in a single controlled register, identifiers will be encrypted at rest, and access will be limited to named officers. Until that migration completes, please take the paragraph above into account when deciding whether to supply your NIN.`,
    ],
  },
  {
    heading: "What we use it for",
    body: [
      `To register and verify you as a member; to place you in the correct ward, Local Government Area and state within the movement's structure; to make your record visible to the coordinators responsible for your territory, who appoint officers from it; to notify you if you are appointed to a seat; and to invite you to activities in your area.`,
      `We do not sell personal data, and we do not share it with third parties for their own marketing.`,
    ],
  },
  {
    heading: "Your rights",
    body: [
      `Under the Nigeria Data Protection Act 2023 you may request access to the personal data we hold about you, ask us to correct it if it is wrong, ask us to delete it, or withdraw consent you previously gave. You may also complain to the Nigeria Data Protection Commission.`,
      `You can opt out of general announcements at any time. You cannot opt out of messages about your own membership or about a seat you are appointed to, because those are how the movement tells you where you stand in its structure.`,
    ],
  },
];

export default function Privacy() {
  return (
    <>
      <PageHeader
        breadcrumb="Privacy"
        kicker="Data protection"
        title="Privacy Policy"
        lead="How MAP collects, uses and protects the personal data of its members, and what you can ask us to do with it."
      />

      <Section className="bg-white">
        <div className="shell-text mx-auto">
          {/* An honest status banner. A policy that has not been through counsel
              should say so rather than imply a review that has not happened. */}
          <div className="flex items-start gap-3.5 border-l-4 border-ember-500 bg-ink-50 p-5">
            <ShieldAlert
              size={19}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-ember-600"
            />
            <p className="text-[0.875rem] leading-relaxed text-content-muted">
              <strong className="font-bold text-ink-950">
                This policy is in draft.
              </strong>{" "}
              It describes MAP&rsquo;s current practice accurately, but it has not
              yet been reviewed by the movement&rsquo;s legal counsel and no Data
              Protection Officer has been named. It will be updated on both
              counts.
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
            Questions about this policy, or a request to access or delete your
            data, can be sent through the{" "}
            <Link
              href="/contact"
              className="font-bold text-brand-700 underline underline-offset-4 transition-colors hover:text-ember-600"
            >
              contact page
            </Link>
            . {site.movement}. Last updated July 2026.
          </p>
        </div>
      </Section>
    </>
  );
}
