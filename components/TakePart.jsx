"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import Reveal from "@/components/ui/Reveal";
import { useJoinTarget } from "@/components/JoinCta";

/**
 * "Two ways in" — the pair of cards under the homepage's fourth heading.
 *
 * A client component only so the first card can recognise a member who has
 * already registered. For everybody else it renders exactly what it did
 * before, and the second card never changes at all.
 */
export default function TakePart() {
  const join = useJoinTarget();

  const cards = [
    join,
    {
      href: "/activities",
      title: "Turn up",
      body: "Congresses, rallies and registration drives, listed by zone and state.",
    },
  ];

  return (
    <ul className="mt-14 grid gap-px bg-ink-200 md:grid-cols-2">
      {cards.map((card, index) => (
        <Reveal as="li" key={card.href} delay={index * 70} className="bg-white">
          <Link
            href={card.href}
            className="group flex h-full items-start justify-between gap-6 p-8 transition-colors duration-300 hover:bg-ink-50"
          >
            <span className="min-w-0">
              <span className="block font-display text-fluid-lg font-extrabold tracking-tight text-ink-950">
                {card.title}
              </span>
              <span className="mt-2 block max-w-sm text-[0.9375rem] leading-relaxed text-content-muted">
                {card.body}
              </span>
            </span>
            <ArrowUpRight
              size={22}
              strokeWidth={2.5}
              className="mt-1 shrink-0 text-ink-300 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ember-600"
              aria-hidden="true"
            />
          </Link>
        </Reveal>
      ))}
    </ul>
  );
}
