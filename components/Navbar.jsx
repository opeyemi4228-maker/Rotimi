"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Menu,
  X,
  ArrowUpRight,
  ArrowRight,
  LogIn,
  IdCard,
  LayoutDashboard,
  LogOut,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { navigation, primaryCta, secondaryCta, site } from "@/lib/site";
import { assets } from "@/assets/assets";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import AccountMenu from "@/components/AccountMenu";
import { clearViewerCache, useViewer } from "@/lib/useViewer";

/**
 * The type half of the lockup: what the mark beside it does not already say.
 *
 * The mark renders "MAP" in letterforms, so setting MAP again in type was the
 * same word twice, side by side. The type expands the acronym instead (the
 * WWF/NASA convention): a small tracked kicker over the movement's name, with
 * the name as the dominant line so the hierarchy runs mark → name → kicker
 * rather than a 31-character descriptor dwarfing a three-letter word.
 *
 * Hidden below sm, where the mark stands alone: at 360px the mark, the name and
 * the menu button cannot all fit, and a logo is precisely the thing that is
 * meant to carry the identity on its own.
 */
function Wordmark({ compact = false }) {
  return (
    <span className="hidden min-w-0 flex-col justify-center leading-none sm:flex">
      <span
        className={cn(
          "font-display truncate font-bold text-content-subtle uppercase transition-all duration-300",
          compact
            ? "text-[0.5rem] tracking-[0.22em]"
            : "text-[0.5625rem] tracking-[0.26em]"
        )}
      >
        Movement for
      </span>
      {/* truncate, not whitespace-nowrap: this is the longest run in the lockup,
          and nowrap alone just lets it spill under the menu button on a narrow
          tablet rather than clipping cleanly. */}
      <span
        className={cn(
          "font-display truncate font-extrabold tracking-[-0.015em] text-content uppercase transition-all duration-300",
          compact ? "mt-1 text-[0.9375rem]" : "mt-1.5 text-[1.0625rem] lg:text-xl"
        )}
      >
        Amaechi Presidency
      </span>
    </span>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  /* Who, if anyone, is signed in. Fetched once per tab and cached, so the
     masthead is not the last thing on the site still calling a member a
     stranger. See lib/useViewer.js for why it is not read in the layout. */
  const { status, member } = useViewer();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const navRef = useRef(null);
  const panelRef = useRef(null);
  const toggleRef = useRef(null);

  /* Condense the bar after the first scroll, and retract it on the way down so
     the masthead isn't permanently eating 5rem of a phone screen, and scrolling
     back up brings it straight down again. rAF-throttled so the handler never
     runs more than once per frame. */
  useEffect(() => {
    lastY.current = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        // Clamp: iOS rubber-banding reports negative and past-the-end values,
        // which would otherwise read as a direction change at both extremes.
        const y = Math.max(window.scrollY, 0);

        /* Hysteresis, not a single threshold. Condensing the masthead removes
           ~24px from the document, and on a page whose content only just
           overflows, that can pull scrollY back under the threshold — which
           expands the masthead, which makes the page scrollable again, which
           condenses it. The bar strobes and the whole page shakes. Condense at
           24px, expand again only below 4px, and the two states can no longer
           trigger each other. */
        setScrolled((was) => (was ? y > 4 : y > 24));

        /* A 6px deadband. Without it, the sub-pixel jitter of momentum
           scrolling flips the direction every few frames and the bar strobes. */
        if (Math.abs(y - lastY.current) > 6) {
          // Never retract over the hero: there is nothing to reclaim yet.
          setHidden(y > lastY.current && y > 160);
          lastY.current = y;
        }
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Publish the pinned masthead height so page-level sticky bars (the newsroom
     filter rail) can sit directly beneath it instead of being buried under it.
     Measured rather than hard-coded, so it stays correct through the h-25 →
     h-19 condense, and drops to 0 while the masthead is retracted so those
     bars rise to meet the viewport edge rather than leaving a floating gap. */
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const write = () =>
      document.documentElement.style.setProperty(
        "--masthead-offset",
        `${hidden && !open ? 0 : el.offsetHeight}px`
      );

    write();
    // Fires throughout the height transition, so the offset tracks it live.
    const observer = new ResizeObserver(write);
    observer.observe(el);
    return () => observer.disconnect();
  }, [hidden, open]);

  // Route change closes the drawer.
  /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The router is the external system being synchronised here, which is what
       an effect is for. Deriving it would mean threading a second "open on this
       path" value through the ten places that read `open`, to save one render
       pass on a navigation that is already rendering a new page. */
  useEffect(() => setOpen(false), [pathname]);

  const close = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);

  /* Drawer behaviour: lock the background, trap Tab inside the panel, and
     close on Escape. Without the trap, tabbing walks invisibly through the
     page behind the overlay. */
  useEffect(() => {
    if (!open) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    // Compensate for the removed scrollbar so the page doesn't jump sideways.
    if (scrollbarGap > 0) body.style.paddingRight = `${scrollbarGap}px`;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;

      const focusables = panelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables?.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    // Move focus into the panel so the next Tab starts in the right place.
    panelRef.current?.querySelector("a, button")?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = "";
    };
  }, [open, close]);

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* `sticky` lives on the <header>, not on the <nav> inside it. A sticky
          box can only travel within its containing block, and the nav's
          containing block *was* the header, whose bottom edge is the nav's own
          bottom edge. That gave it exactly zero travel, so the "sticky" bar
          scrolled off with the page and never came back. */}
      <header
        className={cn(
          "sticky top-0 z-50 transition-transform duration-300 ease-out-quart",
          hidden && !open ? "-translate-y-full" : "translate-y-0"
        )}
      >
        {/* ---------------------------------------------------------------
            Tier 1, the utility bar. Collapses to nothing on the first scroll,
            handing the viewport back to the content while the masthead below
            stays pinned. Height, not display, so it animates.
        ---------------------------------------------------------------- */}
        <div
          className={cn(
            "overflow-hidden bg-linear-to-r from-brand-900 via-brand-800 to-brand-900 text-white transition-[height] duration-300 ease-out-quart",
            scrolled ? "h-0" : "h-10"
          )}
          /* `inert`, not `aria-hidden`: the bar holds a link, and aria-hidden
             alone would leave it in the tab order, so keyboard focus would land
             on a zero-height element nobody can see. */
          inert={scrolled}
        >
          <div className="shell shell-wide flex h-10 items-center justify-between gap-4 text-[0.6875rem]">
            <p className="flex min-w-0 items-center gap-2.5 font-semibold tracking-[0.16em] uppercase">
              {/* Pulse ring reads as "live campaign", not as a stray dot. */}
              <span className="relative flex size-1.5 shrink-0">
                <span className="absolute inline-flex size-full rounded-full bg-ember-400 opacity-70 motion-safe:animate-ping" />
                <span className="relative inline-flex size-1.5 rounded-full bg-ember-400" />
              </span>
              <span className="truncate">
                <span className="hidden sm:inline">Powered by the </span>
                {site.movement}
              </span>
            </p>

            <div className="hidden shrink-0 items-center gap-5 lg:flex">
              <a
                href={secondaryCta.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 font-semibold tracking-[0.14em] whitespace-nowrap text-white/70 uppercase transition-colors duration-200 hover:text-ember-300"
              >
                {secondaryCta.label}
                <ArrowUpRight
                  size={12}
                  strokeWidth={3}
                  className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </a>
              <span aria-hidden="true" className="h-3 w-px bg-white/20" />
              <span className="font-display font-extrabold tracking-[0.3em] text-ember-400">
                2027
              </span>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------
            Tier 2, the masthead. Opaque at every scroll position: the old
            `bg-surface/85 + backdrop-blur` let the page bleed through, so
            headlines and photographs smeared under the wordmark instead of
            reading as a solid bar.
        ---------------------------------------------------------------- */}
        <nav
          ref={navRef}
          aria-label="Primary"
          className={cn(
            "bg-surface transition-shadow duration-300",
            scrolled ? "shadow-e3" : "shadow-none"
          )}
        >
          <div
            className={cn(
              "shell shell-wide flex items-center justify-between gap-3 transition-[height] duration-300 sm:gap-6",
              scrolled ? "h-19" : "h-20 lg:h-25"
            )}
          >
            {/* Mark + wordmark. min-w-0 so the lockup is what gives way on a
                narrow screen. Without it the flex row refuses to shrink and
                pushes the menu button off the right edge below ~340px. */}
            <Link
              href="/"
              aria-label={`${site.name} home`}
              className="group flex min-w-0 items-center gap-2.5 sm:gap-3.5"
            >
              {/* The symbol only. The master artwork also carries the movement's
                  name under the mark, but at masthead size that text renders
                  about 4px tall, so the name is set in type beside it instead,
                  where it stays legible and selectable. */}
              <Image
                src={assets.mapMark}
                alt=""
                priority
                sizes="80px"
                className={cn(
                  /* Larger below sm, where it carries the identity alone. */
                  "w-auto shrink-0 object-contain transition-[height,transform] duration-300 group-hover:-translate-y-0.5",
                  scrolled ? "h-10 sm:h-9" : "h-11 sm:h-10 lg:h-12"
                )}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "hidden w-px self-stretch bg-hairline transition-all duration-300 sm:block",
                  scrolled ? "my-3.5" : "my-4"
                )}
              />
              <Wordmark compact={scrolled} />
            </Link>

            {/* Links. Six labels this long genuinely need xl to sit on one
                row; below that they live in the drawer. */}
            <ul className="hidden items-center gap-0.5 xl:flex">
              {navigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center px-3.5 py-2.5",
                        "font-display text-[0.75rem] font-bold tracking-[0.11em] whitespace-nowrap uppercase",
                        "transition-colors duration-200",
                        active
                          ? "text-brand-700"
                          : "text-content-muted hover:text-brand-700"
                      )}
                    >
                      {/* Soft hover plate, behind the label */}
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 scale-95 bg-brand-50 opacity-0 transition-[opacity,transform] duration-300 ease-out-quart group-hover:scale-100 group-hover:opacity-100"
                      />
                      {item.label}
                      {/* Active rule, scaled from the centre so moving between
                          links reads as one object sliding, not two fading. */}
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute inset-x-3.5 bottom-1 h-0.75 origin-center rounded-full bg-ember-500 transition-transform duration-300 ease-out-quart",
                          active ? "scale-x-100" : "scale-x-0"
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Primary action. Shown from md, not xl: the whole tablet range
                had a masthead with no call to action in it at all, which is
                the one control this bar exists to carry.

                What that action *is* depends on who is reading. Asking a
                signed-in member to "Join MAP" is the site failing to recognise
                somebody who has already done the thing being asked of them —
                so once they are known, the slot becomes their account. */}
            <div className="hidden shrink-0 items-center gap-2 md:flex">
              {status === "loading" ? (
                /* A placeholder the exact size of both possible outcomes.
                   Reserving the space is what stops the masthead lurching
                   sideways when the answer lands a moment later. */
                <span
                  aria-hidden="true"
                  className="h-12 w-36 animate-pulse bg-ink-100"
                />
              ) : member ? (
                <AccountMenu member={member} />
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden items-center gap-1.5 px-3 py-2.5 font-display text-[0.75rem] font-bold tracking-[0.11em] whitespace-nowrap text-content-muted uppercase transition-colors duration-200 hover:text-brand-700 lg:inline-flex"
                  >
                    <LogIn size={14} strokeWidth={2.75} aria-hidden="true" />
                    Sign in
                  </Link>
                  <Button href={primaryCta.href} variant="primary" size="md">
                    {primaryCta.label}
                    <ArrowRight
                      size={16}
                      strokeWidth={2.75}
                      className="transition-transform duration-300 group-hover:translate-x-0.5"
                    />
                  </Button>
                </>
              )}
            </div>

            {/* Mobile trigger */}
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              className="grid size-11 shrink-0 place-items-center border border-hairline text-content transition-colors duration-200 hover:border-brand-600 hover:bg-brand-50 hover:text-brand-700 xl:hidden"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {/* Tier 3, the flag hairline. Anchors the masthead without a grey border. */}
          <div aria-hidden="true" className="flex h-0.75">
            <span className="flex-1 bg-brand-600" />
            <span className="w-16 bg-gold-500" />
            <span className="flex-1 bg-brand-600" />
          </div>
        </nav>
      </header>

      {/* ---------------------------------------------------------------
          Mobile drawer, a sibling of <header> rather than a child of it.

          The header now carries a transform (the scroll retraction), and a
          transformed element becomes the containing block for its `fixed`
          descendants. Left inside, the overlay would have been positioned
          against the ~6rem masthead box instead of the viewport, and would
          have slid off-screen with it.

          z-60 also puts it above the z-50 header, which previously painted
          over the top of the panel and buried its own close button.
      ---------------------------------------------------------------- */}
      {/* `overflow-hidden` is what actually kills the horizontal scrollbar.
          The panel is parked at translate-x-full, and a *fixed* element is not
          clipped by the body's overflow-x, so the panel outside the viewport was adding
          real scroll width to every page on mobile. `invisible` alone does not
          help: visibility:hidden still occupies layout and still counts toward
          scrollWidth. This box is exactly viewport-sized, so clipping it hides
          the parked panel without constraining the open one. */}
      <div
        className={cn(
          "fixed inset-0 z-60 overflow-hidden xl:hidden",
          open ? "visible pointer-events-auto" : "invisible pointer-events-none"
        )}
        aria-hidden={!open}
      >
        <div
          onClick={close}
          className={cn(
            "absolute inset-0 bg-ink-950/50 backdrop-blur-sm transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0"
          )}
        />

        <div
          id="mobile-nav"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className={cn(
            "absolute inset-y-0 right-0 flex w-[min(24rem,88vw)] flex-col overflow-y-auto overscroll-contain bg-surface shadow-e4",
            "transition-transform duration-420 ease-out-quart",
            open ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4">
            <div className="flex items-center gap-3">
              <Image
                src={assets.mapMark}
                alt=""
                sizes="64px"
                className="h-8 w-auto object-contain"
              />
              <Wordmark compact />
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close menu"
              className="grid size-10 shrink-0 place-items-center border border-hairline text-content transition-colors hover:border-brand-600 hover:text-brand-700"
            >
              <X size={20} />
            </button>
          </div>

          {/* Signed in, on a phone: say so at the top of the drawer, where the
              member can see it without scrolling past seven links first. */}
          {member && (
            <div className="border-b border-hairline bg-ink-50 px-5 py-4">
              <div className="flex items-center gap-3.5">
                <Avatar name={member.name} src={member.photoUrl} size="md" />
                <div className="min-w-0">
                  <p className="truncate font-display text-[0.9375rem] font-extrabold tracking-tight text-ink-950">
                    {member.name}
                  </p>
                  <p className="mt-0.5 truncate text-[0.75rem] tabular-nums text-content-muted">
                    {member.membershipNo ?? "Number pending"}
                  </p>
                </div>
              </div>
              {member.office && (
                <p className="mt-3 flex items-start gap-2 text-[0.75rem] leading-snug text-content-muted">
                  <Crown size={13} className="mt-0.5 shrink-0 text-ember-600" aria-hidden="true" />
                  <span>
                    <span className="font-bold text-ink-950">{member.office.title}</span>
                    {" — "}
                    {member.office.label}
                  </span>
                </p>
              )}
            </div>
          )}

          <ul className="flex flex-col px-3 py-4">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block px-4 py-3.5 transition-colors duration-200",
                      active
                        ? "bg-brand-50 text-brand-700"
                        : "hover:bg-ink-100"
                    )}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-display text-base font-bold tracking-tight">
                        {item.label}
                      </span>
                      <span
                        className={cn(
                          "h-0.75 w-5 shrink-0 rounded-full bg-ember-500 transition-opacity",
                          active ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </span>
                    {item.description && (
                      <span className="mt-1 block text-[0.8125rem] leading-snug text-content-subtle">
                        {item.description}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Safe-area padding: on a notched phone the home indicator sits over
              the last 34px, right on top of the primary action. */}
          <div className="mt-auto flex flex-col gap-3 border-t border-hairline p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {member ? (
              <>
                <Button href="/portal" variant="primary" size="lg" full>
                  <IdCard size={17} strokeWidth={2.75} />
                  Your membership
                </Button>
                {member.office && (
                  <Button href="/admin" variant="outline" size="lg" full>
                    <LayoutDashboard size={17} strokeWidth={2.75} />
                    Secretariat
                  </Button>
                )}
                {/* A form, so signing out survives JavaScript being off (§5.4). */}
                <form action="/api/auth/logout" method="post" onSubmit={clearViewerCache}>
                  <Button type="submit" variant="ghost" size="lg" full>
                    <LogOut size={16} strokeWidth={2.75} />
                    Sign out
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Button href={primaryCta.href} variant="primary" size="lg" full>
                  {primaryCta.label}
                  <ArrowRight size={17} strokeWidth={2.75} />
                </Button>
                <Button href="/login" variant="outline" size="lg" full>
                  <LogIn size={17} strokeWidth={2.75} />
                  Sign in
                </Button>
                <Button href={secondaryCta.href} variant="outline" size="lg" full>
                  {secondaryCta.label}
                  <ArrowUpRight size={17} strokeWidth={2.75} />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
