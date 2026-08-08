import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import {
  ACCEPTED_TYPES,
  MAX_UPLOAD_BYTES,
  processAvatar,
  removeMemberPhoto,
  saveMemberPhoto,
} from "@/lib/photos";
import { currentMember } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A member's own photograph: upload it, or take it down.
 *
 * Deliberately scoped to *your own* record and nothing else. There is no
 * `?memberId=` on this route, so no amount of guessing lets one coordinator
 * put a picture on somebody else's profile — the subject of the write is the
 * session, never a parameter.
 *
 * Leaders reach it through the same portal control every other member uses,
 * because a leader is a member who also holds a seat, and giving office
 * holders a separate upload path would be two implementations of one feature
 * waiting to disagree about what a valid image is.
 */
export async function POST(request) {
  const member = await currentMember();
  if (!member) {
    return NextResponse.json({ error: "Sign in to change your photograph." }, { status: 401 });
  }

  /* Reject on the declared length before reading the body at all. Reading
     8MB into memory to then say "too big" is doing the attacker's work. */
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES * 1.1) {
    return NextResponse.json(
      { error: `That image is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.` },
      { status: 413 }
    );
  }

  let file;
  try {
    const form = await request.formData();
    file = form.get("photo");
  } catch {
    return NextResponse.json({ error: "That upload did not arrive intact." }, { status: 400 });
  }

  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ error: "Choose an image to upload." }, { status: 422 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `That image is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.` },
      { status: 413 }
    );
  }
  /* The declared type is a hint, worth checking early for a clear message.
     lib/photos.js does not trust it — it sniffs the bytes. */
  if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Use a JPEG, PNG or WebP image." }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let result;
  try {
    result = await processAvatar(buffer);
  } catch (error) {
    console.error("[photo] processing failed", error);
    return NextResponse.json(
      { error: "That image could not be processed. Try a different one." },
      { status: 500 }
    );
  }
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  const hadPhoto = Boolean(member.photoUrl);

  try {
    const url = await saveMemberPhoto(member.id, result.photo);
    await audit(member.id, hadPhoto ? "PHOTO_REPLACED" : "PHOTO_ADDED", request);
    return NextResponse.json({ photoUrl: url });
  } catch (error) {
    console.error("[photo] save failed", error);
    return NextResponse.json(
      { error: "Your photograph could not be saved. Please try again." },
      { status: 503 }
    );
  }
}

export async function DELETE(request) {
  const member = await currentMember();
  if (!member) {
    return NextResponse.json({ error: "Sign in to change your photograph." }, { status: 401 });
  }

  try {
    await removeMemberPhoto(member.id);
    await audit(member.id, "PHOTO_REMOVED", request);
    return NextResponse.json({ photoUrl: null });
  } catch (error) {
    console.error("[photo] delete failed", error);
    return NextResponse.json(
      { error: "Your photograph could not be removed. Please try again." },
      { status: 503 }
    );
  }
}

/**
 * §13.2 keeps an append-only trail of who changed what. A portrait is the
 * field most worth being able to reconstruct after a dispute — it is what a
 * ward register is checked against.
 *
 * Never fatal: a failed audit write must not undo a change the member has
 * already been told succeeded.
 */
async function audit(memberId, action, request) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: BigInt(memberId),
        action,
        entityType: "Member",
        entityId: BigInt(memberId),
        ipAddress: clientIp(request),
      },
    });
  } catch (error) {
    console.error("[photo] audit write failed", error);
  }
}

function clientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  // The left-most entry is the client; everything after it is proxies.
  const ip = forwarded?.split(",")[0].trim() || request.headers.get("x-real-ip");
  // The column is INET. A malformed value would fail the insert, so drop it.
  return ip && /^[0-9a-fA-F:.]+$/.test(ip) ? ip : null;
}
