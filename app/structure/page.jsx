"use client";

import React, { useMemo, useState } from "react";
import { ChevronRight, Search, ArrowRight, Info } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Counter from "@/components/ui/Counter";
import Reveal from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import {
  tiers,
  seatCapacity,
  totalSeats,
  nationalExecutive,
  executiveTemplate,
  appointmentChain,
  zones,
  allStates,
} from "@/lib/map";

const formatter = new Intl.NumberFormat("en-NG");

export default function Structure() {
  /* The coordinator lookup answers on zone and state only. LGA and ward
     resolution needs the seeded INEC geography tables and the seat register.
     Until those exist, offering three dropdowns that return nothing would be
     worse than offering two that return something true. */
  const [selectedState, setSelectedState] = useState("");

  const match = useMemo(
    () => allStates.find((entry) => entry.name === selectedState),
    [selectedState]
  );

  return (
    <>
      <PageHeader
        breadcrumb="Structure"
        kicker="How MAP is organised"
        title="Five tiers, one register"
        lead="MAP is not a mailing list. It is a chain of accountable offices running from the National Executive down to every ward in Nigeria, and every seat in it is either filled by a named officer or openly vacant."
      >
        <div className="flex flex-wrap gap-3">
          <Button href="/join" variant="inverse" size="lg">
            Register as a member
            <ArrowRight size={17} strokeWidth={2.75} />
          </Button>
          <Button href="#find" variant="inverseOutline" size="lg">
            Find your coordinator
          </Button>
        </div>
      </PageHeader>

      {/* ------------------------------------------------------------ scale */}
      <Section className="bg-white">
        <SectionHeading
          index={1}
          eyebrow="The scale of it"
          title="92,190 seats, and every one of them accounted for"
          lead="Each office at each level exists as a distinct seat in the register from the day the structure is created, whether or not anyone holds it yet. That is what makes a vacancy something you can see, rather than something you have to hear about."
        />

        <div className="mt-14 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <caption className="sr-only">
              Seat capacity by tier across the movement
            </caption>
            <thead>
              <tr className="border-y-2 border-ink-950">
                <th scope="col" className="py-4 pr-4 text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                  Tier
                </th>
                <th scope="col" className="py-4 pr-4 text-right text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                  Units
                </th>
                <th scope="col" className="py-4 pr-4 text-right text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                  Seats per unit
                </th>
                <th scope="col" className="py-4 text-right text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                  Total seats
                </th>
              </tr>
            </thead>
            <tbody>
              {seatCapacity.map((row) => (
                <tr key={row.tier} className="border-b border-ink-200">
                  <th scope="row" className="py-4 pr-4 font-display text-base font-bold tracking-tight text-ink-950">
                    {row.tier}
                  </th>
                  <td className="py-4 pr-4 text-right tabular-nums text-content-muted">
                    {formatter.format(row.units)}
                  </td>
                  <td className="py-4 pr-4 text-right tabular-nums text-content-muted">
                    {row.seatsPerUnit}
                  </td>
                  <td className="py-4 text-right font-display font-extrabold tabular-nums text-ink-950">
                    {formatter.format(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-b-2 border-ink-950">
                <th scope="row" className="py-5 pr-4 font-display text-base font-extrabold tracking-tight text-ink-950">
                  Total
                </th>
                <td />
                <td />
                <td className="py-5 text-right">
                  <Counter
                    value={totalSeats}
                    className="font-display text-fluid-2xl font-extrabold tracking-[-0.04em] text-brand-600 tabular-nums"
                  />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="prose-body mt-6 max-w-2xl text-[0.9375rem]">
          Ward and LGA figures follow the Independent National Electoral
          Commission&rsquo;s official delineation. The ward count is confirmed
          against the current INEC register during data seeding.
        </p>
      </Section>

      {/* ------------------------------------------------------------ tiers */}
      <Section className="bg-ink-50">
        <SectionHeading
          index={2}
          eyebrow="Tier by tier"
          title="From the National Executive to your ward"
        />

        <ol className="mt-14 space-y-px">
          {tiers.map((tier) => (
            <Reveal as="li" key={tier.key} delay={tier.rank * 50}>
              <article className="grid gap-6 bg-white p-6 md:grid-cols-[7rem_1fr_auto] md:items-center md:gap-10 md:p-8">
                <div className="flex items-center gap-4 md:block">
                  <span className="font-display text-fluid-3xl font-extrabold tracking-[-0.04em] text-ink-200 tabular-nums">
                    {String(tier.rank).padStart(2, "0")}
                  </span>
                  <span className="text-[0.6875rem] font-bold tracking-[0.12em] text-ember-600 uppercase md:mt-1 md:block">
                    {tier.name}
                  </span>
                </div>

                <div className="min-w-0">
                  <h3 className="font-display text-lg font-bold tracking-tight text-ink-950">
                    {tier.scope}
                  </h3>
                  <p className="prose-body mt-2 text-[0.9375rem]">{tier.blurb}</p>
                </div>

                <dl className="flex gap-8 md:justify-end md:text-right">
                  <div>
                    <dd className="font-display text-xl font-extrabold text-ink-950 tabular-nums">
                      {formatter.format(tier.units)}
                    </dd>
                    <dt className="mt-1 text-[0.625rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                      {tier.units === 1 ? "Unit" : "Units"}
                    </dt>
                  </div>
                  <div>
                    <dd className="font-display text-xl font-extrabold text-brand-600 tabular-nums">
                      {tier.seatsPerUnit}
                    </dd>
                    <dt className="mt-1 text-[0.625rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                      Seats each
                    </dt>
                  </div>
                </dl>
              </article>
            </Reveal>
          ))}
        </ol>
      </Section>

      {/* -------------------------------------------------------- offices */}
      <Section className="bg-white">
        <SectionHeading
          index={3}
          eyebrow="The offices"
          title="Who holds what, at every level"
          lead="The National Executive carries fifteen offices. Below it, the same executive of five repeats in every zone, every state and every Local Government Area, so a member in Sokoto and a member in Bayelsa are organising inside the identical structure."
        />

        <div className="mt-14">
          <h3 className="border-t-2 border-ink-950 pt-5 font-display text-base font-extrabold tracking-[0.08em] uppercase text-ink-950">
            National Executive: 15 offices
          </h3>
          <ul className="mt-6 grid gap-px bg-ink-200 sm:grid-cols-2 lg:grid-cols-3">
            {nationalExecutive.map((office) => (
              <li key={office.code} className="bg-white p-5">
                <p className="font-display text-[0.9375rem] leading-snug font-bold text-ink-950">
                  {office.title}
                </p>
                <p className="mt-1.5 text-[0.8125rem] leading-snug text-content-subtle">
                  {office.scope}
                </p>
                <p className="mt-3 inline-block bg-ink-100 px-2 py-1 font-mono text-[0.6875rem] font-bold tracking-wider text-ink-600">
                  {office.code}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-2">
          {Object.entries(executiveTemplate).map(([key, group]) => (
            <div key={key}>
              <h3 className="border-t-2 border-ink-950 pt-5 font-display text-base font-extrabold tracking-[0.08em] uppercase text-ink-950">
                {group.label}
              </h3>
              <p className="mt-2 text-[0.8125rem] font-bold tracking-[0.1em] text-ember-600 uppercase">
                {group.perUnit}
              </p>
              <ul className="mt-5 divide-y divide-ink-200 border-y border-ink-200">
                {group.offices.map((office) => (
                  <li
                    key={office.code}
                    className="flex items-center justify-between gap-4 py-3.5"
                  >
                    <span className="min-w-0">
                      <span className="block font-display text-[0.9375rem] font-bold text-ink-950">
                        {office.title}
                        {office.seats > 1 && (
                          <span className="ml-2 font-sans text-[0.8125rem] font-medium text-content-subtle">
                            &times; {office.seats}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block font-mono text-[0.6875rem] tracking-wider text-ink-500">
                        {office.code}
                      </span>
                    </span>
                    {office.admin && (
                      <span className="shrink-0 bg-brand-50 px-2.5 py-1 text-[0.625rem] font-bold tracking-[0.1em] text-brand-700 uppercase">
                        Coordinates
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* --------------------------------------------------- find coordinator */}
      <Section id="find" className="scroll-mt-32 bg-ink-950">
        <SectionHeading
          index={4}
          tone="inverse"
          eyebrow="Find your coordinator"
          title="Know who is responsible for your area"
          lead="Select your state to see the zone it belongs to and the offices that answer for it."
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-[22rem_1fr]">
          <Reveal>
            <label
              htmlFor="state"
              className="block text-[0.6875rem] font-bold tracking-[0.12em] text-white/50 uppercase"
            >
              Your state
            </label>
            <div className="relative mt-3">
              <Search
                size={18}
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-white/40"
              />
              <select
                id="state"
                value={selectedState}
                onChange={(event) => setSelectedState(event.target.value)}
                className="h-14 w-full appearance-none border-2 border-white/25 bg-transparent pr-4 pl-12 font-display text-[0.9375rem] font-bold text-white transition-colors focus:border-ember-500 focus:outline-none"
              >
                <option value="" className="bg-ink-950">
                  Select a state&hellip;
                </option>
                {allStates.map((entry) => (
                  <option key={entry.name} value={entry.name} className="bg-ink-950">
                    {entry.name}
                  </option>
                ))}
              </select>
            </div>
          </Reveal>

          <Reveal delay={90}>
            {match ? (
              <div className="border-2 border-white/20 p-6 sm:p-8">
                <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ember-400 uppercase">
                  {match.name}
                </p>
                <p className="mt-3 font-display text-fluid-xl font-extrabold tracking-[-0.02em] text-white">
                  {match.zone} zone
                </p>

                <ul className="mt-7 space-y-px">
                  {[
                    { office: `${match.zone} Coordinator`, level: "National Executive" },
                    { office: "State Coordinator", level: `${match.name} State Executive` },
                    { office: "LGA Coordinator", level: "Your Local Government Area" },
                    { office: "Ward Coordinator", level: "Your ward" },
                  ].map((row) => (
                    <li
                      key={row.office}
                      className="flex flex-wrap items-center justify-between gap-3 bg-white/5 px-5 py-4"
                    >
                      <span>
                        <span className="block font-display text-[0.9375rem] font-bold text-white">
                          {row.office}
                        </span>
                        <span className="mt-0.5 block text-[0.8125rem] text-white/50">
                          {row.level}
                        </span>
                      </span>
                      <span className="shrink-0 border border-ember-500/50 px-2.5 py-1 text-[0.625rem] font-bold tracking-[0.1em] text-ember-400 uppercase">
                        To be announced
                      </span>
                    </li>
                  ))}
                </ul>

                <p className="mt-6 flex items-start gap-2.5 text-[0.8125rem] leading-relaxed text-white/50">
                  <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  Officers are named here as each seat is filled by the authority
                  above it. Where a seat shows as unfilled, it is waiting on that
                  appointment — coordinators appoint from the members already
                  registered in the territory.
                </p>

                <div className="mt-7">
                  <Button href="/join" variant="ember" size="md">
                    Register in {match.name}
                    <ArrowRight size={16} strokeWidth={2.75} />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[16rem] items-center justify-center border-2 border-dashed border-white/15 p-8 text-center">
                <p className="max-w-sm text-[0.9375rem] leading-relaxed text-white/40">
                  Choose a state to see its zone and the chain of offices
                  responsible for it.
                </p>
              </div>
            )}
          </Reveal>
        </div>

        {/* Zone reference */}
        <div className="mt-16 border-t border-white/15 pt-12">
          <h3 className="text-[0.6875rem] font-bold tracking-[0.12em] text-white/50 uppercase">
            The six zones
          </h3>
          <div className="mt-7 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {zones.map((zone) => (
              <div key={zone.code} className="bg-ink-950 p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-base font-extrabold text-white">
                    {zone.name}
                  </p>
                  <span className="font-mono text-[0.6875rem] tracking-wider text-ember-400">
                    {zone.code}
                  </span>
                </div>
                <p className="mt-3 text-[0.8125rem] leading-relaxed text-white/50">
                  {zone.states.join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------- approval chain */}
      <Section className="bg-white">
        <SectionHeading
          index={5}
          eyebrow="How appointments work"
          title="Every seat is filled by exactly one office"
          lead="Office in MAP is given, not requested. Nobody applies for a seat. Each one is filled by the single named officer the structure puts above it, appointing from the members registered in that territory, and the appointment is recorded permanently against the name of the officer who made it."
        />

        <div className="mt-14 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <caption className="sr-only">
              Which officer appoints to each seat
            </caption>
            <thead>
              <tr className="border-y-2 border-ink-950">
                <th scope="col" className="py-4 pr-6 text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                  Seat
                </th>
                <th scope="col" className="py-4 pr-6 text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                  Tier
                </th>
                <th scope="col" className="py-4 text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                  Appointed by
                </th>
              </tr>
            </thead>
            <tbody>
              {appointmentChain.map((row) => (
                <tr key={row.seat} className="border-b border-ink-200">
                  <th scope="row" className="py-4 pr-6 font-display text-[0.9375rem] font-bold text-ink-950">
                    {row.seat}
                  </th>
                  <td className="py-4 pr-6">
                    <span className="bg-ink-100 px-2.5 py-1 text-[0.625rem] font-bold tracking-[0.1em] text-ink-600 uppercase">
                      {row.tier}
                    </span>
                  </td>
                  <td className="py-4 text-[0.9375rem] text-content-muted">
                    <span className="flex items-center gap-2">
                      <ChevronRight size={15} className="shrink-0 text-ember-500" aria-hidden="true" />
                      {row.appointedBy}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-12 grid gap-6 border-t-2 border-ink-950 pt-10 md:grid-cols-3">
          {[
            {
              title: "Appointed from the register",
              body: "A coordinator appoints from the members already registered in the territory they answer for. Registering is what puts you in front of them; there is nothing further to submit.",
            },
            {
              title: "No dead ends",
              body: "If the appointing seat is itself vacant, the power to fill the seat rests with the tier above it. The National Coordinator, as Super Admin, may appoint anywhere in the structure.",
            },
            {
              title: "Permanently logged",
              body: "Every appointment and every removal carries the name of the officer who made it, a timestamp and a recorded reason.",
            },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="font-display text-base font-extrabold tracking-tight text-ink-950">
                {item.title}
              </h3>
              <p className="prose-body mt-2 text-[0.9375rem]">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ------------------------------------------------------------- CTA */}
      <section className="bg-brand-700">
        <div className="shell shell-wide py-16 lg:py-20">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-fluid-3xl text-white">
                Every ward matters. Be counted in yours.
              </h2>
              <p className="mt-4 text-fluid-lg leading-relaxed text-white/70">
                Registration takes under two minutes, and it is the only step
                there is. Officers are appointed from the register.
              </p>
            </div>
            <div className="shrink-0">
              <Button href="/join" variant="inverse" size="lg">
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
