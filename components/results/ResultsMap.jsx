"use client";

import { useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The choropleth: Nigeria, coloured by who is leading where.
 *
 * ── COLOUR IS NEVER THE ONLY ENCODING ──────────────────────────────────────
 * PDP is red and APC is green, which is the one pair the commonest form of
 * colour blindness cannot separate — roughly one man in twelve would see two
 * states of the same muddy tone and have no way to tell which is which. No
 * choice of hex fixes that; it is how the eye works.
 *
 * So every unit that has reported carries the leading party's code across it in
 * type, the tooltip names the party in words, and the table beneath the map is
 * the same data with no colour in it at all. The colour is the fast read; the
 * letters are the true one.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * ── AND SILENCE IS NOT ZERO ────────────────────────────────────────────────
 * A unit nobody has reported from is drawn in flat grey with no label, never in
 * a party's colour and never as a low number. On election night the difference
 * between "nobody is winning here" and "nobody has told us yet" is the whole
 * story, and a map that blurs the two is a map that lies early in the evening.
 * ───────────────────────────────────────────────────────────────────────────
 */
/* `href` is precomputed onto each unit by the server rather than passed as a
   `hrefFor` callback: a function cannot cross into a client component, and
   working out a link is the server's job anyway. */
export default function ResultsMap({ shapes, results, className }) {
  const [hovered, setHovered] = useState(null);

  const byUnit = new Map(results.map((row) => [row.unitId, row]));
  const active = hovered ? byUnit.get(hovered.unitId) : null;

  return (
    <div className={cn("relative", className)}>
      <svg
        /* A state map keeps the national projection but crops the window to
           what it draws, so `viewBox` may not start at the origin. Positioning
           the tooltip therefore has to subtract that offset — see below. */
        viewBox={shapes.viewBox ?? `0 0 ${shapes.width} ${shapes.height}`}
        className="w-full"
        role="img"
        aria-label="Nigeria, coloured by the leading party in each reporting area"
        onPointerLeave={() => setHovered(null)}
      >
        {shapes.units.map((unit) => {
          const result = byUnit.get(unit.id);
          const leader = result?.leader;
          const href = unit.href;

          const shape = (
            <path
              d={unit.d}
              fill={leader ? leader.colour : "#E7E5E1"}
              stroke="#FFFFFF"
              strokeWidth="1.5"
              // A reported unit is fully saturated; the rest of the map recedes.
              className={cn(
                "transition-opacity duration-200",
                hovered && hovered.unitId !== unit.id ? "opacity-60" : "opacity-100",
                href && "cursor-pointer"
              )}
            />
          );

          return (
            <g
              key={unit.id}
              onPointerEnter={() => setHovered({ unitId: unit.id, unit })}
              onFocus={() => setHovered({ unitId: unit.id, unit })}
            >
              {href ? (
                <Link href={href} aria-label={`${unit.name} results`}>
                  {shape}
                </Link>
              ) : (
                shape
              )}

              {/* The party code, in type, on every unit that has reported and
                  is big enough to hold three characters. */}
              {leader && unit.at && (
                <text
                  x={unit.at[0]}
                  y={unit.at[1]}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none select-none"
                  style={{
                    fontSize: shapes.labelSize ?? 13,
                    fontWeight: 800,
                    fill: "#FFFFFF",
                    paintOrder: "stroke",
                    stroke: "rgba(0,0,0,0.35)",
                    strokeWidth: 3,
                    strokeLinejoin: "round",
                  }}
                >
                  {leader.code}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip in HTML: it wraps, it inherits the type scale, and it never
          has to be measured by hand. */}
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 border-2 border-ink-950 bg-ink-950 px-4 py-3 text-white shadow-e3"
          style={{
            left: `${((hovered.unit.at[0] - (shapes.offsetX ?? 0)) / shapes.width) * 100}%`,
            top: `${((hovered.unit.at[1] - (shapes.offsetY ?? 0)) / shapes.height) * 100}%`,
            transform: "translate(-50%, -120%)",
          }}
        >
          <p className="font-display text-[0.875rem] font-extrabold tracking-tight">
            {hovered.unit.name}
          </p>
          {active?.leader ? (
            <>
              <p className="mt-1.5 flex items-center gap-2 whitespace-nowrap text-[0.8125rem]">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0"
                  style={{ background: active.leader.colour }}
                />
                <span className="font-bold">{active.leader.code}</span>
                <span className="text-ink-300">leading</span>
                <span className="font-bold tabular-nums">{active.leaderShare}%</span>
              </p>
              <p className="mt-1 text-[0.75rem] text-ink-400 tabular-nums">
                {active.total.toLocaleString()} votes ·{" "}
                {(active.unitsReported ?? 0).toLocaleString()} units in
              </p>
            </>
          ) : (
            <p className="mt-1.5 text-[0.8125rem] text-ink-400">No returns yet</p>
          )}
        </div>
      )}
    </div>
  );
}
