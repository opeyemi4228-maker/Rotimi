import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

import MembershipCard from "@/components/MembershipCard";
import { requireSecretariat } from "@/lib/guard";
import { cardData, cardFilename, inlineCardSvg } from "@/lib/idcard";
import { Card, PageTitle } from "../ui";

export const metadata = { title: "ID card — MAP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * The same card as /portal/id-card, without making a coordinator leave the
 * dashboard to reach it.
 *
 * One renderer, one component, two entry points. The card here is not an
 * "admin card" — a coordinator is a member with a seat, and the only line that
 * differs on their card is the one naming the office.
 */
export default async function AdminIdCard() {
  /* Guarded like every other secretariat page. This one shows the reader their
     own card and leaks nothing scoped, so the check is about consistency rather
     than exposure — a page without the line is a page somebody has to stop and
     reason about, and that is the cost the guard exists to avoid. */
  const { member } = await requireSecretariat();
  if (!member) redirect("/login?next=/admin/id-card");

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  const data = await cardData(member.id, { origin: `${protocol}://${host}` });
  if (!data) redirect("/admin");

  return (
    <>
      <div className="no-print">
        <PageTitle
          title="ID card"
          lead="Your own membership card. Every member of the movement has one — this is the same page they see, reached without leaving the dashboard."
        />
      </div>

      <MembershipCard svg={inlineCardSvg(data)} filename={cardFilename(data, "png")} />

      <Card className="no-print mx-auto mt-10 max-w-2xl p-5">
        <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
          Checking somebody else&rsquo;s card
        </p>
        <p className="mt-2.5 text-[0.875rem] leading-relaxed text-content-muted">
          Scan the QR code on it. It opens the register filtered to that
          membership number, under your own scope — so it works for the members
          of your territory and refuses everybody else&rsquo;s, which is the same
          rule as every other page here. There is no endpoint that will render
          another member&rsquo;s card for you.
        </p>
        <Link
          href="/admin/members"
          className="mt-4 flex items-center gap-1.5 text-[0.6875rem] font-bold tracking-[0.08em] text-brand-700 uppercase hover:text-ember-600"
        >
          Search the register instead
          <ArrowRight size={13} strokeWidth={3} />
        </Link>
      </Card>
    </>
  );
}
