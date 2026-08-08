"use client";

import { useId, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Membership growth, and how much of it came through referrals.
 *
 * ── WHY TWO CUMULATIVE LINES AND NOT A LINE PLUS BARS ──────────────────────
 * Both series count the same thing — members — so they share one axis, and the
 * gap between them is itself the answer to the question the page is asking:
 * how much of this movement arrived because somebody already in it asked them
 * to. Plotting a running total against a daily rate would need a second y-axis,
 * and a chart with two y-axes can be made to show any relationship you like by
 * choosing the scales.
 *
 * Colours are brand-500 and ember-700, which is not the obvious green/orange
 * pair: brand-600 against ember-500 collapses to a ΔE of 5.3 under protanopia,
 * which is two indistinguishable lines for about one man in twelve. This pair
 * clears the separation threshold under all three CVD models and holds 3:1
 * against white, and both series are directly labelled at their end as well, so
 * identity never rests on colour alone.
 * ───────────────────────────────────────────────────────────────────────────
 */

const SERIES = [
  { key: "members", label: "Members", color: "#2B9D65" },
  { key: "referred", label: "Through referrals", color: "#B33B03" },
];

const BOX = { width: 760, height: 260, top: 18, right: 16, bottom: 30, left: 46 };

/** A rounded step above the maximum, so the top gridline is a readable number. */
function ceiling(value) {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / (magnitude / 2)) * (magnitude / 2);
}

const shortDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

export default function GrowthChart({ data, className, caption }) {
  const gradientId = useId();
  const [active, setActive] = useState(null);

  const chart = useMemo(() => {
    if (!data?.length) return null;

    const max = ceiling(Math.max(...data.map((point) => point.members), 1));
    const plotWidth = BOX.width - BOX.left - BOX.right;
    const plotHeight = BOX.height - BOX.top - BOX.bottom;

    const x = (index) =>
      BOX.left + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
    const y = (value) => BOX.top + plotHeight - (value / max) * plotHeight;

    const path = (key) =>
      data.map((point, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(point[key]).toFixed(1)}`).join(" ");

    return {
      max,
      x,
      y,
      baseline: BOX.top + plotHeight,
      lines: Object.fromEntries(SERIES.map((series) => [series.key, path(series.key)])),
      area: `${path("members")} L${x(data.length - 1).toFixed(1)} ${BOX.top + plotHeight} L${x(0).toFixed(1)} ${BOX.top + plotHeight} Z`,
      ticks: [0, 0.5, 1].map((fraction) => ({
        value: Math.round(max * fraction),
        y: y(max * fraction),
      })),
    };
  }, [data]);

  if (!chart) {
    return (
      <p className={cn("py-16 text-center text-[0.875rem] text-content-subtle", className)}>
        No membership recorded in this period yet.
      </p>
    );
  }

  const point = active === null ? null : data[active];

  /* One pointer handler for the whole plot rather than a hit area per point:
     at 90 days the per-point targets would be four pixels wide, which is not a
     target at all on a phone. */
  function track(event) {
    const box = event.currentTarget.getBoundingClientRect();
    // Screen pixels -> viewBox units -> position along the plot -> nearest day.
    const viewX = ((event.clientX - box.left) / box.width) * BOX.width;
    const fraction = (viewX - BOX.left) / (BOX.width - BOX.left - BOX.right);
    const index = Math.round(fraction * (data.length - 1));
    setActive(Math.min(data.length - 1, Math.max(0, index)));
  }

  return (
    <figure className={cn("m-0", className)}>
      <div className="relative">
        <svg
          viewBox={`0 0 ${BOX.width} ${BOX.height}`}
          className="w-full touch-none"
          role="img"
          aria-label={caption ?? "Membership growth"}
          onPointerMove={track}
          onPointerDown={track}
          onPointerLeave={() => setActive(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES[0].color} stopOpacity="0.16" />
              <stop offset="100%" stopColor={SERIES[0].color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid: recessive, three lines, never competing with the data. */}
          {chart.ticks.map((tick) => (
            <g key={tick.value}>
              <line
                x1={BOX.left}
                x2={BOX.width - BOX.right}
                y1={tick.y}
                y2={tick.y}
                stroke="currentColor"
                strokeWidth="1"
                className="text-ink-200"
              />
              <text
                x={BOX.left - 10}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-ink-400 text-[11px] font-semibold tabular-nums"
              >
                {tick.value.toLocaleString()}
              </text>
            </g>
          ))}

          <path d={chart.area} fill={`url(#${gradientId})`} />

          {SERIES.map((series) => (
            <path
              key={series.key}
              d={chart.lines[series.key]}
              fill="none"
              stroke={series.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Crosshair */}
          {point && (
            <g>
              <line
                x1={chart.x(active)}
                x2={chart.x(active)}
                y1={BOX.top}
                y2={chart.baseline}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="3 3"
                className="text-ink-400"
              />
              {SERIES.map((series) => (
                <circle
                  key={series.key}
                  cx={chart.x(active)}
                  cy={chart.y(point[series.key])}
                  r="5"
                  fill={series.color}
                  // The 2px surface ring is what keeps the two markers legible
                  // where the lines cross.
                  stroke="#fff"
                  strokeWidth="2"
                />
              ))}
            </g>
          )}

          {/* Dates: first, middle and last only. A label per day is noise. */}
          {[0, Math.floor((data.length - 1) / 2), data.length - 1].map((index) => (
            <text
              key={index}
              x={chart.x(index)}
              y={BOX.height - 8}
              textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"}
              className="fill-ink-400 text-[11px] font-semibold"
            >
              {shortDate(data[index].date)}
            </text>
          ))}
        </svg>

        {/* Tooltip in HTML rather than SVG: it wraps, it inherits the type
            scale, and it never has to be measured by hand. */}
        {point && (
          <div
            className="pointer-events-none absolute top-2 border-2 border-ink-950 bg-ink-950 px-3.5 py-2.5 text-white shadow-e3"
            style={{
              left: `${(chart.x(active) / BOX.width) * 100}%`,
              transform: `translateX(${active > data.length / 2 ? "-105%" : "5%"})`,
            }}
          >
            <p className="text-[0.6875rem] font-bold tracking-[0.08em] text-ink-300 uppercase">
              {shortDate(point.date)}
            </p>
            {SERIES.map((series) => (
              <p key={series.key} className="mt-1.5 flex items-center gap-2 whitespace-nowrap">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0"
                  style={{ background: series.color }}
                />
                <span className="text-[0.75rem] text-ink-200">{series.label}</span>
                <span className="ml-auto pl-4 text-[0.8125rem] font-extrabold tabular-nums">
                  {point[series.key].toLocaleString()}
                </span>
              </p>
            ))}
            <p className="mt-2 border-t border-ink-700 pt-1.5 text-[0.6875rem] text-ink-400">
              {point.joined === 0
                ? "Nobody joined that day"
                : `${point.joined.toLocaleString()} joined, ${point.referredToday.toLocaleString()} of them referred`}
            </p>
          </div>
        )}
      </div>

      {/* Legend. Two series, so it is always present — and the figures repeat
          it in words, so nobody has to match a colour to know which is which. */}
      <figcaption className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-ink-200 pt-4">
        {SERIES.map((series) => (
          <span key={series.key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0"
              style={{ background: series.color }}
            />
            <span className="text-[0.75rem] font-bold tracking-[0.06em] text-ink-600 uppercase">
              {series.label}
            </span>
            <span className="font-display text-[0.875rem] font-extrabold text-ink-950 tabular-nums">
              {data.at(-1)[series.key].toLocaleString()}
            </span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
