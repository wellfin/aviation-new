import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Tile {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  href: string;
  tone: string;
  badge?: { label: string; className: string };
  arrowClass?: string;
}

/**
 * The five aviation tool shortcuts (Weather, NOTAM, Runway, Satellite, Nearby).
 * Pass an ICAO code to deep-link each tool to a specific airport.
 */
export function ToolTiles({
  icao,
  flightCategory = "VFR",
  notamCount = 3,
  className,
}: {
  icao?: string;
  flightCategory?: string;
  notamCount?: number;
  className?: string;
}) {
  const q = icao ? `?icao=${encodeURIComponent(icao)}` : "";
  const tiles: Tile[] = [
    {
      key: "weather",
      title: "Weather",
      subtitle: "METAR / TAF",
      icon: "/images/shared/ico-weather.svg",
      href: `/tools/weather${q}`,
      tone: "bg-brand/8 border-brand/19",
      badge: { label: flightCategory, className: "bg-success/10 border-success/27 text-success" },
    },
    {
      key: "notam",
      title: "NOTAM Alerts",
      subtitle: "Live Safety Notices",
      icon: "/images/shared/ico-notam.svg",
      href: `/tools/notams${q}`,
      tone: "bg-warning/8 border-warning/19",
      badge: { label: `${notamCount} New`, className: "bg-warning/10 border-warning/27 text-warning" },
    },
    { key: "runway", title: "Runway Diagrams", subtitle: "Surfaces & Radio", icon: "/images/shared/ico-runway.svg", href: `/tools/runway-diagram${q}`, tone: "bg-brand-cyan/8 border-brand-cyan/19", arrowClass: "text-brand-cyan" },
    { key: "satellite", title: "Satellite Map", subtitle: "Live Terrain View", icon: "/images/shared/ico-satellite.svg", href: `/tools/satellite-map${q}`, tone: "bg-success/8 border-success/19", arrowClass: "text-success" },
    { key: "nearby", title: "Nearby Airports", subtitle: "FBOs & Handlers", icon: "/images/shared/ico-nearby.svg", href: `/tools/nearby-airports${q}`, tone: "bg-brand/8 border-brand/19", arrowClass: "text-brand" },
  ];

  return (
    <div className={cn("rounded-[16px] bg-white p-[18px] shadow-card", className)}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className="group flex h-[135px] flex-col items-start rounded-xl bg-[rgba(233,235,244,0.23)] px-2.5 py-3 transition hover:bg-brand/5 hover:shadow-soft"
          >
            <span className={cn("mb-3 flex size-10 items-center justify-center rounded-xl border", t.tone)}>
              <Image src={t.icon} alt="" width={20} height={20} />
            </span>
            <span className="pb-0.5 text-xs font-bold text-ink">{t.title}</span>
            <span className="pb-2 text-[10px] text-subtle">{t.subtitle}</span>
            {t.badge ? (
              <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-bold", t.badge.className)}>{t.badge.label}</span>
            ) : (
              <span className={cn("text-[10px] font-bold transition group-hover:translate-x-0.5", t.arrowClass)} aria-hidden>
                ›
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
