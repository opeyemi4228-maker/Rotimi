/**
 * Builds the INEC geography tables that /join and /registration select from.
 *
 *   node scripts/build-geography.mjs            # incremental, uses the cache
 *   node scripts/build-geography.mjs --refresh  # re-download the source
 *
 * ── THE REGISTER ───────────────────────────────────────────────────────────
 * Source: the delimitation data published by INEC's own polling unit service,
 * scraped in full — 37 states, 774 LGAs, 8,809 registration areas (wards) and
 * 176,623 polling units.
 *
 * That is the register as it stands after the 2021 expansion, in which INEC
 * created the first new polling units since 1996 and took the country from
 * 119,973 units to 176,846 for the 2023 general election. The source marks
 * every unit "EXISTING PU" or "NEW PU" and both are kept: a member who votes at
 * a unit created in 2021 has to be able to find it in the dropdown.
 *
 * What this replaced was the 2015 directory — 118,369 units, none of the
 * expansion, ward names flattened to slugs so the punctuation was gone. A third
 * of the country's polling units were not in the list at all.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Three things happen here so they never have to happen in the browser:
 *
 *   1. Names are cased. The source is shouting — "OSUSU RD. PRI. SCH. PREM" —
 *      and a member picking their polling unit reads "Osusu Rd. Pri. Sch. Prem".
 *   2. Every row keeps its place in INEC's delimitation code: 28/06/07/003
 *      becomes OND-006-07-003. A ward is then identified by its number in the
 *      register rather than by the spelling of its name, which is the only
 *      thing about it that ever changes.
 *   3. The tree is split by what the form needs, when it needs it:
 *
 *        public/geo/<slug>.json     LGAs and wards of one state (5–40 KB),
 *                                   fetched when the member picks their state
 *        public/geo/pu/<LGA>.json   polling units of one LGA (2–60 KB),
 *                                   fetched when they pick their LGA
 *
 *      The old build put a whole state's polling units in the state file, so
 *      Lagos was a 253 KB download to fill in three dropdowns; on the current
 *      register that same file would be over 600 KB. Nobody now downloads more
 *      than their own LGA, which is the difference between a form that works on
 *      a phone in Omoku and one that does not.
 *
 * Output is committed, so the site builds and deploys without network access.
 * Re-run this only when INEC publishes a revision — and then re-run the seed,
 * which reconciles the database against whatever this writes.
 */

import { writeFile, mkdir, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { states as STATES } from "../lib/states.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const OUT = path.join(ROOT, "public", "geo");
const CACHE = path.join(HERE, ".inec-source");

const SOURCE =
  "https://raw.githubusercontent.com/JayCodist/inec-polling-units-scraper/main/results";
const SOURCE_NOTE =
  "INEC delimitation service, scraped 2025-09-27 " +
  "(github.com/JayCodist/inec-polling-units-scraper)";

const REFRESH = process.argv.includes("--refresh");

/* ------------------------------------------------------------------ casing */

/* Roman numerals do the work of "Unit 4" all through the polling unit list, and
   title-casing them naively yields "Iii". */
const ROMAN = /^(?=[IVXL]+$)(X{0,3})(IX|IV|V?I{0,3})$/;

/* Lower-cased inside a name, capitalised when they open one. */
const MINOR = new Set(["OF", "IN", "AT", "BY", "THE", "AND", "FOR", "DE", "ON"]);

/* Institutions the register refers to by their initials. Without this list the
   1,696 entries that begin "LGEA PRIMARY SCHOOL" would read "Lgea". */
const ACRONYMS = new Set([
  "LGEA", "LEA", "LGA", "UBE", "UBEC", "NEPA", "PHCN", "NYSC", "WAEC", "NTA",
  "GRA", "NUT", "NDDC", "NDLEA", "UNICEF", "NAF", "ADP", "CAC", "COCIN",
  "ECWA", "NASFAT", "AME", "RCM", "RCCG", "NKST", "EYN", "NNPC", "CBN",
]);

/* Abbreviations the register writes in capitals that are nonetheless read as
   words, so they are cased as words. Everything else with no vowel in it —
   GSS, GDSS, JSS, CPS, PHC — is an acronym and is left standing. */
const SPELLED_OUT = new Set([
  "BY", "ST", "RD", "STR", "SCH", "SCHL", "PRY", "PRI", "MKT", "SQ", "SQR",
  "QTRS", "QRTS", "BLK", "JNR", "SNR", "NR", "DR", "MR", "MRS", "ALH", "OPP",
  "NO", "JCT", "KM", "MDS",
]);

function caseWord(word, first) {
  if (ROMAN.test(word)) return word;
  if (ACRONYMS.has(word)) return word;
  if (!first && MINOR.has(word)) return word.toLowerCase();
  if (word.length === 1) return word;
  if (!SPELLED_OUT.has(word) && !/[AEIOU]/.test(word)) return word;
  return word[0] + word.slice(1).toLowerCase();
}

/**
 * "IN FRONT OF CH. ALAKELU'S HOUSE" -> "In Front of Ch. Alakelu's House".
 * Punctuation is preserved and cased through, so "IKPOBA/OKHA" comes out as
 * "Ikpoba/Okha" and not as one word.
 *
 * Anything containing a digit is returned untouched: "1V", "111" and "82" are
 * the register's own numbering, and some of it is a mis-keyed roman numeral
 * that is INEC's to correct rather than ours to guess at.
 */
function titleCase(value) {
  let index = 0;
  /* The apostrophe is part of the word in "Jama'are" and "Alakelu's", but not
     in "'A'", where the register is quoting a single letter. Matching it only
     between two letters keeps both right. */
  return String(value).replace(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g, (word) => {
    const cased = /\d/.test(word) ? word : caseWord(word.toUpperCase(), index === 0);
    index += 1;
    return cased;
  });
}

/* The source is hand-typed and shows it: doubled spaces, a space before the
   comma, a stray backtick or pipe left at the end of a line. */
function tidy(value) {
  return String(value)
    .replace(/[`|_]+/g, " ")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?)\]])/g, "$1")
    .replace(/([([])\s+/g, "$1")
    .replace(/,(?=\S)/g, ", ")
    // "Arakale -92" and "Arakale - 92" are the same address typed twice.
    .replace(/\s*-\s*/g, (dash) => (/\s/.test(dash) ? " - " : "-"))
    .replace(/^[\s,.;:/-]+|[\s,;:-]+$/g, "")
    .trim();
}

/** A place name also settles the spacing around its separators: "IKA - SOUTH". */
function placeName(value) {
  return titleCase(tidy(value).replace(/\s*([/-])\s*/g, "$1"));
}

/**
 * The delimitation service spells a handful of LGAs in a way that INEC's own
 * published LGA list does not — four abbreviations that belong on a form rather
 * than in front of a member, and six plain typos. They are corrected here, by
 * state, and nowhere else: every ward and every polling unit keeps the spelling
 * the register gives it, because a ward name is checked against INEC and an LGA
 * name is read by somebody choosing where they live.
 */
const LGA_NAMES = {
  ADA: { "Gire 1": "Girei" },
  ANA: { Ihala: "Ihiala" },
  BOR: { "Maiduguri M. C.": "Maiduguri" },
  FCT: { Municipal: "Abuja Municipal" },
  KAT: { Malufashi: "Malumfashi" },
  KOG: {
    "Kogi. K. K.": "Kogi/Koton Karfe",
    "Mopa Moro": "Mopa-Muro",
    "Ogori Mangogo": "Ogori/Magongo",
  },
  /* Egbado North and South were renamed Yewa North and Yewa South in 1995.
     The delimitation tables still carry the pre-1995 names. */
  OGU: { "Egbado North": "Yewa North", "Egbado South": "Yewa South" },
  SOK: { "S/Birni": "Sabon Birni" },
  YOB: { Karasawa: "Karasuwa" },
};

/**
 * An LGA as a member would name it.
 *
 * Imo and Akwa Ibom publish eighteen of theirs with the headquarters town in
 * brackets — "Ihitte/Uboma (Isinweke)" — which is an administrative note, not
 * the name of the local government, and which stops the ward list underneath it
 * from being recognisable.
 */
function lgaName(value, stateCode) {
  const name = placeName(value).replace(/\s*\([^)]*\)/g, "").trim();
  return LGA_NAMES[stateCode]?.[name] ?? name;
}

const byName = (a, b) => a.localeCompare(b, "en");

/* ------------------------------------------------------------------ source */

async function stateSource(state) {
  const file = `${state.sourceFile ?? state.slug}.json`;
  const cached = path.join(CACHE, file);

  if (!REFRESH && existsSync(cached)) {
    return JSON.parse(await readFile(cached, "utf8"));
  }

  const response = await fetch(`${SOURCE}/${file}`);
  if (!response.ok) {
    throw new Error(`${file}: source fetch failed with ${response.status}`);
  }
  const text = await response.text();
  await mkdir(CACHE, { recursive: true });
  await writeFile(cached, text);
  return JSON.parse(text);
}

/* -------------------------------------------------------------------- main */

const main = async () => {
  /* The polling unit directory is rebuilt from nothing every time. Leaving
     stale per-LGA files behind would leave the browser fetching units for a
     ward the register no longer has. */
  await rm(path.join(OUT, "pu"), { recursive: true, force: true });
  await mkdir(path.join(OUT, "pu"), { recursive: true });

  const index = [];
  const totals = { lgas: 0, wards: 0, pollingUnits: 0, existing: 0, added2021: 0 };
  const notes = [];

  for (const state of STATES) {
    const raw = await stateSource(state);
    if (String(raw.state.code).padStart(2, "0") !== state.inec) {
      throw new Error(
        `${state.name}: source is INEC state ${raw.state.code}, expected ${state.inec}`
      );
    }

    const lgas = [];
    const counts = { lgas: 0, wards: 0, pollingUnits: 0 };

    for (const sourceLga of raw.state.lgas) {
      /* INEC numbers the LGAs of a state 01..NN alphabetically, and that number
         is the one printed on a membership card (§7.3, MAP/OND/006/000123).
         Taking it from the source rather than from our own sort order means a
         spelling correction upstream can never renumber a state's membership. */
      const lgaCode = `${state.code}-${String(sourceLga.abbreviation).padStart(3, "0")}`;
      const wards = [];
      const units = {};

      for (const sourceWard of sourceLga.wards) {
        const wardNo = String(sourceWard.abbreviation).padStart(2, "0");
        const name = placeName(sourceWard.name);
        if (!name) {
          notes.push(`${state.name}/${sourceLga.name}: ward ${wardNo} has no name`);
          continue;
        }

        /* Exactly one row per ward in the source has no name: it is the ward's
           own entry in the polling unit table, not a polling unit. Dropping
           those 8,809 rows is what takes the file's 185,432 down to the
           176,623 the register actually holds. */
        const wardUnits = [];
        const usedNumbers = new Set();

        for (const unit of sourceWard.pollingUnits) {
          if (!unit?.name) continue;
          const unitName = tidy(titleCase(unit.name));
          if (!unitName) continue;

          /* Twenty-nine registration areas in the country number two of their
             polling units the same. They are genuinely two different units —
             different names, different buildings — so the second is given a
             letter rather than dropped, and the number INEC published is left
             on the first. Inventing an unused number instead would put this
             unit on a code INEC may later issue to a different one. */
          let number = String(unit.abbreviation).padStart(3, "0");
          if (usedNumbers.has(number)) {
            const base = number;
            for (const letter of "BCDEFGH") {
              number = base + letter;
              if (!usedNumbers.has(number)) break;
            }
            notes.push(
              `${state.name}/${sourceLga.name}/${name}: two units numbered ${base}; ` +
                `"${unitName}" filed as ${number}`
            );
          }
          usedNumbers.add(number);

          wardUnits.push([number, unitName]);
          if (unit.remark === "NEW PU") totals.added2021 += 1;
          else totals.existing += 1;
        }
        wardUnits.sort((a, b) => a[0].localeCompare(b[0], "en"));

        wards.push({ code: `${lgaCode}-${wardNo}`, name, units: wardUnits.length });
        if (wardUnits.length) units[wardNo] = wardUnits;

        counts.wards += 1;
        counts.pollingUnits += wardUnits.length;
      }

      wards.sort((a, b) => byName(a.name, b.name));
      lgas.push({ code: lgaCode, name: lgaName(sourceLga.name, state.code), wards });
      counts.lgas += 1;

      await writeFile(path.join(OUT, "pu", `${lgaCode}.json`), JSON.stringify(units));
    }

    lgas.sort((a, b) => byName(a.name, b.name));

    await writeFile(
      path.join(OUT, `${state.slug}.json`),
      JSON.stringify({ state: state.name, code: state.code, slug: state.slug, lgas })
    );

    index.push({ name: state.name, code: state.code, slug: state.slug, ...counts });
    totals.lgas += counts.lgas;
    totals.wards += counts.wards;
    totals.pollingUnits += counts.pollingUnits;

    console.log(
      `  ${state.name.padEnd(26)} ${String(counts.lgas).padStart(2)} LGAs  ` +
        `${String(counts.wards).padStart(4)} wards  ` +
        `${counts.pollingUnits.toLocaleString().padStart(7)} polling units`
    );
  }

  index.sort((a, b) => byName(a.name, b.name));
  await writeFile(
    path.join(OUT, "index.json"),
    JSON.stringify(
      {
        source: SOURCE_NOTE,
        generated: new Date().toISOString(),
        totals: { states: index.length, ...totals },
        states: index,
      },
      null,
      2
    )
  );

  console.log(
    `\nWrote ${index.length} states, ${totals.lgas} LGAs, ` +
      `${totals.wards.toLocaleString()} wards and ` +
      `${totals.pollingUnits.toLocaleString()} polling units to public/geo/\n` +
      `  ${totals.existing.toLocaleString()} predate the 2021 expansion; ` +
      `${totals.added2021.toLocaleString()} were created by it.`
  );

  if (notes.length) {
    console.warn(`\n${notes.length} row(s) skipped:`);
    for (const line of notes) console.warn(`  ${line}`);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
