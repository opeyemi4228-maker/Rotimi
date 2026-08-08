import React from "react";
import Link from "next/link";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * One button, every appearance the site needs.
 *
 * Replaces ~60 hand-rolled `bg-[#008751] px-8 py-3 rounded-md font-bold ...`
 * strings that had drifted into six paddings and four radii.
 *
 * Square, heavy, and it does not lift or scale on hover, because that soft
 * float is what made the previous pass read as a generic template.
 * Instead each variant flips to its inverse, which is the behaviour the
 * Ford Foundation and Labour buttons use: decisive, not decorative.
 */
const button = cva(
  [
    "group relative inline-flex select-none items-center justify-center gap-3",
    "font-display font-extrabold uppercase tracking-[0.1em]",
    "border-2 transition-colors duration-300 ease-out-quart",
    "disabled:pointer-events-none disabled:opacity-40",
  ],
  {
    variants: {
      variant: {
        primary:
          "border-brand-600 bg-brand-600 text-white hover:border-ink-950 hover:bg-ink-950",
        ember:
          "border-ember-500 bg-ember-500 text-ink-950 hover:border-ink-950 hover:bg-ink-950 hover:text-white",
        dark: "border-ink-950 bg-ink-950 text-white hover:border-brand-600 hover:bg-brand-600",
        outline:
          "border-ink-950 bg-transparent text-ink-950 hover:bg-ink-950 hover:text-white",
        /* Reads on photography and on flat colour blocks */
        inverse:
          "border-white bg-white text-ink-950 hover:border-ember-500 hover:bg-ember-500",
        inverseOutline:
          "border-white bg-transparent text-white hover:bg-white hover:text-ink-950",
        ghost:
          "border-transparent bg-transparent text-content-muted hover:text-brand-700",
      },
      size: {
        sm: "h-10 px-4 text-[0.6875rem]",
        md: "h-12 px-6 text-[0.75rem]",
        lg: "h-14 px-8 text-[0.8125rem]",
        xl: "h-16 px-10 text-sm",
        icon: "size-12 px-0",
      },
      full: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", full: false },
  }
);

const Button = React.forwardRef(function Button(
  { className, variant, size, full, href, external, children, ...props },
  ref
) {
  const classes = cn(button({ variant, size, full }), className);

  if (href) {
    // Absolute/mailto/tel links leave the app, so they skip the router.
    const isExternal = external ?? /^(https?:|mailto:|tel:)/.test(href);
    if (isExternal) {
      return (
        <a
          ref={ref}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={classes}
          {...props}
        >
          {children}
        </a>
      );
    }
    return (
      <Link ref={ref} href={href} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button ref={ref} className={classes} {...props}>
      {children}
    </button>
  );
});

export default Button;
export { button as buttonVariants };
