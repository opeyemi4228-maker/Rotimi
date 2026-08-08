import React from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ShieldCheck, Scale, Users, HeartHandshake, Flag, Compass } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { coreValues, objectives, nationalExecutive, totalSeats } from "@/lib/map";

export const metadata = {
  title: "About the Movement",
  description:
    "The Movement for Amaechi Presidency (MAP): its mission, its values, its objectives and its National Executive.",
};

/* Values are ordered by the lib/map.js list; the icons map onto it by index so
   the two stay in step without repeating the copy here. */
const valueIcons = [ShieldCheck, Scale, Compass, Users, HeartHandshake, Flag];

const formatter = new Intl.NumberFormat("en-NG");

export default function About() {
  return (
    <>
      <PageHeader
        breadcrumb="About"
        kicker="The movement"
        title="Movement for Amaechi Presidency"
        lead="A nationwide political movement organising in all 36 states, the Federal Capital Territory, 774 Local Government Areas and over 8,000 wards behind one objective, the presidential aspiration of Rt. Hon. Chibuike Rotimi Amaechi."
      >
        <div className="flex flex-wrap gap-3">
          <Button href="/join" variant="inverse" size="lg">
            Join MAP
            <ArrowRight size={17} strokeWidth={2.75} />
          </Button>
          <Button href="/structure" variant="inverseOutline" size="lg">
            See the structure
          </Button>
        </div>
      </PageHeader>

      {/* ---------------------------------------------------------- mission */}
      <section className="bg-brand-700">
        <div className="shell shell-wide py-16 lg:py-20">
          <Reveal>
            <p className="max-w-4xl text-fluid-2xl leading-tight font-bold text-white">
              MAP exists to build a disciplined, verifiable, nationally
              distributed structure, built ward by ward, in support of the
              presidential aspiration of Rt. Hon. Chibuike Rotimi Amaechi.
            </p>
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------------- the case */}
      <Section className="bg-white">
        <SectionHeading
          index={1}
          eyebrow="Why the movement exists"
          title="Structure is the argument"
          lead="Nigerian politics is not short of declarations. It is short of organisations that can name the person responsible in a given ward, and show when they were appointed and by whom. That is the gap MAP was built to close."
        />

        <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="prose-body space-y-5">
              <p>
                A movement that cannot say who speaks for it in Oredo, or in
                Gwagwalada, or in Nganzai, is not a national movement. It is an
                announcement with a logo. MAP is organised the other way round.
                The structure comes first, it is built to the same shape in every
                state, and it is recorded in one register that the movement&rsquo;s
                own officers are accountable to.
              </p>
              <p>
                That register holds {formatter.format(totalSeats)} seats, from the
                National Executive down to the tenth officer in the smallest
                ward. Every one of them is either filled by a named member, or
                openly vacant and waiting on the authority above it to appoint.
                There is no third state, and no seat that exists only by
                rumour.
              </p>
              <p>
                Membership is deliberate. Members share the movement&rsquo;s stated
                outlook, accept its Code of Conduct, and register in the ward
                where they vote, which is what places them in the structure.
                Office at Local Government level and above requires verification
                by the movement.
              </p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="border-t-2 border-ink-950 pt-7">
              <h3 className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                Our objectives
              </h3>
              <ol className="mt-7 space-y-6">
                {objectives.map((objective, index) => (
                  <li key={objective} className="flex gap-5">
                    <span className="shrink-0 font-display text-base font-extrabold text-ember-600 tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="prose-body text-[0.9375rem]">{objective}</span>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ---------------------------------------------------------- values */}
      <Section className="bg-ink-50">
        <SectionHeading
          index={2}
          eyebrow="Core values"
          title="What membership commits you to"
        />

        <ul className="mt-14 grid gap-px bg-ink-200 sm:grid-cols-2 lg:grid-cols-3">
          {coreValues.map((value, index) => {
            const Icon = valueIcons[index] ?? ShieldCheck;
            return (
              <Reveal as="li" key={value.title} delay={index * 60} className="bg-white">
                <div className="h-full p-7">
                  <Icon
                    size={26}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="text-brand-600"
                  />
                  <h3 className="mt-5 font-display text-lg font-extrabold tracking-tight text-ink-950">
                    {value.title}
                  </h3>
                  <p className="prose-body mt-2.5 text-[0.9375rem]">{value.body}</p>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </Section>

      {/* ------------------------------------------------------ the aspirant */}
      <Section className="bg-white">
        <SectionHeading
          index={3}
          eyebrow="The aspirant"
          title="Rt. Hon. Chibuike Rotimi Amaechi"
          lead="Speaker of the Rivers State House of Assembly, Governor of Rivers State for eight years, and Minister of Transportation from 2015 to 2022, the office that delivered 1,763km of standard gauge rail."
          actions={
            <Button href="/about/amaechi" variant="outline" size="md">
              Who is Amaechi?
              <ArrowRight size={16} strokeWidth={2.75} />
            </Button>
          }
        />

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/about/amaechi", label: "Who is Amaechi?", body: "The public record, office by office." },
            { href: "/planforchange", label: "Plan for Change", body: "The agenda for Nigeria, sector by sector." },
            { href: "/leader", label: "Leadership", body: "The character behind the record." },
            { href: "/news", label: "Newsroom", body: "Statements, coverage and campaign updates." },
          ].map((card, index) => (
            <Reveal key={card.href} delay={index * 60}>
              <Link
                href={card.href}
                className="group flex h-full flex-col border-2 border-ink-100 p-6 transition-colors duration-300 hover:border-ember-500"
              >
                <h3 className="font-display text-lg font-extrabold tracking-tight text-ink-950">
                  {card.label}
                </h3>
                <p className="prose-body mt-2 text-[0.9375rem]">{card.body}</p>
                <ArrowUpRight
                  size={20}
                  strokeWidth={2.5}
                  aria-hidden="true"
                  className="mt-auto pt-6 text-ink-300 transition-colors duration-300 group-hover:text-ember-500"
                />
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ------------------------------------------- national executive */}
      <Section className="bg-ink-950">
        <SectionHeading
          index={4}
          tone="inverse"
          eyebrow="National Executive"
          title="Fifteen offices, named as each is confirmed"
          lead="The National Executive is seeded first and by hand, so that every application from the tiers below has a real officer waiting to decide it. Officers appear here as their appointments are confirmed."
        />

        <ul className="mt-14 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {nationalExecutive.map((office, index) => (
            <Reveal as="li" key={office.code} delay={Math.min(index * 40, 320)} className="bg-ink-950">
              <div className="h-full p-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-[0.9375rem] leading-snug font-bold text-white">
                    {office.title}
                  </h3>
                  {office.authority === "Super Admin" && (
                    <span className="shrink-0 bg-ember-500 px-2 py-0.5 text-[0.5625rem] font-bold tracking-[0.1em] text-ink-950 uppercase">
                      Leads
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[0.8125rem] leading-snug text-white/45">
                  {office.scope}
                </p>
                {/* An honest empty state. A placeholder name here would be a
                    fabricated officer on a political movement's public site. */}
                <p className="mt-5 border-t border-white/10 pt-4 text-[0.6875rem] font-bold tracking-[0.12em] text-white/30 uppercase">
                  To be announced
                </p>
              </div>
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* ------------------------------------------------------------- CTA */}
      <section className="bg-ember-500">
        <div className="shell shell-wide py-16 lg:py-20">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-fluid-3xl text-ink-950">
                Register in under two minutes.
              </h2>
              <p className="mt-4 text-fluid-lg leading-relaxed text-ink-950/70">
                Then find the seat your ward still needs filled.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Button href="/join" variant="dark" size="lg">
                Join MAP
                <ArrowRight size={17} strokeWidth={2.75} />
              </Button>
              <Button href="/structure" variant="outline" size="lg">
                See the structure
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
