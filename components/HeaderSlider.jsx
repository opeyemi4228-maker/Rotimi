"use client";

import React from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { assets } from "@/assets/assets";
import Button from "@/components/ui/Button";
import Counter from "@/components/ui/Counter";
import Reveal from "@/components/ui/Reveal";
import BrandIcon from "@/components/ui/BrandIcon";
import { socials } from "@/lib/site";

/* The movement's own scale, not the aspirant's record. This is MAP's front
   door, and his record has a page of its own. Four figures is the most a reader
   absorbs above the fold. */
const proof = [
  { value: 37, suffix: "", label: "States and the FCT" },
  { value: 774, suffix: "", label: "Local Government Areas" },
  { value: 8809, suffix: "", label: "Wards nationwide" },
  { value: 92190, suffix: "", label: "Seats in the structure" },
];

export default function Hero() {
  return (
    <section className="relative border-b-2 border-ink-950 bg-white">
      <div className="shell shell-wide">
        <div className="grid lg:grid-cols-[1fr_0.82fr]">
          {/* ------------------------------------------------------ copy */}
          <div className="flex flex-col justify-center py-10 lg:py-12 lg:pr-14">
            <Reveal>
              <p className="eyebrow">
                <span className="text-ember-600">01</span>
                Movement for Amaechi Presidency
              </p>
            </Reveal>

            {/* One h1 per page. The masthead already carries the name, so the
                hero leads with the argument rather than repeating it three
                times in three different colours. */}
            <Reveal delay={70}>
              <h1 className="mt-5 text-fluid-5xl text-ink-950">
                Every ward
                <br />
                <span className="text-brand-600">matters.</span>
              </h1>
            </Reveal>

            <Reveal delay={140}>
              <p className="prose-body mt-5">
                MAP is organising in all 36 states, the Federal Capital
                Territory, 774 Local Government Areas and over 8,000 wards,
                behind the presidential aspiration of Rt. Hon. Chibuike Rotimi
                Amaechi. Registration takes under two minutes.
              </p>
            </Reveal>

            <Reveal delay={210}>
              <div className="mt-7 flex flex-col gap-0 sm:flex-row">
                <Button href="/join" variant="dark" size="lg">
                  Join MAP
                  <ArrowRight
                    size={17}
                    strokeWidth={3}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </Button>
                <Button
                  href="/structure"
                  variant="outline"
                  size="lg"
                  className="sm:-ml-0.5"
                >
                  Our Structure
                </Button>
              </div>
            </Reveal>

            {/* Record strip: one ruled row of figures, not four floating
                cards of three different widths. */}
            <Reveal delay={280}>
              {/* min-content tracks, not plain 1fr: Tailwind's grid-cols-N is
                  minmax(0,1fr), which lets a long figure ("11,300+") overrun
                  its track and paint over the next hairline. The floor keeps
                  every figure on one line and only ever wraps the labels.

                  Hairlines sit between figures. Each breakpoint owns its own
                  row-start rule (max-sm/sm never both match), so the reset does not
                  depend on order and no border or indent hangs off the left
                  edge of a row. */}
              <dl
                className={[
                  "mt-10 grid border-t-2 border-ink-950",
                  "grid-cols-[repeat(2,minmax(min-content,1fr))]",
                  "sm:grid-cols-[repeat(4,minmax(min-content,1fr))]",
                  "[&>div]:border-l [&>div]:border-ink-200 [&>div]:pl-5",
                  "max-sm:[&>div:nth-child(2n+1)]:border-l-0 max-sm:[&>div:nth-child(2n+1)]:pl-0",
                  "sm:[&>div:nth-child(4n+1)]:border-l-0 sm:[&>div:nth-child(4n+1)]:pl-0",
                ].join(" ")}
              >
                {proof.map((item) => (
                  <div key={item.label} className="flex flex-col py-5 pr-5">
                    <dt className="sr-only">{item.label}</dt>
                    {/* Labels are bottom-aligned so a figure whose label wraps
                        to two lines still shares a baseline with the rest. */}
                    <dd className="flex flex-1 flex-col">
                      <Counter
                        value={item.value}
                        suffix={item.suffix}
                        className="block font-display text-fluid-2xl font-extrabold tracking-[-0.04em] text-ink-950 tabular-nums"
                      />
                      <span
                        aria-hidden="true"
                        className="mt-auto block pt-2 text-[0.6875rem] leading-tight font-bold tracking-[0.08em] text-ink-500 uppercase"
                      >
                        {item.label}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          {/* -------------------------------------------------- portrait */}
          <div className="relative lg:-mr-[max(1.25rem,calc((100vw-110rem)/2+5rem))]">
            {/* Runs to the right edge of the viewport. The image is
                the block, with no frame, radius or drop shadow around it.
                Capped so the hero never eats a whole tall screen. */}
            <div className="relative h-[42vh] max-h-[34rem] min-h-[18rem] w-full lg:h-full lg:max-h-none lg:min-h-[30rem]">
              <Image
                src={assets.Amaechi10}
                alt="Rt. Hon. Chibuike Rotimi Amaechi"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 46vw"
                className="object-cover object-top"
              />

              {/* Name plate, set into the corner of the image. */}
              <div className="absolute bottom-0 left-0 bg-ink-950 px-6 py-5 text-white sm:px-8">
                <p className="text-[0.625rem] font-bold tracking-[0.24em] text-white/60 uppercase">
                  Rt. Hon.
                </p>
                <p className="mt-1.5 font-display text-xl font-extrabold tracking-[-0.03em] sm:text-2xl">
                  Chibuike Rotimi Amaechi
                </p>
                <p className="mt-1 text-[0.6875rem] font-bold tracking-[0.2em] text-ember-400 uppercase">
                  CON · KSJ
                </p>
              </div>

              {/* Socials, docked to the image edge rather than floating loose
                  over the page as absolutely-positioned icons8 PNGs. */}
              <div className="absolute top-0 right-0 flex">
                {socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="grid size-11 place-items-center bg-ink-950 text-white transition-colors duration-300 hover:bg-ember-500 hover:text-ink-950 sm:size-12"
                  >
                    <BrandIcon name={social.icon} className="size-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
