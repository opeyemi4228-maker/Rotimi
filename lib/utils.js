import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge has to be told about this theme's custom scales.
 *
 * Out of the box it cannot tell `text-fluid-4xl` (a font size) apart from
 * `text-content` (a colour). It files both under one group and keeps only the
 * last, so `cn("text-fluid-4xl", "text-content")` silently returned just
 * `text-content`. Every section title on the site was rendering at body size
 * because of it. Declaring the scales here restores both.
 */
const FLUID_SIZES = [
  "fluid-xs",
  "fluid-sm",
  "fluid-base",
  "fluid-lg",
  "fluid-xl",
  "fluid-2xl",
  "fluid-3xl",
  "fluid-4xl",
  "fluid-5xl",
  "fluid-6xl",
  "fluid-7xl",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: FLUID_SIZES }],
      shadow: [{ shadow: ["e1", "e2", "e3", "e4"] }],
      "font-family": ["font-display", "font-sans", "font-serif"],
    },
  },
});

/**
 * Merge conditional class names, letting later Tailwind utilities win over
 * earlier conflicting ones (`cn("p-2", "p-4")` -> `"p-4"`).
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** 11300 -> "11,300" */
export function formatNumber(value) {
  return new Intl.NumberFormat("en-NG").format(value);
}

/**
 * "Chibuike Rotimi Amaechi" -> "CA". What an avatar shows before a member has
 * uploaded a photograph.
 *
 * First and last, never the middle name, because the middle initial is the one
 * nobody recognises. A single-word name falls back to its first two letters,
 * so a mononym still reads as a monogram rather than as one lonely capital.
 */
export function initials(name) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts.at(-1)[0]).toUpperCase();
}
