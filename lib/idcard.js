import { readFile } from "node:fs/promises";
import path from "node:path";

import QRCode from "qrcode";

import { prisma } from "./db";
import { fullName } from "./store";

/**
 * The membership card, drawn once as SVG and used for everything.
 *
 * ── WHY SVG AND NOT JSX ────────────────────────────────────────────────────
 * The card has to be three things at once: something the member looks at in
 * the browser, something they download as a file, and something that comes out
 * of a printer at the right physical size. Laying it out three times in three
 * technologies guarantees the printed one drifts from the one on screen.
 *
 * So it is drawn once, here, as a string of SVG. The page inlines that exact
 * string; the download route rasterises that exact string with sharp. What a
 * member sees is what they get, to the pixel.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * ── WHAT IT IS NOT ─────────────────────────────────────────────────────────
 * Not an identity document. No hologram, no signature panel, no expiry, and
 * nothing that would make a printout worth forging. It carries what the
 * register already knows and what somebody at a congress needs to read off it.
 *
 * The QR code is the point: it opens the register itself, filtered to this
 * membership number. Anyone checking a card properly checks the register, and
 * the register requires a coordinator's login — so a scan by a stranger lands
 * on a sign-in page and discloses nothing. That is deliberate. A public
 * "verify this member" page would be an enumerable directory of everybody's
 * name and ward.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Server only.
 */

/* ISO/IEC 7810 ID-1 — a bank card. Drawn at 10 units per mm, so every
   coordinate below is a tenth of a millimetre and the geometry can be checked
   against a ruler. */
const W = 856;
const H = 540;

/* The photograph's frame. Named here because cardData crops to it and
   renderCardSvg draws it, and the two must not disagree. */
const PHOTO_W = 180;
const PHOTO_H = 196;

const BRAND = "#008751"; // Nigeria green, the movement's own
const EMBER = "#FF6B35";
const INK = "#1C1917";
const MUTED = "#6B6660";
const HAIRLINE = "#DDDAD5";

/* Montserrat is what the site is set in, but a server rasterising this has
   only its own fonts. A stack rather than one name, so it degrades to whatever
   grotesque is installed instead of falling back to a serif. */
const FONT = "Montserrat, Helvetica Neue, Helvetica, Arial, sans-serif";

/* There is no text layout engine here, so widths are estimated: a bold
   grotesque averages about this much of its point size per character. It only
   has to be close — the consequence of being wrong is one size out. */
const CHAR = 0.58;
const SIZES = [26, 23, 20, 18];

/* ---------------------------------------------------------------- helpers */

/** XML-escape. Names contain apostrophes; some contain ampersands. */
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Trim to fit, because a card cannot scroll. */
function clip(value, max) {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/**
 * Choose a size, and a line break, for a value in a fixed column.
 *
 * The order of preference is deliberate: shrink first, then wrap to two lines,
 * and only clip as a last resort. "Federal Capital Territory" is a real state
 * name belonging on a real member's card, and neither "Federal Capital Ter…"
 * nor six-point type is an acceptable way to print it.
 */
function fit(text, width) {
  const single = SIZES.find((size) => text.length * size * CHAR <= width);
  if (single) return { size: single, lines: [text] };

  const words = text.split(" ");
  if (words.length > 1) {
    let best = null;
    for (let cut = 1; cut < words.length; cut += 1) {
      const pair = [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
      const longest = Math.max(...pair.map((line) => line.length));
      const size = SIZES.find((candidate) => longest * candidate * CHAR <= width);
      if (size && (!best || size > best.size)) best = { size, lines: pair };
    }
    if (best) return best;
  }

  const size = SIZES.at(-1);
  return { size, lines: [clip(text, Math.floor(width / (size * CHAR)))] };
}

/** One label-over-value pair in the details grid, set to fit its column. */
function field(x, y, label, value, width) {
  const { size, lines } = fit(String(value ?? "—"), width);

  return `
    <text x="${x}" y="${y}" font-family="${FONT}" font-size="17" font-weight="700"
          letter-spacing="2.2" fill="${MUTED}">${esc(label.toUpperCase())}</text>
    ${lines
      .map(
        (line, index) =>
          `<text x="${x}" y="${y + 30 + index * (size + 2)}" font-family="${FONT}"
          font-size="${size}" font-weight="700" fill="${INK}">${esc(line)}</text>`
      )
      .join("\n    ")}`;
}

/* The mark, read once and kept. It is the same bytes on every card and this
   module is long-lived, so reading it per request would be one disk hit per
   member for a file that never changes. Taken from public/ rather than
   assets/, because assets/ is bundled by the compiler and is not guaranteed to
   exist as a file on disk at runtime. */
let markPromise = null;

function watermark() {
  markPromise ??= readFile(path.join(process.cwd(), "public", "map-mark.png"))
    .then((bytes) => `data:image/png;base64,${bytes.toString("base64")}`)
    .catch(() => null); // A card without a watermark is still a card.
  return markPromise;
}

/* ------------------------------------------------------------------- data */

/**
 * Everything the card shows, for one member.
 *
 * The photograph is read here and inlined as a data URI rather than linked:
 * the SVG has to survive being downloaded and opened on a machine that is not
 * logged in, and a linked <image href="/api/..."> would render as a blank box.
 */
export async function cardData(memberId, { origin }) {
  const row = await prisma.member.findUnique({
    where: { id: BigInt(memberId) },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      surname: true,
      membershipNo: true,
      referralCode: true,
      verification: true,
      joinedAt: true,
      state: { select: { name: true, code: true } },
      lga: { select: { name: true } },
      ward: { select: { name: true } },
      photo: { select: { bytes: true } },
      appointments: {
        where: { status: "ACTIVE" },
        take: 1,
        select: { seat: { select: { role: { select: { title: true } } } } },
      },
    },
  });

  if (!row) return null;

  /* Re-encoded to JPEG rather than embedded as stored. Photographs are kept as
     WebP, which every browser reads and which librsvg — the rasteriser behind
     sharp — does not: the card came out with an empty frame where the face
     should be, on the download only, which is the worst possible place for it
     to fail. JPEG is what both understand. Cropping to the frame's own aspect
     here also means the data URI carries the pixels the card actually shows
     rather than a square it will trim anyway. */
  let photo = null;
  if (row.photo?.bytes) {
    try {
      const { default: sharp } = await import("sharp");
      const jpeg = await sharp(Buffer.from(row.photo.bytes))
        /* Anchored to the top, not to sharp's "attention" heuristic. On a
           full-length photograph — most of what gets uploaded from a phone —
           attention picked the torso and cut the head off. The head is at the
           top of a portrait, every time. */
        .resize(PHOTO_W * 2, PHOTO_H * 2, { fit: "cover", position: "top" })
        .jpeg({ quality: 86 })
        .toBuffer();
      photo = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
    } catch {
      // A card with an empty frame is still usable; a card that throws is not.
      photo = null;
    }
  }

  const verifyUrl = row.membershipNo
    ? // Slashes are legal unescaped in a query string, and every %2F is three
      // more characters the QR has to carry.
      `${origin}/admin/members?q=${row.membershipNo}`
    : `${origin}/portal`;

  return {
    id: String(row.id),
    name: fullName(row),
    membershipNo: row.membershipNo,
    referralCode: row.referralCode,
    verified: row.verification === "VERIFIED",
    state: row.state.name,
    stateCode: row.state.code,
    lga: row.lga.name,
    ward: row.ward.name,
    office: row.appointments[0]?.seat.role.title ?? null,
    joinedAt: row.joinedAt,
    photo,
    mark: await watermark(),
    verifyUrl,
    /* Error correction L, not M. This code is printed at 15mm on a clean white
       card, not stencilled on a crate — the lower level buys fewer modules,
       which means bigger modules, which is the only thing that decides whether
       a phone can read it at that size. Two modules of quiet zone are carried
       inside its own viewBox, so the margin cannot be lost to a layout change. */
    qr: await QRCode.toString(verifyUrl, {
      type: "svg",
      margin: 2,
      errorCorrectionLevel: "L",
    }),
  };
}

/* ----------------------------------------------------------------- render */

const joinedLabel = (date) =>
  new Intl.DateTimeFormat("en-NG", {
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(date);

/**
 * The card as a standalone SVG string.
 *
 * No external references of any kind — no fonts to fetch, no images to load,
 * no stylesheet. It renders identically inline in a page, opened from disk, and
 * fed to a rasteriser with no network.
 */
export function renderCardSvg(data) {
  /* The QR arrives as its own <svg> with a 0..N viewBox. Strip the wrapper and
     scale its guts into the square we have room for. */
  const qrViewBox = /viewBox="0 0 (\d+) (\d+)"/.exec(data.qr);
  const qrModules = qrViewBox ? Number(qrViewBox[1]) : 29;
  const qrInner = data.qr.replace(/<\/?svg[^>]*>/g, "");

  /* ── The right column, measured ─────────────────────────────────────────
     The first version placed the QR by eye and it landed on top of the footer
     rule and its own caption. The column is now a stack with the gaps written
     down:

       photograph   118 → 314
       gap                  12
       QR           326 → 476   (15mm square; below about 12mm a phone cannot
       gap                  16   resolve the modules in print)
       footer rule  492
  */
  const colRight = 816;
  const photoX = colRight - PHOTO_W;
  const photoY = 118;
  const qrBox = 150;
  const qrX = colRight - qrBox;
  const qrY = 326;
  const footerY = 492;
  const gutter = photoX - 20; // where the left column has to stop

  /* The mark, centred on the card — 1177 × 640 in the original. 400 wide keeps
     it clear of the photograph's column at 636, so the watermark never sits
     under a face or, the one that would actually break something, under the QR
     code, which a scanner reads by contrast. */
  const markW = 400;
  const markH = Math.round((markW * 640) / 1177);
  const markX = Math.round((W - markW) / 2);
  const markY = Math.round(102 + (footerY - 102 - markH) / 2);

  /* Nigerian names run long — "Ibinabo Georgewill-Amachree" is 27 characters —
     and the name is the one line on the card that should never be cut. */
  const nameSize =
    [38, 34, 30, 27].find((size) => data.name.length * size * CHAR <= gutter - 40) ?? 27;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="MAP membership card for ${esc(data.name)}">
  <title>MAP membership card — ${esc(data.name)}</title>

  <rect width="${W}" height="${H}" fill="#FFFFFF"/>

  <!-- ── The mark, faint, behind everything ────────────────────────────────
       A watermark on an ID card is doing a job, not decorating: it is what a
       plain photocopy or a screenshot pasted into a template does not have. So
       it goes under the type rather than beside it.

       5% is the whole design decision. Above about 8% it competes with the
       labels; below 3% it disappears on a cheap printer. -->
  ${
    data.mark
      ? `<image x="${markX}" y="${markY}" width="${markW}" height="${markH}"
             href="${data.mark}" xlink:href="${data.mark}" opacity="0.05"
             preserveAspectRatio="xMidYMid meet"/>`
      : ""
  }

  <!-- Masthead. The movement's name in full: a card that only says "MAP" is a
       card nobody outside the movement can place. -->
  <rect x="0" y="0" width="${W}" height="96" fill="${BRAND}"/>
  <rect x="0" y="96" width="${W}" height="6" fill="${EMBER}"/>
  <text x="40" y="46" font-family="${FONT}" font-size="26" font-weight="800"
        letter-spacing="1.5" fill="#FFFFFF">MOVEMENT FOR AMAECHI PRESIDENCY</text>
  <text x="40" y="76" font-family="${FONT}" font-size="18" font-weight="600"
        letter-spacing="4" fill="#BFE3D0">MEMBERSHIP CARD</text>
  <text x="${W - 40}" y="60" text-anchor="end" font-family="${FONT}" font-size="34"
        font-weight="800" letter-spacing="2" fill="#FFFFFF">${esc(data.stateCode)}</text>

  <!-- Name, and the number under it. The number is set as large as the name
       because it is the thing that actually gets looked up. -->
  <text x="40" y="152" font-family="${FONT}" font-size="${nameSize}" font-weight="800"
        fill="${INK}">${esc(clip(data.name, Math.floor((gutter - 40) / (nameSize * CHAR))))}</text>
  <text x="40" y="196" font-family="${FONT}" font-size="30" font-weight="800"
        letter-spacing="1.5" fill="${BRAND}">${esc(data.membershipNo ?? "NUMBER PENDING")}</text>

  <line x1="40" y1="224" x2="${gutter}" y2="224" stroke="${HAIRLINE}" stroke-width="2"/>

  <!-- Where they vote, which is the whole basis of their membership. -->
  ${/* Rows 86 apart, not 78. A value that wraps to a second line needs the
       room, and "Federal Capital Territory" — a real state on a real card —
       wraps. At this spacing a wrapped value still clears the label beneath it
       by 31 units, whichever row it lands in. */ ""}
  ${field(40, 254, "State", data.state, 250)}
  ${field(310, 254, "LGA", data.lga, gutter - 310)}
  ${field(40, 340, "Ward", data.ward, 250)}
  ${field(310, 340, "Member since", joinedLabel(data.joinedAt), gutter - 310)}
  ${
    data.office
      ? field(40, 426, "Office held", data.office, gutter - 40)
      : field(40, 426, "Referral code", data.referralCode ?? "—", gutter - 40)
  }

  <!-- Photograph -->
  ${
    data.photo
      ? `<image x="${photoX}" y="${photoY}" width="${PHOTO_W}" height="${PHOTO_H}"
             href="${data.photo}" xlink:href="${data.photo}"
             preserveAspectRatio="xMidYMid slice"/>
         <rect x="${photoX}" y="${photoY}" width="${PHOTO_W}" height="${PHOTO_H}"
             fill="none" stroke="${INK}" stroke-width="3"/>`
      : `<rect x="${photoX}" y="${photoY}" width="${PHOTO_W}" height="${PHOTO_H}"
             fill="#F2F0ED" stroke="${HAIRLINE}" stroke-width="3"/>
         <text x="${photoX + PHOTO_W / 2}" y="${photoY + PHOTO_H / 2 - 4}" text-anchor="middle"
             font-family="${FONT}" font-size="17" font-weight="700" fill="${MUTED}">NO</text>
         <text x="${photoX + PHOTO_W / 2}" y="${photoY + PHOTO_H / 2 + 20}" text-anchor="middle"
             font-family="${FONT}" font-size="17" font-weight="700" fill="${MUTED}">PHOTOGRAPH</text>`
  }

  <!-- Scan to open the register entry. No caption: nobody needs telling what a
       QR code is, and the words were colliding with it. -->
  <g transform="translate(${qrX} ${qrY}) scale(${qrBox / qrModules})">
    ${qrInner}
  </g>

  <!-- Footer -->
  <line x1="0" y1="${footerY}" x2="${W}" y2="${footerY}" stroke="${HAIRLINE}" stroke-width="2"/>
  <circle cx="52" cy="${footerY + 26}" r="7" fill="${data.verified ? BRAND : EMBER}"/>
  <text x="70" y="${footerY + 32}" font-family="${FONT}" font-size="18" font-weight="700"
        letter-spacing="1.4" fill="${data.verified ? BRAND : "#A8500F"}">${
          data.verified ? "VERIFIED MEMBER" : "VERIFICATION PENDING"
        }</text>
  <text x="${W - 40}" y="${footerY + 32}" text-anchor="end" font-family="${FONT}" font-size="17"
        font-weight="600" letter-spacing="1.2" fill="${MUTED}">Scan the code to verify in the register</text>
</svg>`;
}

/**
 * The same card, sized to whatever box it is put in.
 *
 * The download needs real `width` and `height` attributes — the rasteriser
 * reads them, and a file with no intrinsic size opens at whatever a viewer
 * guesses. In a browser those same attributes are an intrinsic size rather than
 * a maximum, so the card rendered at 856px inside a narrower column and the
 * column simply cut it off: half a card. Swapping them for a style on the root
 * element fixes it at the source, rather than relying on every page that embeds
 * the card to remember a CSS override.
 */
export function inlineCardSvg(data) {
  return renderCardSvg(data).replace(
    /^<svg([^>]*?)width="\d+" height="\d+"/,
    '<svg$1style="display:block;width:100%;height:auto"'
  );
}

/**
 * The card as a PNG, at print resolution.
 *
 * 300 DPI over 85.6mm is 1,011px, so a 4× render of the 856-unit drawing lands
 * comfortably above that and prints without visible stepping.
 */
export async function renderCardPng(svg, { scale = 4 } = {}) {
  // Imported here, not at module load: sharp is a native binary and nothing
  // that merely reads a card's data should have to pay for loading it.
  const { default: sharp } = await import("sharp");
  return sharp(Buffer.from(svg), { density: 72 * scale })
    .resize({ width: W * scale })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** "map-membership-card-MAP-RIV-022-000003.png" */
export function cardFilename(data, extension) {
  const stem = (data.membershipNo ?? data.name)
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `map-membership-card-${stem}.${extension}`;
}
