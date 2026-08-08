"use client";

import React, { useState } from "react";
import { Send, ShieldAlert, CheckCircle, Building2, ArrowUpRight } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import BrandIcon from "@/components/ui/BrandIcon";
import { Section, SectionHeading } from "@/components/ui/Section";
import { socials } from "@/lib/site";
import { zones } from "@/lib/map";

/**
 * Set this to the Secretariat's enquiry endpoint (a Google Form action URL, a
 * form service, or an internal route) to make the form live. While it is
 * empty the form stays disabled and the page routes enquiries to the movement's
 * verified public channels instead, which is honest, where a form that
 * silently discards messages would not be.
 */
const CONTACT_ENDPOINT = "";

/* §4.7: enquiries route to different inboxes by category. */
const categories = [
  { value: "membership", label: "Membership", note: "Registration, verification, membership ID" },
  { value: "positions", label: "Positions", note: "Appointments, vacancies, the chain of authority" },
  { value: "media", label: "Media", note: "Press enquiries, interviews, media kit" },
  { value: "partnership", label: "Partnership", note: "Collaboration and stakeholder engagement" },
  { value: "complaint", label: "Complaint", note: "Conduct, disputes, corrections" },
];

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    state: "",
    category: "membership",
    message: "",
  });
  const [sent, setSent] = useState(false);

  const live = CONTACT_ENDPOINT.length > 0;

  const update = (event) =>
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));

  const onSubmit = (event) => {
    if (!live) {
      event.preventDefault();
      return;
    }
    setSent(true);
  };

  return (
    <>
      <PageHeader
        breadcrumb="Contact"
        kicker="Reach the Secretariat"
        title="Contact MAP"
        lead="Enquiries about membership, positions, media and partnership, routed to the directorate responsible."
      />

      <Section className="bg-white">
        <div className="grid gap-14 lg:grid-cols-[1fr_22rem] lg:gap-20">
          {/* ------------------------------------------------------- form */}
          <div className="min-w-0">
            <SectionHeading index={1} eyebrow="Send an enquiry" title="Tell us what you need" />

            {sent ? (
              <div className="mt-12 border-2 border-brand-600 p-8">
                <CheckCircle size={28} className="text-brand-600" aria-hidden="true" />
                <h3 className="mt-5 font-display text-xl font-extrabold tracking-tight text-ink-950">
                  Your message has been sent
                </h3>
                <p className="prose-body mt-3">
                  The relevant directorate will respond to the contact details you
                  provided.
                </p>
              </div>
            ) : (
              <form
                onSubmit={onSubmit}
                action={live ? CONTACT_ENDPOINT : undefined}
                method={live ? "POST" : undefined}
                className="mt-12 space-y-6"
              >
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field
                    id="name"
                    label="Full name"
                    required
                    value={form.name}
                    onChange={update}
                  />
                  <Field
                    id="phone"
                    label="Phone number"
                    type="tel"
                    required
                    value={form.phone}
                    onChange={update}
                  />
                  <Field
                    id="email"
                    label="Email address"
                    type="email"
                    value={form.email}
                    onChange={update}
                  />
                  <Field
                    id="state"
                    label="State"
                    value={form.state}
                    onChange={update}
                  />
                </div>

                <fieldset>
                  <legend className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                    What is this about?
                  </legend>
                  <div className="mt-4 grid gap-px bg-ink-200 sm:grid-cols-2">
                    {categories.map((category) => (
                      <label
                        key={category.value}
                        className="flex cursor-pointer items-start gap-3 bg-white p-4 transition-colors hover:bg-brand-50 has-checked:bg-brand-50"
                      >
                        <input
                          type="radio"
                          name="category"
                          value={category.value}
                          checked={form.category === category.value}
                          onChange={update}
                          className="mt-1 size-4 shrink-0 accent-brand-600"
                        />
                        <span className="min-w-0">
                          <span className="block font-display text-[0.9375rem] font-bold text-ink-950">
                            {category.label}
                          </span>
                          <span className="mt-0.5 block text-[0.8125rem] leading-snug text-content-subtle">
                            {category.note}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={form.message}
                    onChange={update}
                    className="mt-2.5 w-full resize-y border-2 border-ink-200 bg-white p-4 text-[0.9375rem] text-ink-950 transition-colors focus:border-brand-600 focus:outline-none"
                  />
                </div>

                {!live && (
                  <p className="flex items-start gap-3 border-l-4 border-ember-500 bg-ink-50 p-4 text-[0.875rem] leading-relaxed text-content-muted">
                    <ShieldAlert size={17} className="mt-0.5 shrink-0 text-ember-600" aria-hidden="true" />
                    <span>
                      The enquiry form is not yet connected to the Secretariat&rsquo;s
                      inbox. Until it is, please reach the movement through the
                      official channels listed on this page, because messages sent here
                      would not reach anyone.
                    </span>
                  </p>
                )}

                <Button type="submit" variant="primary" size="lg" disabled={!live}>
                  Send enquiry
                  <Send size={16} strokeWidth={2.75} />
                </Button>
              </form>
            )}
          </div>

          {/* ---------------------------------------------------- channels */}
          <aside className="min-w-0">
            <div className="border-t-2 border-ink-950 pt-7">
              <h2 className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                Official channels
              </h2>
              <ul className="mt-6 space-y-px">
                {socials.map((social) => (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-4 bg-ink-50 px-5 py-4 transition-colors duration-200 hover:bg-ink-950"
                    >
                      <BrandIcon
                        name={social.icon}
                        className="size-5 shrink-0 text-ink-950 transition-colors duration-200 group-hover:text-white"
                      />
                      <span className="min-w-0 flex-1 font-display text-[0.9375rem] font-bold text-ink-950 transition-colors duration-200 group-hover:text-white">
                        {social.label}
                      </span>
                      <ArrowUpRight
                        size={16}
                        strokeWidth={2.75}
                        aria-hidden="true"
                        className="shrink-0 text-ink-400 transition-colors duration-200 group-hover:text-ember-400"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Notice on impersonation. §4.7 requires it, and it is only
                meaningful if the list above is exhaustive and verified. */}
            <div className="mt-10 border-2 border-ember-500 p-6">
              <ShieldAlert size={22} className="text-ember-600" aria-hidden="true" />
              <h2 className="mt-4 font-display text-base font-extrabold tracking-tight text-ink-950">
                Beware of impersonation
              </h2>
              <p className="prose-body mt-3 text-[0.875rem]">
                The accounts listed above are the movement&rsquo;s only official
                channels. MAP does not ask members for money to register, to be
                appointed to any office, or to keep a position. Any account,
                page or individual demanding payment for membership or office is
                not acting for this movement. Report it through the Complaint
                category.
              </p>
            </div>

            <div className="mt-10 border-t-2 border-ink-950 pt-7">
              <h2 className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                National Secretariat
              </h2>
              <p className="prose-body mt-5 text-[0.875rem]">
                The Secretariat&rsquo;s address and office hours are published here
                once confirmed. Until then, use the official channels above.
              </p>
            </div>
          </aside>
        </div>
      </Section>

      {/* -------------------------------------------------- zonal offices */}
      <Section className="bg-ink-50">
        <SectionHeading
          index={2}
          eyebrow="Zonal offices"
          title="Six zones, six points of contact"
          lead="Each geopolitical zone is coordinated from its own office. Addresses and contacts are published as each zonal executive is confirmed."
        />

        <ul className="mt-14 grid gap-px bg-ink-200 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone, index) => (
            <Reveal as="li" key={zone.code} delay={index * 60} className="bg-white">
              <div className="h-full p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-lg font-extrabold tracking-tight text-ink-950">
                    {zone.name}
                  </h3>
                  <span className="font-mono text-[0.6875rem] tracking-wider text-ember-600">
                    {zone.code}
                  </span>
                </div>
                <p className="mt-3 text-[0.8125rem] leading-relaxed text-content-subtle">
                  {zone.states.join(" · ")}
                </p>
                <p className="mt-5 flex items-center gap-2 border-t border-ink-200 pt-4 text-[0.6875rem] font-bold tracking-[0.12em] text-ink-400 uppercase">
                  <Building2 size={14} aria-hidden="true" />
                  Office to be announced
                </p>
              </div>
            </Reveal>
          ))}
        </ul>
      </Section>
    </>
  );
}

/* Labelled inputs rather than placeholders alone: §5.3 requires real labels. */
function Field({ id, label, type = "text", required = false, value, onChange }) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="block text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase"
      >
        {label}
        {!required && (
          <span className="ml-1.5 font-sans text-[0.6875rem] tracking-normal text-ink-400 normal-case">
            (optional)
          </span>
        )}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        className="mt-2.5 h-12 w-full border-2 border-ink-200 bg-white px-4 text-[0.9375rem] text-ink-950 transition-colors focus:border-brand-600 focus:outline-none"
      />
    </div>
  );
}
