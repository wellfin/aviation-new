import type { NewsArticle } from "@/lib/types";

const IMG = {
  apac: "/images/news/asia-pacific-bizav.png",
  fbo: "/images/news/fbo-dubai.png",
  fuel: "/images/news/fuel-trends.png",
  cabin: "/images/providers/cabin-wide.jpg",
  lhr: "/images/airports/lhr.png",
  sin: "/images/airports/sin.png",
};

const BODY = [
  "Business aviation activity continued its steady climb this quarter, with operators reporting stronger utilisation across both owner and charter fleets. Analysts point to renewed corporate travel budgets and a sustained preference for private lift on routes poorly served by scheduled carriers.",
  "Ground infrastructure is racing to keep up. FBO operators at major hubs have announced terminal expansions, extra hangarage and upgraded crew facilities, while smaller regional airports are courting operators with competitive fuel and handling packages.",
  "Regulators are also watching closely. New slot-allocation rules and tighter environmental reporting are expected to change how operators plan peak-season movements, particularly in Europe and the Gulf.",
  "For flight departments, the message is clear: plan early, confirm handling and permits well in advance, and keep a close eye on NOTAMs and fuel pricing across alternates.",
];

export const NEWS: NewsArticle[] = [
  { slug: "asia-pacific-bizav-growth-2025", title: "Asia-Pacific BizAv Growth in 2025", excerpt: "Steady rise in charter demand across India, SE Asia and Australia as new FBOs open.", category: "Industry News", image: IMG.apac, publishedAt: "2026-09-24T08:00:00Z", author: "Priya Nair", authorRole: "APAC Correspondent", readMinutes: 5, featured: true, body: BODY },
  { slug: "new-fbo-partner-dubai-omdb", title: "New FBO Partner Added in Dubai (OMDB)", excerpt: "Premium ground handling & lounge services now live.", category: "FBO Network", image: IMG.fbo, publishedAt: "2026-09-23T10:00:00Z", author: "Omar Haddad", authorRole: "Middle East Editor", readMinutes: 3, featured: false, body: BODY },
  { slug: "fuel-price-trends-april-2025", title: "Fuel Price Trends – April 2025", excerpt: "Avgas & Jet A1 updates across major hubs.", category: "Regulatory", image: IMG.fuel, publishedAt: "2026-09-21T09:00:00Z", author: "Mark Ellison", authorRole: "Fuel Markets Analyst", readMinutes: 4, featured: false, body: BODY },
  { slug: "saf-mandates-europe-2026", title: "SAF Mandates Tighten Across Europe", excerpt: "ReFuelEU blending targets step up — what operators need to know before winter.", category: "Fuel", image: IMG.fuel, publishedAt: "2026-09-19T12:00:00Z", author: "Mark Ellison", authorRole: "Fuel Markets Analyst", readMinutes: 6, featured: false, body: BODY },
  { slug: "heathrow-ga-slots-winter", title: "Heathrow Revises GA Slot Rules for Winter", excerpt: "Business aviation movements face new allocation windows from November.", category: "Regulatory", image: IMG.lhr, publishedAt: "2026-09-17T07:30:00Z", author: "Hannah Clarke", authorRole: "Europe Editor", readMinutes: 4, featured: false, body: BODY },
  { slug: "changi-business-aviation-terminal", title: "Changi Opens Expanded Business Aviation Terminal", excerpt: "New CIQ lanes cut arrival processing to under ten minutes.", category: "FBO Network", image: IMG.sin, publishedAt: "2026-09-14T06:00:00Z", author: "Priya Nair", authorRole: "APAC Correspondent", readMinutes: 3, featured: false, body: BODY },
  { slug: "digital-notams-rollout", title: "Digital NOTAM Rollout Enters Final Phase", excerpt: "Structured NOTAM data promises fewer missed restrictions for crews.", category: "Technology", image: IMG.cabin, publishedAt: "2026-09-10T15:00:00Z", author: "Daniel Brooks", authorRole: "Technology Writer", readMinutes: 5, featured: false, body: BODY },
  { slug: "charter-demand-summer-review", title: "Summer Charter Demand: The Numbers", excerpt: "Record Mediterranean movements and a surge in light-jet bookings.", category: "Business Aviation", image: IMG.cabin, publishedAt: "2026-09-05T11:00:00Z", author: "Hannah Clarke", authorRole: "Europe Editor", readMinutes: 7, featured: false, body: BODY },
  { slug: "ground-handling-safety-audit", title: "IS-BAH Audits Rise as Handlers Chase Accreditation", excerpt: "More ground handlers are pursuing Stage III ahead of new tender requirements.", category: "Industry News", image: IMG.apac, publishedAt: "2026-08-30T09:00:00Z", author: "Omar Haddad", authorRole: "Middle East Editor", readMinutes: 4, featured: false, body: BODY },
];
