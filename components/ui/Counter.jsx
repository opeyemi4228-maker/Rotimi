"use client";

import React, { useEffect, useRef, useState } from "react";
import { formatNumber } from "@/lib/utils";

/**
 * Counts up to `value` when scrolled into view.
 *
 * The previous implementation used setInterval with a fixed 60 steps, which
 * drifted against the display refresh and left a visible stutter. This drives
 * off rAF with an eased curve, and it always lands exactly on `value`.
 * Reduced-motion users get the final number immediately.
 */
export default function Counter({
  value,
  suffix = "",
  prefix = "",
  duration = 1800,
  className,
}) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect --
           matchMedia is an external system and this is the one read of it. Calling
       it during render instead is not safe on the server and would make the
       first paint differ between the two. */
      setDisplay(value);
      return;
    }

    let frame;
    let start;

    const tick = (now) => {
      start ??= now;
      const progress = Math.min((now - start) / duration, 1);
      // easeOutExpo: fast out of the gate, settles gently on the final figure
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          frame = requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {/* The final value is in the DOM for screen readers and for search
          engines from the first paint; the animated figure is decorative. */}
      <span aria-hidden="true">
        {prefix}
        {formatNumber(display)}
        {suffix}
      </span>
      <span className="sr-only">
        {prefix}
        {formatNumber(value)}
        {suffix}
      </span>
    </span>
  );
}
