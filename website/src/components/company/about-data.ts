import type { LucideIcon } from "lucide-react";
import { BarChart3, Globe, Plane, Table2 } from "lucide-react";

export interface AboutStat {
  value: string;
  label: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon chip. */
  tone: string;
}

export const ABOUT_STATS: AboutStat[] = [
  { value: "180+", label: "Countries Covered", icon: Globe, tone: "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20" },
  { value: "20,000+", label: "Verified Service Providers", icon: Plane, tone: "bg-brand/10 text-brand border-brand/20" },
  { value: "24/7", label: "Global Operations", icon: BarChart3, tone: "bg-success/10 text-success border-success/20" },
  { value: "Real-Time", label: "Data & Updates", icon: Table2, tone: "bg-warning/10 text-warning border-warning/25" },
];

export const CAPABILITIES = [
  { emoji: "🔍", title: "Global Directory", text: "The world's largest searchable database of aviation service providers, updated in real time." },
  { emoji: "🌤️", title: "Live Aviation Weather", text: "METAR and TAF data refreshed every 30 minutes from authoritative global sources." },
  { emoji: "⚠️", title: "NOTAM Intelligence", text: "Hourly NOTAM feeds from all ICAO contracting states with criticality flagging." },
  { emoji: "✈️", title: "Runway Diagrams", text: "Technical runway diagrams with surface data, ILS frequencies, and heading information." },
  { emoji: "🛰️", title: "Satellite Mapping", text: "Interactive satellite and aeronautical maps for every airport in our database." },
  { emoji: "📊", title: "Analytics & Insights", text: "Market data, provider analytics, and aviation service trends for industry professionals." },
] as const;

export const WHY_CHOOSE_US = [
  "Every provider listing is verified by our aviation data team and re-confirmed at least every 90 days.",
  "Search by ICAO or IATA code and see every handler, FBO and supplier at an airport in seconds.",
  "Live METAR, TAF and NOTAM data sits alongside provider listings, so planning happens in one place.",
  "Coverage across 180+ countries, from major hubs to remote regional and private airfields.",
  "Direct enquiries to providers with no booking fees or commission added to your quotes.",
  "A 24/7 support team of former dispatchers, pilots and ground-ops specialists behind the platform.",
] as const;

/** Service categories shown as chips; each links to the filtered directory. */
export const SERVICE_CHIPS: Array<{ label: string; href: string }> = [
  { label: "FBO", href: "/directory?category=fbo" },
  { label: "Ground Handler", href: "/directory?category=ground-handler" },
  { label: "Trip Support", href: "/directory?category=trip-support" },
  { label: "Permit", href: "/directory?category=permit" },
  { label: "Fuel", href: "/directory?category=fuel" },
  { label: "Catering", href: "/directory?category=catering" },
  { label: "Ground Transportation", href: "/directory?category=ground-transportation" },
  { label: "Meet and Assist Service", href: "/directory?category=meet-and-assist" },
  { label: "Charter Operators", href: "/directory?category=charter-operator" },
  { label: "Charter Brokers", href: "/directory?category=charter-broker" },
  { label: "Supervisory Agent", href: "/directory?category=supervisory-agent" },
  { label: "Hotels", href: "/directory?q=hotel" },
  { label: "MRO", href: "/directory?category=mro" },
  { label: "Other Services", href: "/directory" },
];
