"use client";

import React, { useMemo, useState } from "react";
import { Calendar, MapPin, ArrowRight, CalendarPlus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { cn } from "@/lib/utils";
import { zones } from "@/lib/map";

/* §4.4: the activity taxonomy. These are the movement's own categories, so
   they are fixed here; the events themselves come from the Secretariat. */
const activityTypes = [
  "Rally",
  "Ward Congress",
  "Town Hall",
  "Mobilization Drive",
  "Voter Registration Drive",
  "Empowerment Programme",
  "Stakeholder Meeting",
  "Media Engagement",
];

/* No events are listed. The Secretariat has not supplied an activity record,
   and inventing rallies, with dates, venues and attendance figures, on a
   political movement's public site would be fabricating the very thing this
   page exists to evidence. The filters and empty states are real and wired;
   the moment activities are added to this array the page fills in. */
const activities = [];

export default function Activities() {
  const [tab, setTab] = useState("upcoming");
  const [zone, setZone] = useState("All zones");
  const [type, setType] = useState("All types");

  const visible = useMemo(
    () =>
      activities.filter(
        (activity) =>
          activity.tense === tab &&
          (zone === "All zones" || activity.zone === zone) &&
          (type === "All types" || activity.type === type)
      ),
    [tab, zone, type]
  );

  return (
    <>
      <PageHeader
        breadcrumb="Activities"
        kicker="What the movement is doing"
        title="Rallies, congresses and ward mobilisation"
        lead="MAP organises in public. Every congress, town hall and registration drive is listed here with its date, its venue and the officer who convened it."
      />

      <Section className="bg-white">
        <SectionHeading
          index={1}
          eyebrow="The calendar"
          title="Upcoming and past activities"
          actions={
            <Button href="/join" variant="outline" size="md">
              Join to RSVP
              <ArrowRight size={16} strokeWidth={2.75} />
            </Button>
          }
        />

        {/* ------------------------------------------------------- tabs */}
        <div
          role="tablist"
          aria-label="Activity timeframe"
          className="mt-12 flex border-b-2 border-ink-950"
        >
          {[
            { id: "upcoming", label: "Upcoming" },
            { id: "past", label: "Past" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls="activity-panel"
              onClick={() => setTab(item.id)}
              className={cn(
                "relative -mb-0.5 px-6 py-3.5 font-display text-[0.8125rem] font-bold tracking-[0.1em] uppercase transition-colors duration-200",
                tab === item.id
                  ? "text-ink-950"
                  : "text-content-subtle hover:text-brand-700"
              )}
            >
              {item.label}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-0 -bottom-0.5 h-1 origin-center bg-ember-500 transition-transform duration-300 ease-out-quart",
                  tab === item.id ? "scale-x-100" : "scale-x-0"
                )}
              />
            </button>
          ))}
        </div>

        {/* ---------------------------------------------------- filters */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="zone-filter"
              className="block text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase"
            >
              Zone
            </label>
            <select
              id="zone-filter"
              value={zone}
              onChange={(event) => setZone(event.target.value)}
              className="mt-2.5 h-12 w-full border-2 border-ink-200 bg-white px-4 font-display text-[0.875rem] font-bold text-ink-950 transition-colors focus:border-brand-600 focus:outline-none"
            >
              <option>All zones</option>
              {zones.map((item) => (
                <option key={item.code}>{item.name}</option>
              ))}
            </select>
          </div>

          <div className="min-w-0 flex-1">
            <label
              htmlFor="type-filter"
              className="block text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase"
            >
              Activity type
            </label>
            <select
              id="type-filter"
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="mt-2.5 h-12 w-full border-2 border-ink-200 bg-white px-4 font-display text-[0.875rem] font-bold text-ink-950 transition-colors focus:border-brand-600 focus:outline-none"
            >
              <option>All types</option>
              {activityTypes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ------------------------------------------------------ results */}
        <div
          id="activity-panel"
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          className="mt-10"
        >
          {visible.length > 0 ? (
            <ul className="grid gap-px bg-ink-200 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((activity) => (
                <li key={activity.slug} className="bg-white">
                  <article className="flex h-full flex-col p-6">
                    <span className="self-start bg-brand-50 px-2.5 py-1 text-[0.625rem] font-bold tracking-[0.1em] text-brand-700 uppercase">
                      {activity.type}
                    </span>
                    <h3 className="mt-4 font-display text-lg leading-snug font-extrabold tracking-tight text-ink-950">
                      {activity.title}
                    </h3>
                    <dl className="mt-4 space-y-2 text-[0.875rem] text-content-muted">
                      <div className="flex items-center gap-2.5">
                        <dt className="sr-only">Date</dt>
                        <Calendar size={15} aria-hidden="true" className="shrink-0 text-ink-400" />
                        <dd>{activity.date}</dd>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <dt className="sr-only">Venue</dt>
                        <MapPin size={15} aria-hidden="true" className="shrink-0 text-ink-400" />
                        <dd>
                          {activity.venue}, {activity.state}
                        </dd>
                      </div>
                    </dl>
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <div className="border-2 border-dashed border-ink-200 px-6 py-20 text-center">
              <CalendarPlus
                size={32}
                strokeWidth={1.5}
                aria-hidden="true"
                className="mx-auto text-ink-300"
              />
              <h3 className="mt-6 font-display text-lg font-extrabold tracking-tight text-ink-950">
                No {tab} activities listed yet
              </h3>
              <p className="prose-body mx-auto mt-3 max-w-md text-[0.9375rem]">
                {tab === "upcoming"
                  ? "Congresses, rallies and registration drives appear here as coordinators schedule them. Members are notified in advance and can RSVP."
                  : "Past activities are published with photographs and attendance figures once the organising officer files the report."}
              </p>
              <div className="mt-8">
                <Button href="/join" variant="primary" size="md">
                  Join to be notified
                  <ArrowRight size={16} strokeWidth={2.75} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ------------------------------------------------- how it works */}
      <Section className="bg-ink-50">
        <SectionHeading
          index={2}
          eyebrow="How activities are published"
          title="Convened locally, verified upward"
        />

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Convened by a coordinator",
              body: "Any officer at LGA level or above can schedule an activity, but only within the territory they are responsible for.",
            },
            {
              step: "02",
              title: "Approved before it appears",
              body: "Activities are published publicly once approved by the tier above, or by the Director of Media.",
            },
            {
              step: "03",
              title: "Reported afterwards",
              body: "Attendance, photographs and outcomes are filed against the activity, feeding the movement's mobilization reports.",
            },
          ].map((item, index) => (
            <Reveal key={item.step} delay={index * 80}>
              <div className="border-t-2 border-ink-950 pt-6">
                <span className="font-display text-fluid-2xl font-extrabold tracking-[-0.04em] text-ink-200 tabular-nums">
                  {item.step}
                </span>
                <h3 className="mt-4 font-display text-lg font-extrabold tracking-tight text-ink-950">
                  {item.title}
                </h3>
                <p className="prose-body mt-2.5 text-[0.9375rem]">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
