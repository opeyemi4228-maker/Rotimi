/**
 * Newsroom content.
 *
 * Lifted out of app/news/page.jsx, where both arrays were declared inside the
 * component. The homepage now shows a preview of the same stories, and two
 * copies of the headlines would have drifted apart the first time one was
 * edited. One source, two consumers.
 */

import { assets } from "@/assets/assets";

export const featuredNews = [
  {
    id: 1,
    title: "Amaechi Storms Electronic Transmission Protest, Demands Electoral Transparency",
    excerpt: "Former Rivers State Governor joins protesters in Abuja, lending voice to renewed calls for protection and full implementation of electronic transmission of election results.",
    category: "Electoral Reform",
    date: "Tuesday, February 10, 2026",
    location: "Abuja, Nigeria",
    author: "Campaign News Desk",
    readTime: "4 min read",
    views: "12.5K",
    image: assets.Pro1, // UPDATE WITH ACTUAL IMAGE PATH
    featured: true,
    content: `Abuja, Nigeria. Tuesday

Former Rivers State Governor and former Minister of Transportation, Rotimi Amaechi, was among prominent figures who joined protesters in Abuja on Tuesday, lending his voice to renewed calls for the protection and full implementation of electronic transmission of election results.

Amaechi's presence at the protest ground drew significant attention, as demonstrators rallied in support of strengthening Nigeria's electoral system through transparency driven by technology. Addressing the crowd and speaking with journalists, he emphasized that credible elections remain the bedrock of any functional democracy.

According to him, electronic transmission is not merely a technological upgrade but a safeguard against manipulation and mistrust in the electoral process. He stressed that Nigerians deserve an election system that guarantees accuracy, accountability, and public confidence.

The protest, which brought together civil society groups, political stakeholders, and concerned citizens, remained peaceful amid a visible security presence. Participants carried placards advocating electoral reforms and chanted slogans demanding that institutions uphold democratic standards.

Amaechi maintained that democratic integrity must not be compromised, urging authorities to prioritize transparency in future electoral processes. His participation signaled continued engagement by influential political actors in conversations surrounding electoral reform.

Notably, Amaechi disclosed that he attended the protest with his son, a medical doctor, explaining that he took the precaution in case the demonstration turned violent and injuries were sustained.`,
    highlights: [
      "Joined protest with his son, a medical doctor, for safety",
      "Called electronic transmission 'safeguard against manipulation'",
      "Emphasized credible elections as bedrock of democracy",
      "Protest remained peaceful with visible security presence"
    ],
    tags: ["Electoral Reform", "Democracy", "Transparency", "Protest"]
  },
  {
    id: 2,
    title: "Amaechi Joins ADC AMAC Chairman Flagbearer on Campaign Trail",
    excerpt: "Former Minister of Transportation boosts ADC momentum ahead of FCT local government elections, emphasizing grassroots governance and accountability.",
    category: "Campaign",
    date: "Friday, February 13, 2026",
    location: "Abuja, Nigeria",
    author: "Campaign News Desk",
    readTime: "3 min read",
    views: "8.7K",
    image: assets.Camp2, // UPDATE WITH ACTUAL IMAGE PATH
    featured: true,
    content: `Abuja, Nigeria. Friday

Former Rivers State Governor and former Minister of Transportation, Rotimi Amaechi, on Friday joined the campaign rally of the African Democratic Congress (ADC) AMAC Chairman flagbearer, boosting momentum ahead of the forthcoming local government elections in the Federal Capital Territory.

Amaechi's appearance at the campaign ground energized party supporters and drew significant political attention, as party faithful gathered in large numbers to reaffirm their commitment to grassroots governance and democratic participation.

Addressing the crowd, Amaechi emphasized the importance of credible leadership at the local government level, describing area council administration as the closest tier of government to the people. He urged residents of the Abuja Municipal Area Council (AMAC) to support candidates who prioritize accountability, infrastructure development, and community welfare.

"Leadership at the grassroots determines the quality of governance people experience daily," Amaechi stated, encouraging voters to come out en masse and support the ADC candidate at the polls.

Party stakeholders described Amaechi's presence as a strategic endorsement that reflects growing confidence in the ADC's platform and its AMAC chairmanship candidate. The rally featured speeches from party leaders, youth mobilization groups, and women representatives who reiterated calls for transparency and effective service delivery.

The campaign event concluded with renewed assurances from party officials that the ADC remains committed to inclusive governance, grassroots empowerment, and democratic progress within the Federal Capital Territory.`,
    highlights: [
      "Energized ADC supporters at AMAC campaign rally",
      "Emphasized grassroots governance importance",
      "Called for accountability and infrastructure focus",
      "Strategic endorsement boosts ADC momentum"
    ],
    tags: ["Campaign", "ADC", "AMAC", "Local Government", "Grassroots"]
  }
];

export const recentNews = [
  {
    id: 3,
    title: "Amaechi's Track Record: 1,763+ KM Rail Infrastructure Delivered",
    excerpt: "A comprehensive review of transportation achievements during ministerial tenure from 2015 to 2022.",
    category: "Governance",
    date: "Monday, February 10, 2026",
    readTime: "6 min read",
    views: "15.2K",
    image: assets.Amaechi4,
  },
  {
    id: 4,
    title: "300+ Schools Built: Amaechi's Education Legacy in Rivers State",
    excerpt: "How former governor transformed Rivers education sector with facilities built to international standard.",
    category: "Governance",
    date: "Sunday, February 9, 2026",
    readTime: "5 min read",
    views: "10.8K",
    image: assets.Amaechi6,
  },
  {
    id: 5,
    title: "ADC Mobilizes 100,000+ Volunteers Nationwide for 2027",
    excerpt: "Party strengthens grassroots presence across 36 states with massive volunteer recruitment.",
    category: "Campaign",
    date: "Saturday, February 8, 2026",
    readTime: "4 min read",
    views: "9.3K",
    image: assets.Camp1,
  },
  {
    id: 6,
    title: "Amaechi Calls for Strengthened Anticorruption Framework",
    excerpt: "Former minister advocates for institutional reforms to combat financial malfeasance.",
    category: "Governance",
    date: "Thursday, February 6, 2026",
    readTime: "5 min read",
    views: "7.5K",
    image: assets.Amaechi9,
  }
];

/** Newest first, across both lists. This is what the homepage preview reads from. */
export const latestNews = [...featuredNews, ...recentNews];
