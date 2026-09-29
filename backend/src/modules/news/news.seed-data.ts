import type { NewsCategory } from "./news.model.js";

/** Demo articles copied from website/src/lib/mock/news.ts. */

const BODY = [
  "Business aviation activity continued its steady climb this quarter, with operators reporting stronger utilisation across both owner and charter fleets. Analysts point to renewed corporate travel budgets and a sustained preference for private lift on routes poorly served by scheduled carriers.",
  "Ground infrastructure is racing to keep up. FBO operators at major hubs have announced terminal expansions, extra hangarage and upgraded crew facilities, while smaller regional airports are courting operators with competitive fuel and handling packages.",
  "Regulators are also watching closely. New slot-allocation rules and tighter environmental reporting are expected to change how operators plan peak-season movements, particularly in Europe and the Gulf.",
  "For flight departments, the message is clear: plan early, confirm handling and permits well in advance, and keep a close eye on NOTAMs and fuel pricing across alternates.",
];

export interface NewsSeed {
  slug: string;
  title: string;
  excerpt: string;
  category: NewsCategory;
  image: string;
  publishedAt: string;
  author: string;
  authorRole: string;
  featured: boolean;
  body: string[];
}

export const NEWS_SEED: NewsSeed[] = [
  {
    slug: "asia-pacific-bizav-growth-2025",
    title: "Asia-Pacific BizAv Growth in 2025",
    excerpt: "Steady rise in charter demand across India, SE Asia and Australia as new FBOs open.",
    category: "Industry News",
    image: "/images/news/asia-pacific-bizav.png",
    publishedAt: "2026-09-24T08:00:00Z",
    author: "Priya Nair",
    authorRole: "APAC Correspondent",
    featured: true,
    body: BODY,
  },
  {
    slug: "new-fbo-partner-dubai-omdb",
    title: "New FBO Partner Added in Dubai (OMDB)",
    excerpt: "Premium ground handling & lounge services now live.",
    category: "FBO Network",
    image: "/images/news/fbo-dubai.png",
    publishedAt: "2026-09-23T10:00:00Z",
    author: "Omar Haddad",
    authorRole: "Middle East Editor",
    featured: false,
    body: BODY,
  },
  {
    slug: "fuel-price-trends-april-2025",
    title: "Fuel Price Trends – April 2025",
    excerpt: "Avgas & Jet A1 updates across major hubs.",
    category: "Regulatory",
    image: "/images/news/fuel-trends.png",
    publishedAt: "2026-09-21T09:00:00Z",
    author: "Mark Ellison",
    authorRole: "Fuel Markets Analyst",
    featured: false,
    body: BODY,
  },
  {
    slug: "saf-mandates-europe-2026",
    title: "SAF Mandates Tighten Across Europe",
    excerpt: "ReFuelEU blending targets step up — what operators need to know before winter.",
    category: "Fuel",
    image: "/images/news/fuel-trends.png",
    publishedAt: "2026-09-19T12:00:00Z",
    author: "Mark Ellison",
    authorRole: "Fuel Markets Analyst",
    featured: false,
    body: BODY,
  },
  {
    slug: "heathrow-ga-slots-winter",
    title: "Heathrow Revises GA Slot Rules for Winter",
    excerpt: "Business aviation movements face new allocation windows from November.",
    category: "Regulatory",
    image: "/images/airports/lhr.png",
    publishedAt: "2026-09-17T07:30:00Z",
    author: "Hannah Clarke",
    authorRole: "Europe Editor",
    featured: false,
    body: BODY,
  },
  {
    slug: "changi-business-aviation-terminal",
    title: "Changi Opens Expanded Business Aviation Terminal",
    excerpt: "New CIQ lanes cut arrival processing to under ten minutes.",
    category: "FBO Network",
    image: "/images/airports/sin.png",
    publishedAt: "2026-09-14T06:00:00Z",
    author: "Priya Nair",
    authorRole: "APAC Correspondent",
    featured: false,
    body: BODY,
  },
  {
    slug: "digital-notams-rollout",
    title: "Digital NOTAM Rollout Enters Final Phase",
    excerpt: "Structured NOTAM data promises fewer missed restrictions for crews.",
    category: "Technology",
    image: "/images/providers/cabin-wide.jpg",
    publishedAt: "2026-09-10T15:00:00Z",
    author: "Daniel Brooks",
    authorRole: "Technology Writer",
    featured: false,
    body: BODY,
  },
  {
    slug: "charter-demand-summer-review",
    title: "Summer Charter Demand: The Numbers",
    excerpt: "Record Mediterranean movements and a surge in light-jet bookings.",
    category: "Business Aviation",
    image: "/images/providers/cabin-wide.jpg",
    publishedAt: "2026-09-05T11:00:00Z",
    author: "Hannah Clarke",
    authorRole: "Europe Editor",
    featured: false,
    body: BODY,
  },
  {
    slug: "ground-handling-safety-audit",
    title: "IS-BAH Audits Rise as Handlers Chase Accreditation",
    excerpt: "More ground handlers are pursuing Stage III ahead of new tender requirements.",
    category: "Industry News",
    image: "/images/news/asia-pacific-bizav.png",
    publishedAt: "2026-08-30T09:00:00Z",
    author: "Omar Haddad",
    authorRole: "Middle East Editor",
    featured: false,
    body: BODY,
  },
];
