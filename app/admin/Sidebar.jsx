"use client";

import Image from "next/image";
import Link from "next/link";
import { CircleHelp, Globe, LogOut, ShieldCheck, ArrowUpRight } from "lucide-react";

import { assets } from "@/assets/assets";
import SignOutForm from "@/components/SignOutForm";
import { AdminRail } from "./AdminNav";

/**
 * The dashboard rail: mark, territory, navigation, and the way out.
 *
 * White, like the rest of the product. The reference this layout was modelled
 * on uses a dark rail; the separation it buys is already done here by the 2px
 * rule down its edge, and a black column would be the only surface in the whole
 * system that is not paper.
 *
 * The scope chip at the top is not decoration. Administering the wrong
 * territory is the failure this whole area is built to prevent, and the two
 * facts that decide whether an action is legitimate — which office you hold and
 * which unit it governs — stay in the reader's eyeline for the entire session.
 *
 * It is a client component only because the navigation inside it reads the
 * current path. Everything the rail *says* is resolved on the server and handed
 * down, so nothing about a coordinator's authority is decided in the browser.
 */
export default function Sidebar({
  local,
  regional,
  nationwide,
  broadcaster,
  tierLabel,
  unitName,
  roleTitle,
  isSuperAdmin,
}) {
  return (
    <div className="flex h-full flex-col bg-white">
      <Link href="/" className="flex items-center gap-3 px-6 pt-7 pb-6">
        <Image src={assets.mapMark} alt="" sizes="40px" className="h-9 w-auto object-contain" />
        <span className="font-display text-base font-extrabold tracking-[-0.02em] text-ink-950">
          MAP
        </span>
        <span className="ml-auto text-[0.5625rem] font-bold tracking-[0.14em] text-ink-500 uppercase">
          Secretariat
        </span>
      </Link>

      {/* ── Where you stand ─────────────────────────────────────────────── */}
      <div className="mx-4 mb-5 border-2 border-ink-950 px-4 py-3.5">
        <p className="text-[0.5625rem] font-bold tracking-[0.18em] text-ink-500 uppercase">
          {tierLabel}
        </p>
        <p className="mt-1 truncate font-display text-[1.0625rem] font-extrabold tracking-tight text-ink-950">
          {unitName}
        </p>
        <p className="mt-1.5 truncate text-[0.75rem] text-content-muted">{roleTitle}</p>
        {isSuperAdmin && (
          <span className="mt-3 inline-flex items-center gap-1.5 bg-ember-500 px-2 py-1 text-[0.5625rem] font-extrabold tracking-widest text-white uppercase">
            <ShieldCheck size={10} strokeWidth={3} />
            Super Admin
          </span>
        )}
      </div>

      <div className="flex-1">
        <AdminRail
          local={local}
          regional={regional}
          nationwide={nationwide}
          broadcaster={broadcaster}
        />
      </div>

      <div className="mt-6 border-t border-ink-200 px-2 py-3">
        {/* The way back out. The mark at the top of the rail links home too,
            but a logo is not a signpost — somebody deep in the register looking
            for the public site should not have to guess that clicking the logo
            is how they leave. */}
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-2.5 text-[0.75rem] font-bold tracking-[0.06em] text-ink-500 uppercase transition-colors hover:text-ink-950"
        >
          <Globe size={16} strokeWidth={2.5} />
          Go to the website
        </Link>
        <Link
          href="/portal"
          className="flex items-center gap-3 px-4 py-2.5 text-[0.75rem] font-bold tracking-[0.06em] text-ink-500 uppercase transition-colors hover:text-ink-950"
        >
          <ArrowUpRight size={16} strokeWidth={2.5} />
          Your membership
        </Link>
        <Link
          href="/support"
          className="flex items-center gap-3 px-4 py-2.5 text-[0.75rem] font-bold tracking-[0.06em] text-ink-500 uppercase transition-colors hover:text-ink-950"
        >
          <CircleHelp size={16} strokeWidth={2.5} />
          Help
        </Link>
        <SignOutForm>
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-4 py-2.5 text-[0.75rem] font-bold tracking-[0.06em] text-ink-500 uppercase transition-colors hover:text-red-700"
          >
            <LogOut size={16} strokeWidth={2.5} />
            Sign out
          </button>
        </SignOutForm>
      </div>
    </div>
  );
}
