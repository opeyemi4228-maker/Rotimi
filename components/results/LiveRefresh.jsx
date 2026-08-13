"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Pulls fresh figures on an interval, without a full page load.
 *
 * ── WHY POLLING AND NOT A SOCKET ───────────────────────────────────────────
 * A websocket would push the moment a return lands, which sounds better and is
 * worse here. Results arrive over hours from a hundred and seventy thousand
 * booths; a viewer gains nothing from seeing a number move two seconds sooner,
 * and the platform this deploys to charges for long-lived connections and drops
 * them anyway. `router.refresh()` re-runs the server component and swaps the
 * rendered output in, so the page updates without losing scroll position or
 * whatever the reader was hovering.
 *
 * It stops while the tab is hidden. A phone left open on this page all evening
 * should not spend the night polling a database from a pocket.
 * ───────────────────────────────────────────────────────────────────────────
 */
export default function LiveRefresh({ seconds = 45 }) {
  const router = useRouter();

  useEffect(() => {
    let timer = null;

    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    const start = () => {
      stop();
      timer = setInterval(tick, seconds * 1000);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        tick(); // catch up on whatever landed while the tab was away
        start();
      } else {
        stop();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, seconds]);

  return null;
}
