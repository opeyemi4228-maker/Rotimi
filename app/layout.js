import { Montserrat } from "next/font/google";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import ToasterWrapper from "@/components/ToasterWrapper";
import { site } from "@/lib/site";

/* Montserrat carries the entire system: headlines, UI and body.
   A single geometric sans across the whole site reads as one confident voice;
   its heavy weights give headlines the presence a campaign masthead needs,
   while 400/500 stay comfortable at paragraph size.

   Self-hosted by next/font, so there's no render-blocking request to
   fonts.googleapis.com (which the old build made on every page) and no layout
   shift when the face lands. */
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.movement} | Every Ward Matters`,
    template: `%s | ${site.acronym}`,
  },
  description:
    "The Movement for Amaechi Presidency (MAP) is a nationwide political movement organising in all 36 states, the Federal Capital Territory, 774 Local Government Areas and over 8,000 wards behind the presidential aspiration of Rt. Hon. Chibuike Rotimi Amaechi.",
  applicationName: site.movement,
  authors: [{ name: site.movement }],
  keywords: [
    "Movement for Amaechi Presidency",
    "MAP Nigeria",
    "MAP membership",
    "Amaechi 2027",
    "Rotimi Amaechi",
    "Chibuike Rotimi Amaechi",
    "Nigeria political movement",
    "ward congress Nigeria",
    "African Democratic Congress",
  ],
  openGraph: {
    title: site.movement,
    description:
      "A disciplined, verifiable national structure, built ward by ward, behind the presidential aspiration of Rt. Hon. Chibuike Rotimi Amaechi. Register in under two minutes.",
    type: "website",
    locale: "en_NG",
    url: site.url,
    siteName: site.movement,
  },
  twitter: {
    card: "summary_large_image",
    site: "@map9ja",
    title: site.movement,
    description:
      "Organising in all 36 states, the FCT, 774 LGAs and over 8,000 wards. Every ward matters. Join MAP.",
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#008751" },
    { media: "(prefers-color-scheme: dark)", color: "#00311a" },
  ],
  colorScheme: "light",
};

/* Structured data. The site's primary entity is the movement, so the graph
   leads with the Organization and carries Amaechi as the person it supports.
   Previously this declared a Person as the subject of the whole site, which
   told search engines this was a personal homepage rather than MAP's. */
const organisationSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${site.url}#organization`,
      name: site.movement,
      alternateName: site.acronym,
      description:
        "A nationwide political movement organising in all 36 states, the Federal Capital Territory, 774 Local Government Areas and over 8,000 wards.",
      url: site.url,
      areaServed: { "@type": "Country", name: "Nigeria" },
      sameAs: [
        "https://x.com/map9ja",
        "https://www.facebook.com/profile.php?id=61588365249213",
        "https://www.instagram.com/map.9ja",
      ],
    },
    {
      "@type": "Person",
      "@id": `${site.url}#aspirant`,
      name: "Chibuike Rotimi Amaechi",
      honorificPrefix: "Rt. Hon.",
      honorificSuffix: "CON",
      jobTitle:
        "Former Minister of Transportation, Federal Republic of Nigeria",
      nationality: "Nigerian",
      affiliation: { "@type": "Organization", name: site.party },
    },
    {
      "@type": "WebSite",
      "@id": `${site.url}#website`,
      url: site.url,
      name: site.movement,
      publisher: { "@id": `${site.url}#organization` },
      about: { "@id": `${site.url}#aspirant` },
      inLanguage: "en-NG",
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-NG" className={montserrat.variable}>
      <body suppressHydrationWarning className="antialiased">
        {/* First tab stop: lets keyboard users jump past the whole nav. */}
        <a href="#main" className="skip-link">
          Skip to main content
        </a>

        <ToasterWrapper />
        {/* Masthead and footer on the website; nothing but the app on /admin,
            which carries its own navigation. See components/SiteChrome.jsx. */}
        <SiteChrome>{children}</SiteChrome>

        <script
          type="application/ld+json"
          // Static object authored in this repo. No user input reaches this.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organisationSchema),
          }}
        />
      </body>
    </html>
  );
}
