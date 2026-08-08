/**
 * Nigerian geography, the spine of member registration.
 *
 * The current INEC register: 37 states, 774 LGAs, 8,809 registration areas
 * (wards) and 176,623 polling units, including the 56,737 units created in the
 * 2021 expansion. A member never types any of these — they pick from the list,
 * so the register holds one spelling of every ward in the country instead of
 * forty, and the row that lands in their record carries INEC's own code for the
 * place rather than a name somebody typed.
 *
 * The tables are built by `node scripts/build-geography.mjs` into two levels,
 * both fetched on demand and neither of them large:
 *
 *   public/geo/<slug>.json     one state's LGAs and wards, 5–40 KB, fetched
 *                              the moment the member chooses their state
 *   public/geo/pu/<LGA>.json   one LGA's polling units, 2–60 KB, fetched only
 *                              once they have chosen the LGA
 *
 * Nobody downloads the country, or even a whole state's polling units, to fill
 * in three dropdowns — which is the difference between a form that works on a
 * phone in Omoku and one that does not.
 */

import { allStates } from "./map";
import { stateByName } from "./states.mjs";

/** All 37, alphabetical, each carrying its zone. */
export const states = allStates;

/** Display name -> the public/geo file that holds it. */
export function stateSlug(name) {
  return stateByName.get(name)?.slug ?? "";
}

/* One fetch per file per session, shared by every form on the page. Caching
   the promise rather than the result means two selects mounting at the same
   time make one request between them, not two. */
const cache = new Map();

function loadJson(url) {
  if (!cache.has(url)) {
    const pending = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`${url}: ${response.status}`);
        return response.json();
      })
      .catch((error) => {
        // Never poison the cache: a dropped connection has to stay retryable.
        cache.delete(url);
        throw error;
      });
    cache.set(url, pending);
  }
  return cache.get(url);
}

/**
 * The LGA and ward tree for a state.
 * Resolves to `{ state, code, slug, lgas }`, or null if no state is given.
 */
export function loadState(name) {
  const slug = stateSlug(name);
  if (!slug) return Promise.resolve(null);
  return loadJson(`/geo/${slug}.json`);
}

/**
 * The polling units of one LGA, keyed by the ward's two-digit number:
 * `{ "07": [["003", "Arakale - 82 Arakale Street"], …] }`.
 */
export function loadUnits(lgaCode) {
  if (!lgaCode) return Promise.resolve(null);
  return loadJson(`/geo/pu/${lgaCode}.json`);
}

/* Everything below reads already-loaded tables. The build script sorts them,
   so these keep that order instead of re-sorting on every render. */

/** LGAs of a loaded state tree, by name. */
export function lgasFor(tree) {
  return tree ? tree.lgas.map((lga) => lga.name) : [];
}

/** The full LGA record — code included — for one name. */
export function findLga(tree, lga) {
  if (!tree || !lga) return null;
  return tree.lgas.find((entry) => entry.name === lga) ?? null;
}

/** Wards of one LGA, by name. */
export function wardsFor(tree, lga) {
  return findLga(tree, lga)?.wards.map((ward) => ward.name) ?? [];
}

/** The full ward record — code and polling unit count — for one name. */
export function findWard(tree, lga, ward) {
  if (!ward) return null;
  return findLga(tree, lga)?.wards.find((entry) => entry.name === ward) ?? null;
}

/**
 * Polling units of one ward, as `{ value, label }` for a <select>.
 *
 * `value` is INEC's delimitation code, not the name, because names in the
 * register are not unique inside a ward: Osusu I in Aba North has two polling
 * units both called "BTC Premises XI". Posting the code is the only way to say
 * which one the member meant, and where a label does repeat it is given its
 * unit number so the two options are told apart on screen.
 */
export function pollingUnitsFor(units, wardCode) {
  if (!units || !wardCode) return [];
  const rows = units[wardCode.slice(-2)] ?? [];

  const seen = new Map();
  for (const [, name] of rows) seen.set(name, (seen.get(name) ?? 0) + 1);

  return rows.map(([number, name]) => ({
    value: `${wardCode}-${number}`,
    label: seen.get(name) > 1 ? `${name} (unit ${number})` : name,
    name,
  }));
}
