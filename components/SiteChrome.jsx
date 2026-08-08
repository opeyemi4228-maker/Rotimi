"use client";

import { usePathname } from "next/navigation";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SupportRail from "@/components/SupportRail";

/**
 * The public site's masthead, footer and support rail — everywhere except the
 * secretariat.
 *
 * /admin is an application, not a page of the website. It has its own rail
 * carrying its own navigation, and the two sets of navigation stacked on top of
 * each other left a coordinator with a campaign masthead, a dashboard rail, a
 * footer of marketing links and a floating support button, all competing for a
 * screen they are trying to read a coverage table on.
 *
 * The exclusion is by path rather than by route group so that the public routes
 * did not all have to move into a `(site)` directory to get one screen out of
 * the chrome. The trade is that this component is a client component and reads
 * the path — cheap, and it renders nothing at all on the route it excludes.
 */
export default function SiteChrome({ children }) {
  const pathname = usePathname();
  const bare = pathname.startsWith("/admin");

  if (bare) return <main id="main">{children}</main>;

  return (
    <>
      <Navbar />
      {/* No padding offset needed: the nav is sticky, not fixed, so it
          occupies real space in the document flow. */}
      <main id="main">{children}</main>
      <Footer />
      <SupportRail />
    </>
  );
}
