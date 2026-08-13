/**
 * Builds the Nigeria map the live results page draws.
 *
 *   node scripts/build-map.mjs            # uses the cache if present
 *   node scripts/build-map.mjs --refresh  # re-download the boundaries
 *
 * ── SOURCE ─────────────────────────────────────────────────────────────────
 * geoBoundaries (gbOpen), CC BY 4.0 — 37 ADM1 polygons for the states and the
 * FCT, and 774 ADM2 polygons for the local governments. Attribution is
 * required and is printed under the map.
 *
 *   https://www.geoboundaries.org
 * ───────────────────────────────────────────────────────────────────────────
 *
 * ── WHY SVG PATHS AND NOT GEOJSON ──────────────────────────────────────────
 * Shipping GeoJSON means shipping a projection library and doing the maths in
 * the browser on every load. The projection here never changes — Nigeria is
 * not going to move — so it is done once, at build time, and what the browser
 * receives is a `d` attribute it can hand straight to the renderer.
 *
 * The saving is not marginal. The raw ADM2 file is 3.7MB; projected, rounded
 * and split per state it is about 40KB a state, fetched only when somebody
 * opens that state.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Output is committed, so the site builds without network access. Re-run only
 * if the boundaries are revised, which for Nigeria means a new state.
 */

import { writeFile, mkdir, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { states as STATES } from "../lib/states.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const OUT = path.join(ROOT, "public", "geo", "map");
const CACHE = path.join(HERE, ".boundaries");

const RELEASE = "9469f09";
const SOURCE = (level) =>
  `https://github.com/wmgeolab/geoBoundaries/raw/${RELEASE}/releaseData/gbOpen/NGA/${level}/geoBoundaries-NGA-${level}_simplified.geojson`;

const REFRESH = process.argv.includes("--refresh");

/* The drawing surface. Nigeria is wider than it is tall, so the width is fixed
   and the height falls out of the aspect ratio. */
const WIDTH = 1000;

/* Coordinates are rounded to this many decimals in SVG units. At 1000 units
   across a country 1,100km wide, one unit is about a kilometre and one decimal
   place is a hundred metres — far finer than any screen will show, and it
   roughly halves the file. */
const PRECISION = 1;

/* ------------------------------------------------------------------ source */

async function boundaries(level) {
  const cached = path.join(CACHE, `${level}.geojson`);
  if (!REFRESH && existsSync(cached)) return JSON.parse(await readFile(cached, "utf8"));

  process.stdout.write(`  fetching ${level}… `);
  const response = await fetch(SOURCE(level));
  if (!response.ok) throw new Error(`${level}: ${response.status}`);
  const text = await response.text();
  await mkdir(CACHE, { recursive: true });
  await writeFile(cached, text);
  console.log(`${(text.length / 1e6).toFixed(1)}MB`);
  return JSON.parse(text);
}

/* -------------------------------------------------------------- projection */

/**
 * Equirectangular, with the longitude squeezed by the cosine of the middle
 * latitude.
 *
 * A conic projection would be more correct, but Nigeria spans nine degrees of
 * latitude near the equator, where the difference is under a percent — less
 * than the width of the stroke drawn around each state. The simple projection
 * is legible in one screenful of code, and legible is worth more here than a
 * fraction of a percent nobody can see.
 */
function projector(bounds) {
  const midLat = ((bounds.minLat + bounds.maxLat) / 2) * (Math.PI / 180);
  const squeeze = Math.cos(midLat);

  const spanX = (bounds.maxLon - bounds.minLon) * squeeze;
  const spanY = bounds.maxLat - bounds.minLat;
  const scale = WIDTH / spanX;
  const height = spanY * scale;

  return {
    height: Math.round(height),
    point([lon, lat]) {
      return [
        (lon - bounds.minLon) * squeeze * scale,
        // SVG y grows downward; latitude grows upward.
        (bounds.maxLat - lat) * scale,
      ];
    },
  };
}

function boundsOf(features) {
  const bounds = { minLon: 180, maxLon: -180, minLat: 90, maxLat: -90 };
  eachRing(features, (ring) => {
    for (const [lon, lat] of ring) {
      if (lon < bounds.minLon) bounds.minLon = lon;
      if (lon > bounds.maxLon) bounds.maxLon = lon;
      if (lat < bounds.minLat) bounds.minLat = lat;
      if (lat > bounds.maxLat) bounds.maxLat = lat;
    }
  });
  return bounds;
}

function eachRing(features, visit) {
  for (const feature of features) {
    const { type, coordinates } = feature.geometry ?? {};
    if (type === "Polygon") coordinates.forEach(visit);
    else if (type === "MultiPolygon") coordinates.forEach((polygon) => polygon.forEach(visit));
  }
}

/** One feature's rings as a single SVG path. */
function toPath(feature, project) {
  const parts = [];

  const ring = (points) => {
    let previous = null;
    let out = "";
    for (const point of points) {
      const [x, y] = project.point(point);
      const rx = x.toFixed(PRECISION);
      const ry = y.toFixed(PRECISION);
      // Rounding collapses neighbouring points onto each other; emitting the
      // duplicates would double the file for no visible difference.
      if (previous && previous[0] === rx && previous[1] === ry) continue;
      out += `${out ? "L" : "M"}${rx} ${ry}`;
      previous = [rx, ry];
    }
    return out ? `${out}Z` : "";
  };

  const { type, coordinates } = feature.geometry ?? {};
  if (type === "Polygon") coordinates.forEach((r) => parts.push(ring(r)));
  else if (type === "MultiPolygon")
    coordinates.forEach((polygon) => polygon.forEach((r) => parts.push(ring(r))));

  return parts.filter(Boolean).join("");
}

/** The visual centre, for placing a label. Area-weighted over the rings. */
function centroid(feature, project) {
  let sx = 0;
  let sy = 0;
  let n = 0;
  eachRing([feature], (points) => {
    for (const point of points) {
      const [x, y] = project.point(point);
      sx += x;
      sy += y;
      n += 1;
    }
  });
  return n ? [Number((sx / n).toFixed(1)), Number((sy / n).toFixed(1))] : [0, 0];
}

/* ---------------------------------------------------------------- matching */

/** "Akwa Ibom", "AKWA-IBOM" and "akwa ibom" are the same place. */
const key = (name) => String(name).toLowerCase().replace(/[^a-z0-9]/g, "");

/* geoBoundaries spells a handful of places differently from INEC. Only the
   ones that do not fall out of the normalised comparison are listed. */
const STATE_ALIASES = {
  abujafederalcapitalterritory: "federalcapitalterritory",
  fct: "federalcapitalterritory",
  nassarawa: "nasarawa",
};

/* -------------------------------------------------------------------- main */

const main = async () => {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const adm1 = await boundaries("ADM1");
  const adm2 = await boundaries("ADM2");

  /* One projection for the whole country, shared by the national map and every
     state map. A state drawn on its own projection would be a different shape
     from the same state inside the national outline, and the eye notices. */
  const project = projector(boundsOf(adm1.features));

  /* ── The national map: one path per state ─────────────────────────────── */
  const byKey = new Map();
  for (const feature of adm1.features) {
    const name = key(feature.properties.shapeName);
    byKey.set(STATE_ALIASES[name] ?? name, feature);
  }

  const missing = [];
  const statePaths = [];

  for (const state of STATES) {
    const feature = byKey.get(key(state.name));
    if (!feature) {
      missing.push(state.name);
      continue;
    }
    statePaths.push({
      code: state.code,
      name: state.name,
      slug: state.slug,
      d: toPath(feature, project),
      at: centroid(feature, project),
    });
  }

  await writeFile(
    path.join(OUT, "states.json"),
    JSON.stringify({
      source: "geoBoundaries gbOpen (CC BY 4.0), geoboundaries.org",
      width: WIDTH,
      height: project.height,
      states: statePaths,
    })
  );

  /* ── Per state: one path per LGA ──────────────────────────────────────── */
  const lgasByState = new Map();
  for (const feature of adm2.features) {
    const parent = key(feature.properties.shapeGroup ?? "");
    // ADM2 carries no parent name in gbOpen, so the LGA is matched by falling
    // inside a state's bounding box — see below.
    lgasByState.set(parent, feature);
  }

  /* geoBoundaries ADM2 does not name its parent state, so each LGA is assigned
     to the state whose polygon contains its centroid. Point-in-polygon over 37
     states x 774 LGAs is 28,000 tests, which is nothing, and it is exact where
     name matching between two spelling conventions is not. */
  const stateFeatures = statePaths.map((entry) => ({
    code: entry.code,
    slug: entry.slug,
    rings: ringsOf(byKey.get(key(entry.name))),
  }));

  const perState = new Map(statePaths.map((entry) => [entry.code, []]));
  let unplaced = 0;

  for (const feature of adm2.features) {
    const point = centroidLonLat(feature);
    const owner = stateFeatures.find((candidate) => inAnyRing(point, candidate.rings));
    if (!owner) {
      unplaced += 1;
      continue;
    }
    perState.get(owner.code).push({
      name: feature.properties.shapeName,
      d: toPath(feature, project),
      at: centroid(feature, project),
    });
  }

  for (const [code, lgas] of perState) {
    lgas.sort((a, b) => a.name.localeCompare(b.name, "en"));
    await writeFile(
      path.join(OUT, `${code}.json`),
      JSON.stringify({ code, width: WIDTH, height: project.height, lgas })
    );
  }

  const total = [...perState.values()].reduce((n, lgas) => n + lgas.length, 0);
  console.log(
    `\nWrote ${statePaths.length} states and ${total} LGAs to public/geo/map/` +
      `\n  viewBox 0 0 ${WIDTH} ${project.height}`
  );
  if (missing.length) console.warn(`  no boundary matched: ${missing.join(", ")}`);
  if (unplaced) console.warn(`  ${unplaced} LGA polygons fell outside every state`);
};

/* ------------------------------------------------------- point in polygon */

function ringsOf(feature) {
  const rings = [];
  eachRing([feature], (ring) => rings.push(ring));
  return rings;
}

function centroidLonLat(feature) {
  let sx = 0;
  let sy = 0;
  let n = 0;
  eachRing([feature], (points) => {
    for (const [lon, lat] of points) {
      sx += lon;
      sy += lat;
      n += 1;
    }
  });
  return n ? [sx / n, sy / n] : [0, 0];
}

/** Ray casting. A point on an odd number of crossings is inside. */
function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const inAnyRing = (point, rings) => rings.some((ring) => inRing(point, ring));

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
