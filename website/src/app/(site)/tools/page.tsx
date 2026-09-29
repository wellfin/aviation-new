import { ArrowRight, Ruler } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { cardClass } from "@/components/tools-pages/AirportCards";
import { ToolLayout } from "@/components/tools-pages/ToolLayout";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Aviation Tools — Weather, NOTAMs, Runways, Maps & Distance",
  description:
    "Free aviation planning tools: METAR/TAF weather, NOTAM alerts, runway diagrams, satellite airport maps, nearby airports and a great-circle distance calculator.",
};

interface Tool {
  href: string;
  title: string;
  description: string;
  tag: string;
  icon: ReactNode;
  tone: string;
}

const icon = (src: string) => <Image src={src} alt="" width={22} height={22} />;

const TOOLS: Tool[] = [
  {
    href: "/tools/weather",
    title: "Aviation Weather",
    description: "Live METAR and TAF for any airport, decoded into wind, visibility, temperature, QNH and clouds with flight category.",
    tag: "METAR / TAF",
    icon: icon("/images/shared/ico-weather.svg"),
    tone: "bg-brand/8 border-brand/19",
  },
  {
    href: "/tools/notams",
    title: "NOTAM Alerts",
    description: "Current and scheduled NOTAMs with critical items highlighted and filters by type and status.",
    tag: "Live Safety Notices",
    icon: icon("/images/shared/ico-notam.svg"),
    tone: "bg-warning/8 border-warning/19",
  },
  {
    href: "/tools/runway-diagram",
    title: "Runway Diagrams",
    description: "To-scale runway schematics with dimensions, surface, heading, lighting, approaches and radio frequencies.",
    tag: "Surfaces & Radio",
    icon: icon("/images/shared/ico-runway.svg"),
    tone: "bg-brand-cyan/8 border-brand-cyan/19",
  },
  {
    href: "/tools/satellite-map",
    title: "Satellite Map",
    description: "Interactive satellite and street map of any airport with reference data and the closest alternates.",
    tag: "Live Terrain View",
    icon: icon("/images/shared/ico-satellite.svg"),
    tone: "bg-success/8 border-success/19",
  },
  {
    href: "/tools/nearby-airports",
    title: "Nearby Airports",
    description: "Find airports within a chosen radius, sorted by distance with bearing in km and nautical miles.",
    tag: "FBOs & Handlers",
    icon: icon("/images/shared/ico-nearby.svg"),
    tone: "bg-brand/8 border-brand/19",
  },
  {
    href: "/tools/distance",
    title: "Distance Calculator",
    description: "Great-circle distance between two airports with initial bearing and an estimated business-jet flight time.",
    tag: "Route Planning",
    icon: <Ruler className="size-[22px] text-purple" aria-hidden />,
    tone: "bg-purple/8 border-purple/20",
  },
];

export default function ToolsIndexPage() {
  return (
    <ToolLayout
      title="Aviation Tools"
      subtitle="Free flight-planning utilities for pilots, dispatchers and operators — weather, NOTAMs, runways, maps and route distance."
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className={cn(cardClass, "group flex h-full flex-col p-6 transition hover:-translate-y-0.5 hover:shadow-card")}>
              <span className={cn("flex size-12 items-center justify-center rounded-xl border", t.tone)}>{t.icon}</span>
              <span className="mt-4 text-[10px] font-bold tracking-[1px] text-subtle uppercase">{t.tag}</span>
              <h2 className="mt-1 text-lg font-bold text-ink group-hover:text-brand">{t.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-muted">{t.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                Open tool <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </ToolLayout>
  );
}
