import React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Reveal from "./Reveal";

/**
 * The masthead every inner page opens with.
 *
 * Each page previously hand-rolled its own hero with a different height,
 * gradient and type scale, so moving between them felt like moving between
 * three different websites. This is the one shape they all share:
 * breadcrumb, kicker, title and standfirst, set against either flat black or a
 * photograph, and always separated from the body by the same heavy rule.
 */
export default function PageHeader({
  kicker,
  title,
  lead,
  image,
  breadcrumb,
  align = "left",
  children,
  className,
}) {
  const hasImage = Boolean(image);

  return (
    <header
      className={cn(
        "relative isolate overflow-hidden",
        hasImage ? "bg-ink-950" : "bg-ink-950",
        className
      )}
    >
      {hasImage && (
        <>
          <Image
            src={image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_top] opacity-75"
          />
          {/* Scrim weighted to the left, where the copy sits, so the subject
              on the right stays legible instead of being crushed to black. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-r from-ink-950 via-ink-950/85 to-ink-950/25"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-t from-ink-950/70 to-transparent"
          />
        </>
      )}

      <div
        className={cn(
          "shell shell-wide relative py-16 lg:py-24",
          align === "center" && "text-center"
        )}
      >
        {breadcrumb && (
          <Reveal>
            <nav aria-label="Breadcrumb">
              <ol
                className={cn(
                  "flex flex-wrap items-center gap-2 text-[0.6875rem] font-bold tracking-[0.14em] text-white/50 uppercase",
                  align === "center" && "justify-center"
                )}
              >
                <li>
                  <Link href="/" className="transition-colors hover:text-white">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li className="text-ember-400">{breadcrumb}</li>
              </ol>
            </nav>
          </Reveal>
        )}

        <Reveal delay={60}>
          {kicker && (
            <p
              className={cn(
                "eyebrow eyebrow-inverse mt-8",
                align === "center" && "eyebrow-center"
              )}
            >
              {kicker}
            </p>
          )}

          <h1
            className={cn(
              "mt-5 max-w-[16ch] text-fluid-5xl text-white",
              align === "center" && "mx-auto"
            )}
          >
            {title}
          </h1>
        </Reveal>

        {lead && (
          <Reveal delay={130}>
            <p
              className={cn(
                "mt-7 max-w-2xl text-fluid-lg leading-relaxed text-white/70",
                align === "center" && "mx-auto"
              )}
            >
              {lead}
            </p>
          </Reveal>
        )}

        {children && (
          <Reveal delay={200}>
            <div className="mt-10">{children}</div>
          </Reveal>
        )}
      </div>

      {/* Flag rule, matching the masthead and footer. */}
      <div aria-hidden="true" className="flex h-2">
        <span className="flex-1 bg-brand-600" />
        <span className="w-24 bg-gold-500" />
        <span className="flex-1 bg-brand-600" />
      </div>
    </header>
  );
}

/** Ruled figure row, reused across the inner pages. */
export function StatRow({ items, className, tone = "default" }) {
  const inverse = tone === "inverse";
  return (
    <dl
      className={cn(
        "grid grid-cols-[repeat(2,minmax(min-content,1fr))] border-t-2 sm:grid-cols-[repeat(4,minmax(min-content,1fr))]",
        inverse ? "border-white/30" : "border-ink-950",
        className
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "px-5 py-6 first:pl-0",
            inverse ? "border-l border-white/15" : "border-l border-ink-200",
            "first:border-l-0"
          )}
        >
          <dd
            className={cn(
              "font-display text-fluid-2xl font-extrabold tracking-[-0.045em] tabular-nums",
              inverse ? "text-white" : "text-ink-950"
            )}
          >
            {item.value}
          </dd>
          <dt
            className={cn(
              "mt-2 text-[0.625rem] leading-tight font-bold tracking-[0.12em] uppercase",
              inverse ? "text-white/55" : "text-ink-500"
            )}
          >
            {item.label}
          </dt>
        </div>
      ))}
    </dl>
  );
}
