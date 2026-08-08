import { cn, initials } from "@/lib/utils";

/**
 * A member's face, or their monogram until they upload one.
 *
 * Square, not round. The whole system is built on hard edges and 2px rules —
 * a circular avatar would be the only curve on the page and would read as
 * borrowed from somewhere else.
 *
 * A plain <img>, not next/image: these come from /api/members/<id>/photo,
 * which is already exactly the pixels being drawn, and putting the optimiser
 * in front of a private, session-checked route would only add a second cache
 * of the same bytes with weaker access rules than the route itself.
 *
 * Works in a server component. Nothing here needs the client.
 */

const SIZES = {
  xs: { box: "size-8", text: "text-[0.625rem]", px: 32 },
  sm: { box: "size-10", text: "text-[0.6875rem]", px: 40 },
  md: { box: "size-12", text: "text-[0.8125rem]", px: 48 },
  lg: { box: "size-20", text: "text-lg", px: 80 },
  xl: { box: "size-32", text: "text-3xl", px: 128 },
  "2xl": { box: "size-40", text: "text-4xl", px: 160 },
};

export default function Avatar({
  name,
  src,
  size = "md",
  ring = true,
  className,
  ...props
}) {
  const scale = SIZES[size] ?? SIZES.md;

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden bg-brand-700 select-none",
        ring && "ring-2 ring-ink-950",
        scale.box,
        className
      )}
      {...props}
    >
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element --
           next/image cannot help here. Every avatar is served by our own
           /api/members/<id>/photo, which is behind a scope check and already
           returns a 512px square with a content-hash in the URL and a one-year
           cache. Routing that through the optimiser would add a second
           authenticated fetch per face on a page that shows twenty-five of
           them, to re-encode an image we encoded ourselves on upload. */
        <img
          src={src}
          /* Empty alt, deliberately. Every avatar on this site sits beside the
             member's name in the same box; "Photograph of Ada Obi" next to
             "Ada Obi" is the same information twice for a screen reader. */
          alt=""
          width={scale.px}
          height={scale.px}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "font-display font-extrabold tracking-[0.04em] text-white",
            scale.text
          )}
        >
          {initials(name)}
        </span>
      )}
    </span>
  );
}
