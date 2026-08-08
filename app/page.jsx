import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Hero from "@/components/HeaderSlider";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { assets } from "@/assets/assets";
import { tiers } from "@/lib/map";
import { latestNews } from "@/lib/news";

/* This page is MAP's, not Amaechi's.
   It used to run eight sections of his record: the offices he held, twelve
   achievement cards, a grid of leadership qualities and a newsroom rail,
   roughly 1,100 lines answering a question nobody had asked yet. All of that is
   now one page, /about/amaechi, reached from the section below.

   What stays here is only what a visitor needs on a first visit: what this
   movement is, how big it is, who it is for, and how to join. Five sections. */
export default function Home() {
  return (
    <>
      <Hero />

      {/* ------------------------------------------------------- mission */}
      <section className="bg-brand-700">
        <div className="shell shell-wide py-14 lg:py-16">
          <Reveal>
            <p className="max-w-4xl text-fluid-2xl leading-tight font-bold text-white">
              A disciplined, verifiable national structure, built ward by ward,
              recorded in one register, and accountable from the smallest ward
              office to the National Coordinator.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------- structure */}
      <Section className="bg-white">
        <SectionHeading
          index={2}
          eyebrow="How we are organised"
          title="Five tiers, from the ward up"
          lead="Every office at every level exists as a named seat: filled by a named officer, or openly vacant and waiting on the authority above it to appoint."
          actions={
            <Button href="/structure" variant="outline" size="md">
              See the full structure
              <ArrowRight size={16} strokeWidth={2.75} />
            </Button>
          }
        />

        <ol className="mt-14 grid gap-px bg-ink-200 sm:grid-cols-2 lg:grid-cols-5">
          {tiers.map((tier, index) => (
            <Reveal as="li" key={tier.key} delay={index * 60} className="bg-white">
              <div className="h-full p-6">
                <span className="font-display text-fluid-2xl font-extrabold tracking-[-0.04em] text-ink-200 tabular-nums">
                  {String(tier.rank).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-display text-lg font-extrabold tracking-tight text-ink-950">
                  {tier.name}
                </h3>
                <p className="mt-1.5 text-[0.8125rem] leading-snug text-content-subtle">
                  {tier.scope}
                </p>
                <p className="mt-5 border-t border-ink-200 pt-4 text-[0.6875rem] font-bold tracking-[0.12em] text-ember-600 uppercase">
                  {tier.seatsPerUnit} seats each
                </p>
              </div>
            </Reveal>
          ))}
        </ol>
      </Section>

      {/* --------------------------------------------------- who is amaechi */}
      <Section className="bg-ink-50">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1fr] lg:gap-20">
          <Reveal>
            <div className="relative aspect-4/5 w-full max-w-md">
              <Image
                src={assets.Amaechi1}
                alt="Rt. Hon. Chibuike Rotimi Amaechi"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover object-top"
              />
            </div>
          </Reveal>

          <div className="min-w-0">
            <SectionHeading
              index={3}
              eyebrow="The aspirant"
              title="Who is Amaechi?"
              lead="Speaker of the Rivers State House of Assembly. Governor of Rivers State for eight years. Federal Minister of Transportation from 2015 to 2022, the office that delivered 1,763km of standard gauge rail and created more than 11,300 jobs."
            />

            <div className="mt-9 flex flex-wrap gap-3">
              <Button href="/about/amaechi" variant="dark" size="lg">
                Read his record
                <ArrowRight size={17} strokeWidth={2.75} />
              </Button>
              <Button href="/planforchange" variant="outline" size="lg">
                Plan for Change
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------ take part */}
      <Section className="bg-white">
        <SectionHeading index={4} eyebrow="Take part" title="Two ways in" />

        <ul className="mt-14 grid gap-px bg-ink-200 md:grid-cols-2">
          {[
            {
              href: "/join",
              title: "Register as a member",
              body: "Under two minutes. Your ward, your state, your membership number.",
            },
            {
              href: "/activities",
              title: "Turn up",
              body: "Congresses, rallies and registration drives, listed by zone and state.",
            },
          ].map((card, index) => (
            <Reveal as="li" key={card.href} delay={index * 70} className="bg-white">
              <Link
                href={card.href}
                className="group flex h-full flex-col p-7 transition-colors duration-300 hover:bg-ink-50"
              >
                <h3 className="font-display text-lg font-extrabold tracking-tight text-ink-950">
                  {card.title}
                </h3>
                <p className="prose-body mt-2.5 text-[0.9375rem]">{card.body}</p>
                <ArrowUpRight
                  size={20}
                  strokeWidth={2.5}
                  aria-hidden="true"
                  className="mt-auto pt-6 text-ink-300 transition-colors duration-300 group-hover:text-ember-500"
                />
              </Link>
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* ---------------------------------------------------------- news */}
      <Section className="bg-ink-50">
        <SectionHeading
          index={5}
          eyebrow="Latest"
          title="From the newsroom"
          actions={
            <Button href="/news" variant="outline" size="md">
              All news
              <ArrowRight size={16} strokeWidth={2.75} />
            </Button>
          }
        />

        {/* Three headlines, from the same source the newsroom reads. A preview
            is a pointer, not a second newsroom: no excerpts, no read times,
            no share buttons. */}
        <ul className="mt-14 grid gap-px bg-ink-200 md:grid-cols-3">
          {latestNews.slice(0, 3).map((article, index) => (
            <Reveal as="li" key={article.id} delay={index * 70} className="bg-white">
              <Link
                href="/news"
                className="group flex h-full flex-col transition-colors duration-300 hover:bg-white"
              >
                <div className="relative aspect-16/10 w-full overflow-hidden">
                  <Image
                    src={article.image}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <p className="text-[0.625rem] font-bold tracking-[0.12em] text-ember-600 uppercase">
                    {article.category}
                  </p>
                  <h3 className="mt-3 font-display text-base leading-snug font-extrabold tracking-tight text-ink-950 transition-colors duration-300 group-hover:text-brand-700">
                    {article.title}
                  </h3>
                  <p className="mt-auto pt-5 text-[0.8125rem] text-content-subtle">
                    {article.date}
                  </p>
                </div>
              </Link>
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
                Every ward matters. Register in under two minutes.
              </h2>
            </div>
            <div className="shrink-0">
              <Button href="/join" variant="dark" size="lg">
                Join MAP
                <ArrowRight size={17} strokeWidth={2.75} />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
