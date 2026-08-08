import React from "react";
import { cn } from "@/lib/utils";
import Reveal from "./Reveal";

/**
 * Section shell + heading block.
 *
 * Every section previously re-declared its own container width, gutters and
 * vertical padding, so no two lined up. These own that rhythm.
 *
 * The heading follows an editorial convention: a numbered, ruled kicker, then
 * the title set large against a heavy rule. Structure comes from the rules,
 * not from a card with a shadow under it.
 */
export function Section({
  as: Tag = "section",
  className,
  children,
  wide = false,
  tight = false,
  ...props
}) {
  return (
    <Tag className={cn(tight ? "section-tight" : "section", className)} {...props}>
      <div className={cn("shell", wide && "shell-wide")}>{children}</div>
    </Tag>
  );
}

export function SectionHeading({
  index,
  eyebrow,
  title,
  lead,
  align = "left",
  tone = "default",
  className,
  actions,
  as: TitleTag = "h2",
}) {
  const inverse = tone === "inverse";
  const centered = align === "center";

  return (
    <header className={cn("relative", className)}>
      {/* Heavy rule above the block, the newspaper device that separates
          one story from the next without needing a box around either. */}
      <Reveal>
        <div
          className={cn("h-0.5 w-full", inverse ? "bg-white/25" : "bg-ink-950")}
        />
      </Reveal>

      <div
        className={cn(
          "flex flex-col gap-8 pt-6",
          actions && "lg:flex-row lg:items-end lg:justify-between lg:gap-12"
        )}
      >
        <Reveal className={cn("min-w-0", centered && "mx-auto text-center")}>
          {eyebrow && (
            <p
              className={cn(
                "eyebrow",
                centered && "eyebrow-center",
                inverse && "eyebrow-inverse"
              )}
            >
              {index && (
                <span className={inverse ? "text-ember-400" : "text-ember-600"}>
                  {String(index).padStart(2, "0")}
                </span>
              )}
              {eyebrow}
            </p>
          )}

          <TitleTag
            className={cn(
              "mt-5 max-w-[18ch] text-fluid-4xl",
              centered && "mx-auto",
              inverse ? "text-white" : "text-content"
            )}
          >
            {title}
          </TitleTag>

          {lead && (
            <p
              className={cn(
                "prose-body mt-6",
                centered && "mx-auto",
                inverse && "text-white/70"
              )}
            >
              {lead}
            </p>
          )}
        </Reveal>

        {actions && (
          <Reveal
            delay={120}
            className="flex shrink-0 flex-wrap items-center gap-3"
          >
            {actions}
          </Reveal>
        )}
      </div>
    </header>
  );
}

export default Section;
