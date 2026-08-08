import { NextResponse } from "next/server";

import { currentMember } from "@/lib/session";
import { cardData, cardFilename, renderCardPng, renderCardSvg } from "@/lib/idcard";

/* sharp is a native binary, so this cannot run on the edge. */
export const runtime = "nodejs";

/**
 * Download your own membership card.
 *
 *   GET /api/member/id-card            -> PNG, print resolution
 *   GET /api/member/id-card?format=svg -> SVG, vector
 *
 * Your own, and only your own. There is no `?member=` parameter and there will
 * not be one: a coordinator who needs to check somebody's card scans the QR on
 * it, which lands them in the register where the scope rules already apply.
 * An endpoint that renders any member's card on request would be a way to pull
 * a photograph and a home ward out of the register one id at a time.
 */
export async function GET(request) {
  const member = await currentMember();
  if (!member) {
    return NextResponse.json({ error: "Sign in to download your card." }, { status: 401 });
  }

  const format = new URL(request.url).searchParams.get("format") === "svg" ? "svg" : "png";

  /* The QR has to point at wherever this deployment actually lives, so the
     origin is taken from the request rather than from a build-time constant.
     A card downloaded from a preview deployment then verifies against that
     preview, which is the honest behaviour. */
  const origin = new URL(request.url).origin;

  const data = await cardData(member.id, { origin });
  if (!data) {
    return NextResponse.json({ error: "No membership record found." }, { status: 404 });
  }

  const svg = renderCardSvg(data);
  const filename = cardFilename(data, format);

  /* No caching. The card carries the member's photograph, their office and
     their verification state, all of which change — and it is small enough
     that regenerating it costs less than serving a stale one. */
  const headers = {
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store",
  };

  if (format === "svg") {
    return new NextResponse(svg, {
      headers: { ...headers, "Content-Type": "image/svg+xml; charset=utf-8" },
    });
  }

  const png = await renderCardPng(svg);
  return new NextResponse(png, {
    headers: { ...headers, "Content-Type": "image/png" },
  });
}
