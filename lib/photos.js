import crypto from "node:crypto";

import sharp from "sharp";

import { prisma } from "./db";

/**
 * Profile photographs: what is accepted, what is stored, and what comes back.
 *
 * Every image that reaches this file is re-encoded from scratch. Nothing a
 * member uploads is ever served back to anyone byte for byte, which is the
 * only reliable way to be sure that what the browser receives is an image and
 * not a polyglot file with a script bolted onto the end of a valid JPEG.
 *
 * Re-encoding also strips EXIF, and EXIF on a phone photograph carries GPS
 * coordinates. A movement organising ward by ward must not publish the home
 * address of every member who uploads a selfie taken indoors.
 *
 * Server only.
 */

/* The upload cap, applied before a single byte reaches sharp. The browser
   downscales to ~1024px first (see components/PhotoUploader.jsx), so a normal
   upload arrives at 100-300KB; this ceiling is for the client that could not,
   and for anything trying to hand a decoder a 200MB bomb. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/* What the file picker offers. HEIC is not on this list on purpose: iOS
   converts to JPEG when a photo is chosen through a file input, so accepting
   it would only widen the surface for a format the prebuilt libvips may not
   decode. */
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ACCEPT_ATTRIBUTE = ACCEPTED_TYPES.join(",");

/* 512 square. Twice the largest place it is ever drawn (a 256px portal
   avatar), so it stays sharp on a 2x phone screen and nowhere near large
   enough to be worth storing at full camera resolution. */
const EDGE = 512;

/**
 * The first bytes of the file, checked against the formats we accept.
 *
 * The multipart part's own `type` is whatever the client wrote there and is
 * not evidence of anything. This is.
 */
function sniff(buffer) {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP")
    return "image/webp";
  return null;
}

/**
 * Validate, decode and re-encode. Returns `{ error }` for anything a member
 * can fix by choosing a different file, and throws only on a genuine fault.
 */
export async function processAvatar(buffer) {
  if (!buffer?.length) return { error: "That file was empty." };
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return { error: `That image is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.` };
  }
  if (!sniff(buffer)) {
    return { error: "Use a JPEG, PNG or WebP image." };
  }

  let image;
  try {
    /* `limitInputPixels` caps the decoded size, not the file size: a 40KB PNG
       can legitimately declare 50,000 x 50,000 pixels and take the process
       down with it while sharp allocates for it. 40MP is generous for a
       portrait and stops that flat. */
    image = sharp(buffer, { limitInputPixels: 40_000_000, failOn: "error" });
    const meta = await image.metadata();
    if (!meta.width || !meta.height) return { error: "That file is not a readable image." };
    if (meta.width < 128 || meta.height < 128) {
      return { error: "That image is too small. Use one at least 128 pixels on each side." };
    }
  } catch {
    return { error: "That file could not be read as an image." };
  }

  const bytes = await image
    /* From EXIF orientation, before the crop. Without it, a portrait taken on
       a phone held sideways is cropped along the wrong axis and the member
       ends up centred on their own ear. */
    .rotate()
    .resize(EDGE, EDGE, {
      fit: "cover",
      /* `attention` crops toward the region libvips scores as most salient,
         which on a portrait is the face. Centre-cropping a full-length photo
         reliably produces a picture of somebody's chest. */
      position: sharp.strategy.attention,
      withoutEnlargement: false,
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  return {
    photo: {
      bytes,
      mimeType: "image/webp",
      width: EDGE,
      height: EDGE,
      byteSize: bytes.length,
      version: crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 16),
    },
  };
}

/** The URL a photo is served from. Versioned, so it can be cached forever. */
export function photoUrl(memberId, version) {
  return `/api/members/${memberId}/photo?v=${version}`;
}

/**
 * Store a processed photo and point the member at it.
 *
 * One transaction: a `photoUrl` with no bytes behind it renders a broken
 * image on every page the member appears on, and bytes with no URL are
 * invisible and never collected.
 */
export async function saveMemberPhoto(memberId, photo) {
  const id = BigInt(memberId);
  const url = photoUrl(memberId, photo.version);

  await prisma.$transaction([
    prisma.memberPhoto.upsert({
      where: { memberId: id },
      create: { memberId: id, ...photo },
      update: photo,
    }),
    prisma.member.update({ where: { id }, data: { photoUrl: url } }),
  ]);

  return url;
}

/** Remove both halves. Idempotent: removing a photo nobody has is not an error. */
export async function removeMemberPhoto(memberId) {
  const id = BigInt(memberId);

  await prisma.$transaction([
    prisma.memberPhoto.deleteMany({ where: { memberId: id } }),
    prisma.member.update({ where: { id }, data: { photoUrl: null } }),
  ]);
}
