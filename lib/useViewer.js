"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Who is signed in, for client chrome. One fetch per tab, shared by every
 * component that asks.
 *
 * ── WHY A CACHE AND NOT JUST A FETCH ───────────────────────────────────────
 * The masthead renders before the answer arrives. Without a cache that means
 * every full page load shows "Join MAP" for a beat and then swaps it for the
 * member's face — a flash of the wrong state, on the one element that is on
 * every page. sessionStorage holds the last answer, so the second load and
 * every load after it paint the signed-in masthead immediately, then quietly
 * revalidate behind it. Stale-while-revalidate, in about forty lines.
 *
 * The cache is display data and nothing else. It grants no access: the
 * session cookie is httpOnly and the server re-reads it on every request, so
 * editing this object in devtools changes what the masthead draws and nothing
 * whatsoever about what the database will hand over.
 */

const KEY = "map.viewer";

/* Module state, so a masthead and a drawer mounted at the same time share one
   request rather than racing each other for the same answer. */
let state = { status: "loading", member: null };
let inflight = null;
const listeners = new Set();

function emit(next) {
  state = next;
  for (const listener of listeners) listener();
}

function readCache() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    // Private-mode Safari throws on sessionStorage. Not having a cache is fine.
    return undefined;
  }
}

function writeCache(member) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(member));
  } catch {
    /* ignore */
  }
}

export function clearViewerCache() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit({ status: "ready", member: null });
}

/** Ask the server again. Call after anything that changes the viewer. */
export function refreshViewer() {
  inflight = fetch("/api/auth/session", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    cache: "no-store",
  })
    .then((response) => (response.ok ? response.json() : { member: null }))
    .then((data) => {
      const member = data.member ?? null;
      writeCache(member);
      emit({ status: "ready", member });
      return member;
    })
    .catch(() => {
      /* Offline, or the server is down. Keep whatever is on screen rather than
         throwing a signed-in member back to a "Join MAP" button because one
         request failed. */
      emit({ status: "ready", member: state.member });
      return state.member;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Patch the cached viewer in place — a new photograph, say. */
export function updateViewer(patch) {
  if (!state.member) return;
  const member = { ...state.member, ...patch };
  writeCache(member);
  emit({ status: "ready", member });
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const SERVER_SNAPSHOT = { status: "loading", member: null };

export function useViewer() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    // The server has no idea who this is; it must render the loading shape or
    // hydration will not match what the browser paints first.
    () => SERVER_SNAPSHOT
  );

  useEffect(() => {
    if (state.status === "loading") {
      const cached = readCache();
      // `undefined` means no cache. `null` means a cached "signed out", which
      // is an answer and should be painted as one.
      if (cached !== undefined) emit({ status: "ready", member: cached });
    }
    if (!inflight) refreshViewer();
  }, []);

  return snapshot;
}
