"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { footerColumns, socials, site } from "@/lib/site";
import { assets } from "@/assets/assets";
import BrandIcon from "@/components/ui/BrandIcon";

function SocialLink({ label, href, icon }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="grid size-11 place-items-center border border-white/15 bg-white/5 text-white/80 transition-[transform,color,background-color,border-color] duration-300 ease-out-quart hover:border-ember-400/60 hover:bg-ember-500 hover:text-ink-950 motion-safe:hover:-translate-y-0.5"
    >
      <BrandIcon name={icon} className="size-[18px]" />
    </a>
  );
}

export default function Footer() {
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState("idle");

  /* The old handler console.logged and fired a blocking window.alert(), which
     is unstyled, unskippable and announces poorly to assistive tech. */
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (status === "loading") return;

    setStatus("loading");
    try {
      // TODO: point at the real subscription endpoint once it exists.
      await new Promise((resolve) => setTimeout(resolve, 700));
      toast.success("You're on the list. Look out for updates from the movement.");
      setEmail("");
      setRegion("");
    } catch {
      toast.error("That didn't go through. Please try again.");
    } finally {
      setStatus("idle");
    }
  };

  const year = new Date().getFullYear();

  return (
    /* Flat black plate. Colour comes from the flag rule and the ember CTA,
       not from ambient gradient washes. */
    <footer className="relative bg-ink-950 text-white">
      {/* Flag-derived top rule: green, white, green. */}
      <div aria-hidden="true" className="flex h-2">
        <span className="flex-1 bg-brand-600" />
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-brand-600" />
      </div>

      <div className="shell relative py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Brand + newsletter */}
          <div className="lg:col-span-5">
            <Link href="/" className="group inline-flex items-center gap-3.5">
              <Image
                src={assets.mapMark}
                alt=""
                sizes="96px"
                className="h-12 w-auto shrink-0 object-contain transition-transform duration-300 group-hover:-translate-y-0.5"
              />
              <span aria-hidden="true" className="h-10 w-px bg-white/15" />
              {/* The mark already sets "MAP"; the type expands it rather than
                  repeating it. Matches the masthead lockup. */}
              <span className="flex flex-col justify-center leading-none">
                <span className="font-display text-[0.5625rem] font-bold tracking-[0.26em] text-white/55 uppercase">
                  Movement for
                </span>
                <span className="font-display mt-1.5 text-xl font-extrabold tracking-[-0.015em] uppercase">
                  Amaechi Presidency
                </span>
              </span>
            </Link>

            <p className="mt-6 max-w-md text-[1.0625rem] leading-relaxed text-white/70">
              A platform for leadership, public service and national development,
              built on a record of infrastructure delivered, institutions
              strengthened and people invested in.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 max-w-md">
              <h2 className="font-display text-sm font-bold tracking-[0.16em] text-white uppercase">
                Stay connected
              </h2>

              <div className="mt-4 flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <label htmlFor="footer-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="footer-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email address"
                    className="min-w-0 flex-1 border border-white/20 bg-white/5 px-4 py-3.5 text-sm text-white transition-colors duration-200 placeholder:text-white/45 focus:border-ember-400 focus:bg-white/10"
                  />
                  <label htmlFor="footer-region" className="sr-only">
                    Your city or state
                  </label>
                  <input
                    id="footer-region"
                    type="text"
                    required
                    autoComplete="address-level1"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="City / State"
                    className="border border-white/20 bg-white/5 px-4 py-3.5 text-sm text-white transition-colors duration-200 placeholder:text-white/45 focus:border-ember-400 focus:bg-white/10 sm:w-36"
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className={cn(
                    "group inline-flex items-center justify-center gap-2.5 bg-ember-500 px-6 py-3.5",
                    "font-display text-sm font-extrabold tracking-[0.12em] text-ink-950 uppercase",
                    "transition-[transform,background-color] duration-300 ease-out-quart",
                    "hover:bg-ember-400 motion-safe:hover:-translate-y-0.5",
                    "disabled:pointer-events-none disabled:opacity-60"
                  )}
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Signing you up
                    </>
                  ) : (
                    <>
                      Keep me updated
                      <ArrowRight
                        size={17}
                        strokeWidth={2.75}
                        className="transition-transform duration-300 group-hover:translate-x-0.5"
                      />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Sitemap */}
          <nav
            aria-label="Footer"
            /* Four columns now, not two (§3.2), so the sitemap takes the whole
               right half and the Follow block moves under the signup rather
               than being squeezed into a 2-of-12 gutter. */
            className="grid gap-10 sm:grid-cols-2 lg:col-span-7 lg:col-start-6 lg:grid-cols-4 lg:gap-8"
          >
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h2 className="font-display text-sm font-bold tracking-[0.16em] text-white uppercase">
                  {column.title}
                </h2>
                <ul className="mt-5 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-[0.9375rem] text-white/65 transition-colors duration-200 hover:text-ember-400"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="inline-block text-[0.9375rem] text-white/65 transition-colors duration-200 hover:text-ember-400"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* Socials. Sits under the signup, in the left column. */}
          <div className="lg:col-span-5 lg:col-start-1">
            <h2 className="font-display text-sm font-bold tracking-[0.16em] text-white uppercase">
              Follow
            </h2>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {socials.map((social) => (
                <SocialLink key={social.label} {...social} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-14 h-px bg-white/12" />

        {/* The copyright is a statement, not a link. It used to sit inside the
            same flex row as the legal links, where it wrapped onto their line
            and read as a fourth destination. It gets its own line now, and the
            links get a labelled <nav>. */}
        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <p className="max-w-xl text-[0.8125rem] leading-relaxed text-white/60">
            The Movement for Amaechi Presidency is a membership movement
            organising in all 36 states, the Federal Capital Territory, 774 Local
            Government Areas and over 8,000 wards. Membership is free. MAP never
            asks for payment to register, to be appointed to any office, or to
            keep one.
          </p>

          <div className="flex flex-col gap-4 lg:items-end">
            <nav
              aria-label="Legal and press"
              className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.8125rem] text-white/60"
            >
              <Link href="/privacy" className="transition-colors hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/terms" className="transition-colors hover:text-white">
                Terms of Use
              </Link>
              <Link href="/news" className="transition-colors hover:text-white">
                Media &amp; Press
              </Link>
              <Link href="/contact" className="transition-colors hover:text-white">
                Contact
              </Link>
            </nav>

            <p className="text-[0.8125rem] text-white/45 lg:text-right">
              © {year} {site.movement}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
