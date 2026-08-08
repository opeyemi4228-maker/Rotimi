"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  ChevronDown,
  Crown,
  IdCard,
  LayoutDashboard,
  LogOut,
} from "lucide-react";

import Avatar from "@/components/ui/Avatar";
import { clearViewerCache } from "@/lib/useViewer";
import { cn } from "@/lib/utils";

/**
 * The signed-in half of the masthead: the control that replaces "Join MAP"
 * once you already have.
 *
 * Everything in the panel is a link the member would otherwise have to
 * remember a URL for — their portal, the secretariat dashboard if they hold a
 * seat, and the way out.
 */
export default function AccountMenu({ member }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  /* Click-away and Escape. Both are how a menu is expected to close, and a
     dropdown that only closes by pressing its own button is a trap on a phone
     where "outside" is most of the screen. */
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) close();
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      close();
      buttonRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "group flex h-12 items-center gap-2.5 border-2 pr-3 pl-2 transition-colors duration-200",
          open
            ? "border-ink-950 bg-ink-950"
            : "border-hairline bg-transparent hover:border-ink-950"
        )}
      >
        <Avatar name={member.name} src={member.photoUrl} size="sm" ring={false} className="size-8" />

        {/* The name is hidden below lg — at masthead width it is the first
            thing that should give way, and the face already identifies the
            account. The button keeps its label for screen readers either way. */}
        <span className="hidden min-w-0 flex-col items-start leading-none lg:flex">
          <span className="sr-only">Your account, </span>
          <span
            className={cn(
              "max-w-32 truncate font-display text-[0.8125rem] font-extrabold tracking-tight transition-colors",
              open ? "text-white" : "text-ink-950"
            )}
          >
            {member.firstName}
          </span>
          <span
            className={cn(
              "mt-1 max-w-32 truncate text-[0.625rem] font-bold tracking-[0.1em] uppercase transition-colors",
              open ? "text-white/60" : "text-content-subtle"
            )}
          >
            {member.office ? "Secretariat" : "Member"}
          </span>
        </span>

        <ChevronDown
          size={15}
          strokeWidth={3}
          aria-hidden="true"
          className={cn(
            "shrink-0 transition-[transform,color] duration-300",
            open ? "rotate-180 text-white" : "text-ink-400 group-hover:text-ink-950"
          )}
        />
      </button>

      {/* Kept mounted and hidden rather than unmounted, so it can animate out
          as well as in. `invisible` also takes it out of the tab order, which
          `opacity-0` alone would not. */}
      <div
        role="menu"
        aria-label="Your account"
        className={cn(
          "absolute top-full right-0 z-50 mt-2 w-72 origin-top-right border-2 border-ink-950 bg-surface shadow-e4",
          "transition-[opacity,transform] duration-200 ease-out-quart",
          open
            ? "visible translate-y-0 scale-100 opacity-100"
            : "invisible pointer-events-none -translate-y-1 scale-95 opacity-0"
        )}
      >
        <div className="flex items-start gap-3 border-b-2 border-ink-950 bg-ink-50 p-4">
          <Avatar name={member.name} src={member.photoUrl} size="md" />
          <div className="min-w-0">
            <p className="truncate font-display text-[0.9375rem] font-extrabold tracking-tight text-ink-950">
              {member.name}
            </p>
            <p className="mt-1 truncate text-[0.75rem] tabular-nums text-content-muted">
              {member.membershipNo ?? "Number pending"}
            </p>
            {member.verified && (
              <p className="mt-2 inline-flex items-center gap-1.5 bg-brand-600 px-2 py-1 text-[0.5625rem] font-extrabold tracking-[0.1em] text-white uppercase">
                <BadgeCheck size={11} strokeWidth={3} aria-hidden="true" />
                Verified
              </p>
            )}
          </div>
        </div>

        {member.office && (
          <p className="flex items-start gap-2.5 border-b border-hairline px-4 py-3 text-[0.75rem] leading-snug text-content-muted">
            <Crown size={14} className="mt-0.5 shrink-0 text-ember-600" aria-hidden="true" />
            <span>
              <span className="font-bold text-ink-950">{member.office.title}</span>
              <br />
              {member.office.label}
            </span>
          </p>
        )}

        <div className="flex flex-col p-1.5">
          <Item href="/portal" icon={IdCard} onNavigate={close}>
            Your membership
          </Item>
          {member.office && (
            <Item href="/admin" icon={LayoutDashboard} onNavigate={close}>
              Secretariat dashboard
            </Item>
          )}
        </div>

        {/* A real form posting to the logout route, not a fetch: §5.4 asks for
            the site to work without JavaScript, and this is the control that
            most needs to. The handler only clears the cached copy of the
            viewer so the next page does not paint a stale name for a frame. */}
        <form
          action="/api/auth/logout"
          method="post"
          onSubmit={clearViewerCache}
          className="border-t border-hairline p-1.5"
        >
          <button
            type="submit"
            role="menuitem"
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[0.8125rem] font-semibold text-ink-700 transition-colors hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={15} strokeWidth={2.5} aria-hidden="true" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

function Item({ href, icon: Icon, children, onNavigate }) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="flex items-center gap-3 px-3 py-2.5 text-[0.8125rem] font-semibold text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
    >
      <Icon size={15} strokeWidth={2.5} aria-hidden="true" />
      {children}
    </Link>
  );
}
