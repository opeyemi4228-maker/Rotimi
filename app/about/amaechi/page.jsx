import React from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Counter from "@/components/ui/Counter";
import Reveal from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { assets } from "@/assets/assets";
import { bio, record, offices } from "@/lib/amaechi";
import JoinCta from "@/components/JoinCta";

export const metadata = {
  title: "Who is Amaechi",
  description:
    "Rt. Hon. Chibuike Rotimi Amaechi: Speaker, Governor of Rivers State, Federal Minister of Transportation. The public record, office by office.",
};

export default function WhoIsAmaechi() {
  return (
    <>
      <PageHeader
        breadcrumb="Who is Amaechi"
        kicker="The aspirant"
        title="Who is Amaechi?"
        lead="Three decades in public service: Speaker of the Rivers State House of Assembly, Governor of Rivers State, and Federal Minister of Transportation."
        image={assets.Amaechi1}
      />

      {/* ------------------------------------------------------------- bio */}
      <Section className="bg-white">
        <div className="grid gap-14 lg:grid-cols-[1fr_20rem] lg:gap-20">
          <div className="min-w-0">
            <SectionHeading index={1} eyebrow="In brief" title="The short answer" />
            <div className="prose-body mt-12 space-y-5">
              {bio.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* The record, as four figures. Anything more belongs on the plan. */}
          <aside className="min-w-0">
            <h2 className="border-t-2 border-ink-950 pt-5 text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
              The record
            </h2>
            <dl className="mt-6 divide-y divide-ink-200 border-b border-ink-200">
              {record.map((item) => (
                <div key={item.label} className="flex items-baseline gap-4 py-4">
                  <dd className="flex shrink-0 items-baseline gap-1">
                    <Counter
                      value={item.value}
                      suffix={item.suffix}
                      className="font-display text-fluid-xl font-extrabold tracking-[-0.04em] text-brand-600 tabular-nums"
                    />
                    {item.unit && (
                      <span className="font-display text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                        {item.unit}
                      </span>
                    )}
                  </dd>
                  <dt className="text-[0.8125rem] leading-snug text-content-muted">
                    {item.label}
                  </dt>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </Section>

      {/* --------------------------------------------------------- offices */}
      <Section className="bg-ink-50">
        <SectionHeading
          index={2}
          eyebrow="Public offices held"
          title="Office by office, 1992 to 2022"
        />

        <ol className="mt-14 space-y-px">
          {offices.map((office, index) => (
            <Reveal as="li" key={office.id} delay={index * 60}>
              <article className="grid gap-6 bg-white p-6 md:grid-cols-[13rem_1fr] md:gap-10 md:p-8">
                <div className="min-w-0">
                  <div className="relative aspect-4/3 w-full overflow-hidden md:aspect-square">
                    <Image
                      src={office.image}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 13rem, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <p className="mt-4 font-display text-[0.6875rem] font-bold tracking-[0.12em] text-ember-600 uppercase">
                    {office.period}
                  </p>
                </div>

                <div className="min-w-0">
                  <h3 className="font-display text-fluid-xl leading-tight font-extrabold tracking-[-0.02em] text-ink-950">
                    {office.title}
                  </h3>
                  <p className="mt-1.5 text-[0.8125rem] font-bold tracking-[0.1em] text-ink-500 uppercase">
                    {office.location}
                  </p>
                  <p className="prose-body mt-4 text-[0.9375rem]">
                    {office.description}
                  </p>
                  <ul className="mt-5 space-y-2 border-t border-ink-200 pt-5">
                    {office.achievements.map((item) => (
                      <li
                        key={item}
                        className="flex gap-3 text-[0.875rem] leading-snug text-content-muted"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-1.5 size-1.5 shrink-0 bg-brand-600"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </Reveal>
          ))}
        </ol>
      </Section>

      {/* ------------------------------------------------------------- CTA */}
      <section className="bg-brand-700">
        <div className="shell shell-wide py-16 lg:py-20">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-fluid-3xl text-white">
                That is the record. This is the plan.
              </h2>
              <p className="mt-4 text-fluid-lg leading-relaxed text-white/70">
                What he intends to do with the presidency, sector by sector.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Button href="/planforchange" variant="inverse" size="lg">
                Plan for Change
                <ArrowRight size={17} strokeWidth={2.75} />
              </Button>
              <JoinCta variant="inverseOutline" size="lg" arrow={false} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
