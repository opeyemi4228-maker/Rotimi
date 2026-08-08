/**
 * The aspirant's record.
 *
 * Kept out of the movement's own data (`map.js`) and out of the homepage, which
 * is MAP's. This is what the "Who is Amaechi" page is built from: one place,
 * so the same figures cannot drift between the hero, the profile and the plan.
 *
 * Everything here is public record from his time in office.
 */

import { assets } from "@/assets/assets";

/** The three-paragraph answer to the page's own question. */
export const bio = [
  "Rt. Hon. Chibuike Rotimi Amaechi is a Nigerian politician whose public career spans three decades, from a special assistant in Rivers State in 1992, to Speaker of its House of Assembly, to eight years as its Governor, to seven years as Federal Minister of Transportation.",
  "As Minister from 2015 to 2022 he led the most ambitious railway programme in Nigeria's modern history: 1,763km of standard gauge rail delivered, 32 stations built, and the Lekki and Bonny deep seaport projects begun. The rail projects alone created more than 11,300 direct jobs.",
  "He is the presidential aspirant the Movement for Amaechi Presidency was formed to support, standing on the platform of the African Democratic Congress.",
];

/** The four figures that carry the record. Nothing else belongs in this list. */
export const record = [
  { value: 1763, suffix: "", unit: "KM", label: "Standard gauge rail delivered" },
  { value: 32, suffix: "", unit: "", label: "Modern train stations built" },
  { value: 11300, suffix: "+", unit: "", label: "Direct jobs created" },
  { value: 30, suffix: "+", unit: "YRS", label: "In public service" },
];

/**
 * Named projects delivered as Minister of Transportation.
 *
 * Preserved from the homepage carousel that used to run twelve of these as
 * image cards. Kept as data, not rendered in full anywhere. The profile page
 * carries the four figures and the offices, which is the amount a reader
 * actually absorbs. Use this list if a dedicated record page is ever wanted.
 *
 * Note: the original cards pulled most of their imagery from Unsplash, which
 * §5.1 of the platform plan rules out. Any future rendering of this list needs
 * real project photography, so no image field is carried over.
 */
export const projects = [
  { category: "Rail", title: "326KM Warri to Itakpe standard gauge line", impact: "Connecting the South South to the national grid" },
  { category: "Rail", title: "157KM Lagos to Ibadan standard gauge line", impact: "Transforming South West transportation" },
  { category: "Rail", title: "186KM Abuja to Kaduna standard gauge line", impact: "Revolutionising capital region transit" },
  { category: "Ports", title: "Lekki Deep Seaport construction", impact: "Africa's largest deep seaport" },
  { category: "Ports", title: "Bonny Deep Seaport project", impact: "Opening Rivers State to maritime trade" },
  { category: "Infrastructure", title: "Kaduna Inland Dry Port commissioned", impact: "A northern Nigeria trade hub" },
  { category: "Human capital", title: "150 Nigerians on full scholarships to China", impact: "Building local technical expertise" },
  { category: "Innovation", title: "Electronic ticketing on the Abuja to Ibadan route", impact: "Modernising railway services" },
  { category: "Manufacturing", title: "Kajola wagon assembly plant established", impact: "Local production capacity" },
  { category: "Education", title: "Transport University in Daura, Katsina", impact: "First of its kind in West Africa" },
  { category: "Security", title: "17 mission vessels and 3 helicopters", impact: "Deep Blue Project, Gulf of Guinea" },
  { category: "Efficiency", title: "Electronic call up for Lagos ports", impact: "Eliminating the Apapa gridlock" },
];

/** Supplementary record, preserved from the same section. */
export const additionalRecord = [
  "790KM Ibadan to Ilorin to Minna to Kano rail line (Segment 3)",
  "284KM Kano to Maradi standard gauge, with a 103km branch to Dutse",
  "Rehabilitation of the 1,178km Port Harcourt to Maiduguri line",
  "377 wagons, 64 coaches and 21 locomotives purchased",
  "Dala Inland Dry Port in Kano commissioned",
  "Maritime Academy restructured to international standards",
  "6 new tugboats commissioned by the NPA",
  "Wharf Road, Apapa reconstructed after 10+ years abandoned",
  "Boat terminals delivered in Kogi and Adamawa States",
  "Jetty construction completed in Yenagoa",
  "50 engineers trained in China for railway development",
  "Nigeria received its largest container vessel at Onne Port",
];

/** Offices held, oldest first. */
export const offices = [
  {
    id: 1,
    image: assets.Amaechi2,
    period: "1992 to 1994",
    title: "Special Assistant to the Deputy Governor",
    location: "Rivers State",
    description:
      "Served under Deputy Governor Peter Odili, gaining foundational experience in state governance and public administration.",
    achievements: [
      "Built durable relationships across the Rivers State political landscape",
      "Developed a working understanding of how the executive and the legislature work together",
    ],
  },
  {
    id: 2,
    image: assets.Amaechi3,
    period: "1999 to 2007",
    title: "Speaker, Rivers State House of Assembly",
    location: "Rivers State",
    description:
      "Elected to represent his constituency and subsequently made Speaker, serving two consecutive terms and championing legislative independence.",
    achievements: [
      "Chairman, Conference of Speakers of State Assemblies",
      "Successfully defended State Assembly autonomy at the Supreme Court",
      "Led legislative reform and institutional strengthening",
    ],
  },
  {
    id: 3,
    image: assets.Amaechi3,
    period: "2007 to 2015",
    title: "Governor of Rivers State",
    location: "Rivers State",
    description:
      "Won the 2007 primary but was substituted on the ballot; the Supreme Court ruled him the rightful candidate on 26 October 2007. Returned for a second term in 2011.",
    achievements: [
      "Infrastructure at large scale: roads, bridges and flyovers",
      "Power plant projects at Afam, Trans Amadi and Onne",
      "Connected every part of Rivers State by road",
      "Director General of the 2015 presidential campaign",
    ],
  },
  {
    id: 4,
    image: assets.Amaechi1,
    period: "2015 to 2022",
    title: "Federal Minister of Transportation",
    location: "Federal Republic of Nigeria",
    description:
      "Appointed by President Muhammadu Buhari and nominated again in 2019. Led Nigeria's railway modernisation programme and reshaped maritime infrastructure.",
    achievements: [
      "1,763+ KM of standard gauge rail delivered",
      "32 modern train stations constructed nationwide",
      "Seaport development at Lekki, Bonny and Warri to Itakpe",
      "Deep Blue Project for maritime security",
      "150 Nigerians on scholarships to China for railway expertise",
    ],
  },
];
