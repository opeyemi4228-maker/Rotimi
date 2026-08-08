import React from "react";
import { Images, Video, Upload, ArrowRight } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";

export const metadata = {
  title: "Gallery",
  description:
    "Photographs and video from MAP congresses, rallies and mobilisation drives across Nigeria.",
};

/* No albums are listed. §5.1 of the platform plan is explicit that this site
   uses real MAP event photography only: "no stock imagery of Nigerians,
   visitors detect it instantly and it damages credibility". Seeding this page
   with Unsplash crowds to make it look populated would break exactly the rule
   the gallery exists to honour. Albums appear as the Media directorate uploads
   and moderates them. */
const albums = [];

export default function Gallery() {
  return (
    <>
      <PageHeader
        breadcrumb="Gallery"
        kicker="The movement in the field"
        title="Photographs and video"
        lead="Congresses, rallies, ward mobilisation and empowerment programmes, organised by event and by state."
      />

      <Section className="bg-white">
        <SectionHeading
          index={1}
          eyebrow="Albums"
          title="Organised by event and state"
        />

        {albums.length > 0 ? (
          <ul className="mt-14 grid gap-px bg-ink-200 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => (
              <li key={album.slug} className="bg-white p-6">
                <h3 className="font-display text-lg font-extrabold tracking-tight text-ink-950">
                  {album.title}
                </h3>
                <p className="prose-body mt-2 text-[0.9375rem]">
                  {album.state} · {album.date} · {album.count} photographs
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-14 border-2 border-dashed border-ink-200 px-6 py-20 text-center">
            <Images
              size={32}
              strokeWidth={1.5}
              aria-hidden="true"
              className="mx-auto text-ink-300"
            />
            <h3 className="mt-6 font-display text-lg font-extrabold tracking-tight text-ink-950">
              The first albums are being prepared
            </h3>
            <p className="prose-body mx-auto mt-3 max-w-lg text-[0.9375rem]">
              This gallery carries photography from MAP&rsquo;s own events only:
              ward congresses, rallies and community engagements, credited to the
              photographer and filed by state. Nothing stock, nothing borrowed.
            </p>
            <div className="mt-8">
              <Button href="/activities" variant="primary" size="md">
                See what&rsquo;s scheduled
                <ArrowRight size={16} strokeWidth={2.75} />
              </Button>
            </div>
          </div>
        )}
      </Section>

      <Section className="bg-ink-50">
        <SectionHeading
          index={2}
          eyebrow="For coordinators"
          title="Submitting photographs from your event"
        />

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {[
            {
              icon: Upload,
              title: "Upload from your dashboard",
              body: "State and LGA coordinators upload event photography through the admin area, scoped to their own territory.",
            },
            {
              icon: Images,
              title: "Moderated before publication",
              body: "Every upload enters a queue reviewed by the Assistant Director of Media before it appears publicly.",
            },
            {
              icon: Video,
              title: "Video hosted externally",
              body: "Video is embedded from the movement's official channel and loads only on click, so the page stays light on mobile data.",
            },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={index * 80}>
                <div className="border-t-2 border-ink-950 pt-6">
                  <Icon
                    size={26}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="text-brand-600"
                  />
                  <h3 className="mt-5 font-display text-lg font-extrabold tracking-tight text-ink-950">
                    {item.title}
                  </h3>
                  <p className="prose-body mt-2.5 text-[0.9375rem]">{item.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>
    </>
  );
}
