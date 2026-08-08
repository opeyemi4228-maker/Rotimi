import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, Camera, ShieldAlert } from "lucide-react";

import MembershipCard from "@/components/MembershipCard";
import { currentMember } from "@/lib/session";
import { cardData, cardFilename, inlineCardSvg } from "@/lib/idcard";

export const metadata = {
  title: "Your membership card — MAP",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Every member's card, under /portal because every member has one.
 *
 * It is not an admin feature. A Ward Officer and somebody who registered this
 * morning both get the same card, from the same page, with the same buttons —
 * the only difference on it is the line naming an office, and that line is
 * absent for most of the movement.
 */
export default async function PortalIdCard() {
  const member = await currentMember();
  if (!member) redirect("/login?next=/portal/id-card");

  /* The QR has to point at this deployment, so the origin comes from the
     request rather than from a constant that would be wrong on staging. */
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const origin = `${protocol}://${host}`;

  const data = await cardData(member.id, { origin });
  if (!data) redirect("/portal");

  const svg = inlineCardSvg(data);

  return (
    <div className="min-h-screen bg-ink-50 print:bg-white">
      <section className="no-print border-b-2 border-ink-950 bg-white">
        <div className="shell py-8">
          <Link
            href="/portal"
            className="inline-flex items-center gap-2 text-[0.75rem] font-bold tracking-[0.08em] text-ink-500 uppercase hover:text-ink-950"
          >
            <ArrowLeft size={14} strokeWidth={3} />
            Your membership
          </Link>
          <h1 className="mt-4 font-display text-fluid-2xl font-extrabold tracking-[-0.025em] text-ink-950">
            Your membership card
          </h1>
          <p className="prose-body mt-3 max-w-2xl text-[0.9375rem]">
            Download it, print it, or keep it on your phone. Everything on it is
            read from the register — it is a convenient copy of your entry, not
            a document that proves anything by itself.
          </p>
        </div>
      </section>

      <main className="shell py-10 print:py-0">
        <MembershipCard svg={svg} filename={cardFilename(data, "png")} />

        {/* What is missing from it, and where to fix that. Told here rather
            than printed on the card, because a card should not carry a to-do
            list for the person holding it. */}
        <div className="no-print mx-auto mt-10 max-w-2xl space-y-4">
          {!data.photo && (
            <p className="flex items-start gap-3 border-l-4 border-ember-500 bg-ember-50 p-4 text-[0.875rem] leading-relaxed text-ink-950">
              <Camera size={17} className="mt-0.5 shrink-0 text-ember-600" aria-hidden="true" />
              <span>
                Your card has no photograph on it.{" "}
                <Link href="/portal" className="font-bold text-brand-700 underline underline-offset-2">
                  Add one from your membership page
                </Link>{" "}
                and download the card again — a card without a face is not much
                use at a congress.
              </span>
            </p>
          )}

          {!data.verified && (
            <p className="flex items-start gap-3 border-l-4 border-ink-300 bg-white p-4 text-[0.875rem] leading-relaxed text-content-muted">
              <ShieldAlert size={17} className="mt-0.5 shrink-0 text-ink-400" aria-hidden="true" />
              <span>
                Your card reads “verification pending”. That is not a problem
                with the card — verification needs a photograph and your
                voter&rsquo;s card number on file, and it is only required to
                hold office at LGA level and above.
              </span>
            </p>
          )}

          <div className="border border-ink-200 bg-white p-5">
            <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
              About the QR code
            </p>
            <p className="mt-2.5 text-[0.875rem] leading-relaxed text-content-muted">
              Scanning it opens your entry in the movement&rsquo;s register.
              Only a coordinator signed in to the secretariat can read that
              entry — anyone else who scans your card reaches a sign-in page and
              learns nothing about you. That is deliberate.
            </p>
          </div>

          <p className="text-[0.8125rem] leading-relaxed text-content-subtle">
            Printed at actual size the card is 85.6 × 54mm, the same as a bank
            card. The PNG is 3,424 pixels wide, which is 300 DPI at that size,
            so it prints cleanly at a shop as well as at home.
          </p>
        </div>
      </main>
    </div>
  );
}
