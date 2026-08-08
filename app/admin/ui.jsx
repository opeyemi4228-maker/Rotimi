import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

/* The dashboard's shared parts. Kept out of the pages so five tiers of admin
   read the same figures in the same shape — a State Coordinator and an LGA
   Coordinator comparing notes should not be looking at two different designs. */

/** The white block everything on the dashboard sits in. */
export function Card({ className, children, ...props }) {
  return (
    <div className={cn("border border-ink-200 bg-white", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * A heading with an optional way out of it. Used above every block on the
 * dashboard so a section title, its explanation and its link are always in the
 * same relationship to each other.
 */
export function SectionHead({ title, lead, href, hrefLabel, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-extrabold tracking-tight text-ink-950">
          {title}
        </h2>
        {lead && <p className="mt-1 text-[0.8125rem] text-content-muted">{lead}</p>}
      </div>
      {action}
      {href && (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-1.5 text-[0.75rem] font-bold tracking-[0.08em] text-brand-700 uppercase hover:text-ember-600"
        >
          {hrefLabel}
          <ArrowRight size={14} strokeWidth={3} />
        </Link>
      )}
    </div>
  );
}

/**
 * The headline figures, four across the top of the page.
 *
 * `delta` is a change against the previous period of the same length, and it is
 * shown with an arrow and a word as well as a colour — "up" and green saying
 * the same thing twice, so neither has to carry it alone.
 *
 * A figure whose direction is genuinely ambiguous should not pass a delta at
 * all. An arrow on a number that is neither good nor bad is decoration.
 */
export function StatTile({ icon: Icon, label, value, sub, delta, tone = "default" }) {
  const rising = delta > 0;
  const falling = delta < 0;

  return (
    <div
      className={cn(
        "flex items-start gap-4 border bg-white p-5",
        tone === "alert" && value > 0 ? "border-red-600" : "border-ink-200"
      )}
    >
      {Icon && (
        <span
          aria-hidden="true"
          className={cn(
            "grid size-11 shrink-0 place-items-center",
            tone === "alert" && value > 0 ? "bg-red-50 text-red-700" : "bg-ink-50 text-brand-700"
          )}
        >
          <Icon size={19} strokeWidth={2.25} />
        </span>
      )}

      <div className="min-w-0">
        <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
          {label}
        </p>
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5">
          <span
            className={cn(
              "font-display text-2xl font-extrabold tracking-tight tabular-nums",
              tone === "alert" && value > 0 ? "text-red-700" : "text-ink-950"
            )}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          {(rising || falling) && (
            <span
              className={cn(
                "flex items-center gap-1 text-[0.75rem] font-bold tabular-nums",
                rising ? "text-brand-700" : "text-red-700"
              )}
            >
              {rising ? (
                <TrendingUp size={13} strokeWidth={3} aria-hidden="true" />
              ) : (
                <TrendingDown size={13} strokeWidth={3} aria-hidden="true" />
              )}
              {rising ? "+" : ""}
              {delta.toLocaleString()}
              <span className="sr-only">
                {rising ? " more than" : " fewer than"} the previous period
              </span>
            </span>
          )}
        </p>
        {sub && <p className="mt-1 text-[0.8125rem] leading-snug text-content-subtle">{sub}</p>}
      </div>
    </div>
  );
}

export function PageTitle({ title, lead, action }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink-950 pb-5">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-950">
          {title}
        </h1>
        {lead && (
          <p className="mt-1.5 max-w-2xl text-[0.875rem] leading-snug text-content-muted">
            {lead}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, sub, tone = "default" }) {
  return (
    <div
      className={cn(
        "border-2 bg-white p-5",
        tone === "alert" && value > 0 ? "border-red-600" : "border-ink-950"
      )}
    >
      <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-display text-3xl font-extrabold tracking-tight tabular-nums",
          tone === "alert" && value > 0 ? "text-red-700" : "text-ink-950"
        )}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="mt-1 text-[0.8125rem] text-content-subtle">{sub}</p>}
    </div>
  );
}

/**
 * Coverage as a bar rather than a number alone. §10.1 asks for a progress
 * ring; a bar reads the same at a glance and survives being 3px tall in a
 * table row, which the ring does not.
 */
export function Coverage({ value, className }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-1.5 w-full min-w-16 bg-ink-200">
        <div
          className={cn(
            "h-full transition-[width]",
            value >= 70 ? "bg-brand-600" : value >= 30 ? "bg-ember-500" : "bg-red-600"
          )}
          style={{ width: `${Math.max(value, value > 0 ? 2 : 0)}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-[0.8125rem] font-bold tabular-nums text-ink-950">
        {value}%
      </span>
    </div>
  );
}

export function Table({ head, children, empty }) {
  return (
    <div className="overflow-x-auto border-2 border-ink-950 bg-white">
      <table className="w-full min-w-[44rem] border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-ink-950">
            {head.map((cell) => (
              <th
                key={cell.key ?? cell.label}
                scope="col"
                className={cn(
                  "px-4 py-3 text-[0.6875rem] font-bold tracking-[0.1em] text-ink-500 uppercase whitespace-nowrap",
                  cell.align === "right" && "text-right"
                )}
              >
                {cell.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export function Row({ children }) {
  return <tr className="border-b border-ink-200 last:border-0">{children}</tr>;
}

export function Cell({ children, align, className, ...props }) {
  return (
    <td
      className={cn(
        "px-4 py-3 text-[0.875rem] text-ink-950",
        align === "right" && "text-right tabular-nums",
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}

export function Empty({ children }) {
  return (
    <p className="border-t border-ink-200 px-4 py-10 text-center text-[0.875rem] text-content-subtle">
      {children}
    </p>
  );
}

const TONES = {
  filled: "bg-brand-600 text-white",
  vacant: "bg-ink-100 text-ink-600",
  verified: "bg-brand-600 text-white",
  pending: "bg-ember-100 text-ember-800",
  rejected: "bg-red-100 text-red-800",
  admin: "bg-ink-950 text-white",
  functional: "bg-ink-200 text-ink-700",
};

export function Tag({ tone = "vacant", children }) {
  return (
    <span
      className={cn(
        "inline-block px-2 py-1 text-[0.625rem] font-extrabold tracking-[0.08em] uppercase",
        TONES[tone] ?? TONES.vacant
      )}
    >
      {children}
    </span>
  );
}
