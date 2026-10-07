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
}

/**
 * The five aviation tool shortcuts (Weather, NOTAM, Runway, Satellite, Nearby).
 * Pass an ICAO code to deep-link each tool to a specific airport.
 */
export function ToolTiles({
  icao,
  fill = false,
  className,
}: {
  icao?: string;
  /** Let the tiles grow to fill the box when a parent stretches it (home page: level with the card beside it). */
  fill?: boolean;
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
    },
    {
      key: "notam",
      title: "NOTAM Alerts",
      subtitle: "Live Safety Notices",
      icon: "/images/shared/ico-notam.svg",
      href: `/tools/notams${q}`,
      tone: "bg-warning/8 border-warning/19",
    },
    { key: "runway", title: "Runway Diagrams", subtitle: "Surfaces & Radio", icon: "/images/shared/ico-runway.svg", href: `/tools/runway-diagram${q}`, tone: "bg-brand-cyan/8 border-brand-cyan/19" },
    { key: "satellite", title: "Satellite Map", subtitle: "Live Terrain View", icon: "/images/shared/ico-satellite.svg", href: `/tools/satellite-map${q}`, tone: "bg-success/8 border-success/19" },
    { key: "nearby", title: "Nearby Airports", subtitle: "FBOs & Handlers", icon: "/images/shared/ico-nearby.svg", href: `/tools/nearby-airports${q}`, tone: "bg-brand/8 border-brand/19" },
  ];

  return (
    <div className={cn("rounded-[16px] bg-white p-[18px] shadow-card", fill && "flex flex-col", className)}>
      <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5", fill && "flex-1")}>
        {tiles.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={cn(
              "group flex h-[135px] flex-col items-start rounded-xl bg-[rgba(233,235,244,0.23)] px-2.5 py-3 transition hover:bg-brand/5 hover:shadow-soft",
              fill && "lg:h-full",
            )}
          >
            <span className={cn("mb-3 flex size-10 items-center justify-center rounded-xl border", t.tone)}>
              <Image src={t.icon} alt="" width={20} height={20} />
            </span>
            <span className="pb-0.5 text-xs font-bold text-ink">{t.title}</span>
            <span className="text-[10px] text-subtle">{t.subtitle}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
