import { NextResponse } from "next/server";

import { currentMember } from "@/lib/session";
import { agentPost, ballot, fileReturn, validateReturn } from "@/lib/results";
import { prisma } from "@/lib/db";
import { callerKey, limit, tooMany } from "@/lib/ratelimit";

export const runtime = "nodejs";

/* An EC8A photographed on a phone. Downscaled in the browser first, but the
   server does not trust that — a 12MP original would still be accepted below
   this and re-encoded, and anything above it is refused outright. */
const MAX_SHEET_BYTES = 12 * 1024 * 1024;
const SHEET_MAX_EDGE = 1600;

/**
 * File a return from the polling unit this agent holds.
 *
 * ── WHAT IS TRUSTED AND WHAT IS NOT ────────────────────────────────────────
 * Trusted: the session cookie, and the appointment it resolves to. That is
 * where the polling unit comes from.
 *
 * Not trusted: everything in the request body. The unit is not a field. The
 * ward, LGA and state are written from the seat. The numbers are checked
 * against each other before they are stored, and the photograph is re-decoded
 * and re-encoded rather than kept as sent.
 * ───────────────────────────────────────────────────────────────────────────
 */
export async function POST(request) {
  const quota = limit("results", callerKey(request));
  if (!quota.ok) return tooMany(quota.retryAfter);

  const member = await currentMember();
  if (!member) {
    return NextResponse.json({ error: "Sign in to file a return." }, { status: 401 });
  }

  const post = await agentPost(member.id);
  if (!post) {
    return NextResponse.json(
      { error: "You do not hold a polling unit seat, so there is no booth to file for." },
      { status: 403 }
    );
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Malformed submission." }, { status: 400 });
  }

  const electionId = Number(form.get("electionId"));
  const election = await prisma.election.findUnique({ where: { id: electionId } });
  if (!election || election.status !== "OPEN") {
    return NextResponse.json(
      { errors: { electionId: "That election is not accepting returns." } },
      { status: 422 }
    );
  }

  /* Both affirmations are required, and both are stored. A return where the
     agent did not confirm they were standing at the unit is not a return we
     would be willing to publish, so it is not one we accept. */
  if (form.get("locationConfirmed") !== "true") {
    return NextResponse.json(
      { errors: { locationConfirmed: "Confirm you are filing from this polling unit." } },
      { status: 422 }
    );
  }
  if (form.get("termsAccepted") !== "true") {
    return NextResponse.json(
      { errors: { termsAccepted: "Accept the agent's declaration before filing." } },
      { status: 422 }
    );
  }

  const number = (name) => {
    const raw = String(form.get(name) ?? "").replace(/[^\d]/g, "");
    return raw === "" ? null : Number(raw);
  };

  const parties = await ballot();
  const votes = {};
  for (const party of parties) votes[party.id] = number(`party_${party.id}`) ?? 0;

  const registered = number("registered");
  const accredited = number("accredited");
  const rejected = number("rejected");

  const check = validateReturn({ votes, accredited, registered, rejected });
  if (!check.ok) {
    return NextResponse.json({ errors: check.errors }, { status: 422 });
  }

  /* The sheet. Optional on an amendment — if one is already on file the agent
     does not have to photograph it twice — but the page pushes hard for it,
     because the numbers are only worth what the evidence behind them is. */
  let sheet = null;
  const upload = form.get("sheet");
  if (upload && typeof upload === "object" && upload.size > 0) {
    if (upload.size > MAX_SHEET_BYTES) {
      return NextResponse.json(
        { errors: { sheet: "That image is larger than 12MB." } },
        { status: 422 }
      );
    }
    try {
      const { default: sharp } = await import("sharp");
      const source = Buffer.from(await upload.arrayBuffer());
      const image = sharp(source, { failOn: "none" }).rotate();
      const meta = await image.metadata();
      const bytes = await image
        .resize({ width: SHEET_MAX_EDGE, height: SHEET_MAX_EDGE, fit: "inside", withoutEnlargement: true })
        // JPEG, not WebP: this is evidence somebody may need to open in
        // whatever software is to hand years from now.
        .jpeg({ quality: 82 })
        .toBuffer();
      const resized = await sharp(bytes).metadata();
      sheet = {
        bytes,
        mimeType: "image/jpeg",
        width: resized.width ?? meta.width ?? 0,
        height: resized.height ?? meta.height ?? 0,
        byteSize: bytes.length,
      };
    } catch {
      return NextResponse.json(
        { errors: { sheet: "That file could not be read as an image." } },
        { status: 422 }
      );
    }
  }

  try {
    const result = await fileReturn({
      post,
      electionId,
      memberId: member.id,
      values: {
        votes,
        registered,
        accredited,
        rejected,
        inecAccredited: number("inecAccredited"),
        inecTotalVotes: number("inecTotalVotes"),
        note: String(form.get("note") ?? "").trim() || null,
      },
      sheet,
    });

    return NextResponse.json({
      id: String(result.id),
      total: check.cast,
      pollingUnit: post.name,
      status: "SUBMITTED",
    });
  } catch (error) {
    console.error("[results]", error);
    return NextResponse.json(
      { error: "The return could not be saved. Please try again." },
      { status: 503 }
    );
  }
}
