/**
 * Single source of truth for site chrome.
 *
 * Nav links used to be written inline in both Navbar and Footer as relative
 * hrefs (`href="governance"`), which resolve against the *current* path and so
 * broke on any nested route. Everything is rooted here instead.
 */

/**
 * The site belongs to the movement, not to the aspirant.
 *
 * `name` is MAP. It is what the masthead, the page titles and the structured
 * data identify. Amaechi is the person the movement exists to support, carried
 * separately as `aspirant` so the two are never conflated in copy.
 */
export const site = {
  name: "Movement for Amaechi Presidency",
  shortName: "MAP",
  acronym: "MAP",
  tagline: "Every ward matters.",
  movement: "Movement for Amaechi Presidency (MAP)",
  aspirant: "Rt. Hon. Chibuike Rotimi Amaechi",
  aspirantShort: "Rotimi Amaechi",
  aspirantHonorific: "CON • KSJ",
  party: "African Democratic Congress",
  url: "https://amaechi.ng",
};

/**
 * Primary navigation: the seven items of the platform plan §3.1, plus the
 * Join action carried separately as `primaryCta`.
 *
 * Deliberately short: long navigation bars collapse badly on the small Android
 * screens most visitors arrive on. Amaechi's own record pages (The Journey,
 * Plan for Change, Leadership) sit under About rather than competing with the
 * movement's structure for space in the bar.
 */
export const navigation = [
  { label: "Home", href: "/" },
  {
    label: "About",
    href: "/about",
    description: "The movement, the mission, and the man.",
  },
  {
    label: "Structure",
    href: "/structure",
    description: "How MAP is organised, and who coordinates your area.",
  },
  {
    label: "Activities",
    href: "/activities",
    description: "Rallies, congresses, town halls and mobilisation drives.",
  },
  {
    label: "Gallery",
    href: "/gallery",
    description: "Photographs from the field.",
  },
  {
    label: "Videos",
    href: "/videos",
    description: "Speeches, rallies and footage, in his own words.",
  },
  {
    label: "News",
    href: "/news",
    description: "Statements, press releases and coverage.",
  },
  {
    label: "Contact",
    href: "/contact",
    description: "Reach the Secretariat and your zonal office.",
  },
];

export const primaryCta = {
  label: "Join MAP",
  href: "/join",
};

export const secondaryCta = {
  label: "ADC Registration",
  href: "https://adc.org.ng/membership",
  external: true,
};

export const supportCta = {
  label: "Support",
  href: "/support",
};

/** §3.2: four columns, being the movement, taking part, media and reaching us. */
export const footerColumns = [
  {
    title: "The Movement",
    links: [
      { label: "About MAP", href: "/about" },
      { label: "Structure", href: "/structure" },
      { label: "Who is Amaechi?", href: "/about/amaechi" },
      { label: "Plan for Change", href: "/planforchange" },
    ],
  },
  {
    title: "Get Involved",
    links: [
      { label: "Join MAP", href: "/join" },
      { label: "Find Your Coordinator", href: "/structure#find" },
      { label: "Activities", href: "/activities" },
      { label: "Support the Campaign", href: "/support" },
      {
        label: "ADC Party Registration",
        href: "https://adc.org.ng/membership",
        external: true,
      },
    ],
  },
  {
    title: "Media",
    links: [
      { label: "Newsroom", href: "/news" },
      { label: "Gallery", href: "/gallery" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "Contact the Secretariat", href: "/contact" },
      { label: "Find Your Chapter", href: "/connect" },
      { label: "Zonal Offices", href: "/contact#zonal" },
    ],
  },
];

export const socials = [
  { label: "X", href: "https://x.com/map9ja?s=11", icon: "x" },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@map.9ja?_r=1&_t=ZS-94FStXknDvN",
    icon: "tiktok",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61588365249213",
    icon: "facebook",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/map.9ja?igsh=MTViMGhkOXlla2w4YQ==",
    icon: "instagram",
  },
];

/** Headline record figures, reused by the hero, banner and stat rails. */
export const record = [
  { value: 1763, suffix: "+", unit: "KM", label: "Standard gauge rail delivered" },
  { value: 32, suffix: "", unit: "", label: "Modern train stations built" },
  { value: 11300, suffix: "+", unit: "", label: "Jobs created" },
  { value: 30, suffix: "+", unit: "YRS", label: "In public service" },
];
