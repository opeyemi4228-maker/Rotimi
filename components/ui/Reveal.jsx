"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Reveals children once, when they first scroll into view.
 *
 * The codebase had three separate hand-written IntersectionObserver blocks
 * doing this, none of which checked `prefers-reduced-motion`. This one does,
 * and it disconnects after firing so it costs nothing afterwards.
 */
export default function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
  y = 20,
  once = true,
}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect --
           Same as Counter: matchMedia cannot be read during render without the
       server and the client disagreeing about the first paint. Somebody who
       asked their OS for reduced motion gets the content immediately, which is
       the whole point of the branch. */
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setShown(false);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  return (
    <Tag
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-out-quart will-change-[opacity,transform]",
        shown ? "opacity-100 translate-y-0" : "opacity-0",
        className
      )}
      style={{
        transitionDelay: `${delay}ms`,
        transform: shown ? undefined : `translate3d(0, ${y}px, 0)`,
      }}
    >
      {children}
    </Tag>
  );
}
