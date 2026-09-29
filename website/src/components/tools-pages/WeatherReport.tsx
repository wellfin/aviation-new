import { Cloud, Droplets, Eye, Gauge, Thermometer, Wind } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cardClass } from "@/components/tools-pages/AirportCards";
import { bearingLabel, shortZulu, zuluTime } from "@/components/tools-pages/format";
import type { FlightCategory, MetarReport, TafReport } from "@/lib/types";
import { cn, formatNumber, timeAgo } from "@/lib/utils";

export const FLIGHT_CATEGORY: Record<FlightCategory, { label: string; className: string; dot: string }> = {
  VFR: { label: "Visual Flight Rules", className: "border-success/30 bg-success/10 text-[#16a34a]", dot: "bg-success" },
  MVFR: { label: "Marginal VFR", className: "border-brand/30 bg-brand/10 text-brand", dot: "bg-brand" },
  IFR: { label: "Instrument Flight Rules", className: "border-danger/30 bg-danger/10 text-danger", dot: "bg-danger" },
  LIFR: { label: "Low IFR", className: "border-[#d946ef]/30 bg-[#d946ef]/10 text-[#c026d3]", dot: "bg-[#d946ef]" },
};

export function FlightCategoryBadge({ category, size = "md" }: { category: FlightCategory; size?: "sm" | "md" }) {
  const c = FLIGHT_CATEGORY[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-extrabold tracking-[0.5px]",
        size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-[10px]",
        c.className,
      )}
      title={c.label}
    >
      <span className={cn("size-2 rounded-full", c.dot)} aria-hidden />
      {category}
    </span>
  );
}

function RawBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-navy-900/6 bg-navy-900/3 p-3">
      <p className="sr-only">{label}</p>
      <code className="block font-mono text-xs leading-[19.5px] break-words text-[#475569]">{text}</code>
    </div>
  );
}

function Decoded({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4">
      <dt className="flex items-center gap-2 text-xs font-semibold tracking-[0.6px] text-muted uppercase">
        <Icon className="size-4 text-brand" aria-hidden />
        {label}
      </dt>
      <dd className="mt-2">
        <span className="block text-lg leading-6 font-bold text-ink">{value}</span>
        {detail && <span className="mt-0.5 block text-xs text-subtle">{detail}</span>}
      </dd>
    </div>
  );
}

const COVER: Record<string, string> = { FEW: "Few", SCT: "Scattered", BKN: "Broken", OVC: "Overcast", SKC: "Clear", CLR: "Clear", NSC: "No significant", VV: "Vertical visibility" };

function windText(m: MetarReport): { value: string; detail: string } {
  if (m.windSpeedKt === 0) return { value: "Calm", detail: "Wind below 1 kt" };
  const dir = m.windDirDeg === null ? "Variable" : bearingLabel(m.windDirDeg);
  const gust = m.windGustKt ? ` G${m.windGustKt}` : "";
  return { value: `${dir} / ${m.windSpeedKt}${gust} kt`, detail: `${Math.round(m.windSpeedKt * 1.852)} km/h${m.windGustKt ? `, gusting ${m.windGustKt} kt` : ""}` };
}

export function MetarCard({ metar }: { metar: MetarReport }) {
  const wind = windText(metar);
  const spread = metar.temperatureC - metar.dewpointC;
  const clouds = metar.clouds.length
    ? metar.clouds.map((c) => `${c.cover} ${formatNumber(c.baseFt)} ft`).join(", ")
    : "No cloud reported";
  const cloudDetail = metar.clouds.map((c) => `${COVER[c.cover] ?? c.cover} at ${formatNumber(c.baseFt)} ft AGL`).join(" · ");

  return (
    <section className={cn(cardClass, "p-5 sm:p-6")} aria-labelledby="metar-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="metar-heading" className="text-lg font-bold text-ink">
            METAR <span className="font-normal text-subtle">· Current conditions</span>
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Observed {zuluTime(metar.observedAt)} <span className="text-subtle">({timeAgo(metar.observedAt)})</span>
          </p>
        </div>
        <FlightCategoryBadge category={metar.flightCategory} />
      </div>

      <div className="mt-4">
        <RawBlock label="Raw METAR" text={metar.raw} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3" aria-label="Decoded METAR">
        <Decoded icon={Wind} label="Wind" value={wind.value} detail={wind.detail} />
        <Decoded icon={Eye} label="Visibility" value={metar.visibility} detail={metar.conditions.length ? metar.conditions.join(" ") : "No significant weather"} />
        <Decoded icon={Thermometer} label="Temperature" value={`${metar.temperatureC}°C`} detail={`${Math.round(metar.temperatureC * 1.8 + 32)}°F`} />
        <Decoded icon={Droplets} label="Dew point" value={`${metar.dewpointC}°C`} detail={`Spread ${spread}°C${spread <= 2 ? " — fog/mist risk" : ""}`} />
        <Decoded icon={Gauge} label="QNH" value={`${metar.altimeterHpa} hPa`} detail={`${(metar.altimeterHpa * 0.02953).toFixed(2)} inHg`} />
        <Decoded icon={Cloud} label="Clouds" value={clouds} detail={cloudDetail || undefined} />
      </dl>
    </section>
  );
}

const CHANGE_TONE: Record<TafReport["periods"][number]["change"], string> = {
  BASE: "bg-navy-900/6 text-navy-900",
  FM: "bg-brand/10 text-brand",
  BECMG: "bg-success/10 text-[#16a34a]",
  TEMPO: "bg-warning/12 text-[#b45309]",
  PROB30: "bg-purple/10 text-purple",
  PROB40: "bg-purple/10 text-purple",
};

export function TafCard({ taf }: { taf: TafReport }) {
  return (
    <section className={cn(cardClass, "p-5 sm:p-6")} aria-labelledby="taf-heading">
      <h2 id="taf-heading" className="text-lg font-bold text-ink">
        TAF <span className="font-normal text-subtle">· Terminal forecast</span>
      </h2>
      <p className="mt-0.5 text-xs text-muted">
        Issued {zuluTime(taf.issuedAt)} · valid {shortZulu(taf.validFrom)} → {shortZulu(taf.validTo)}
      </p>
      <div className="mt-4">
        <RawBlock label="Raw TAF" text={taf.raw} />
      </div>
      <ol className="mt-4 space-y-2">
        {taf.periods.map((p, i) => (
          <li key={`${p.change}-${p.from}-${i}`} className="flex flex-col gap-2 rounded-xl border border-line p-3 sm:flex-row sm:items-center sm:gap-4">
            <span className={cn("w-fit rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-[0.5px]", CHANGE_TONE[p.change])}>
              {p.change === "BASE" ? "INITIAL" : p.change}
            </span>
            <span className="font-mono text-xs text-muted sm:w-[230px] sm:shrink-0 sm:whitespace-nowrap">
              {shortZulu(p.from)} → {shortZulu(p.to)}
            </span>
            <span className="text-sm text-ink">{p.summary || "No significant change"}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Legend explaining the flight-category colours. */
export function FlightCategoryLegend() {
  return (
    <section className={cn(cardClass, "p-5")} aria-labelledby="fc-legend">
      <h3 id="fc-legend" className="text-sm font-bold text-ink">
        Flight categories
      </h3>
      <ul className="mt-3 space-y-2.5">
        {(Object.keys(FLIGHT_CATEGORY) as FlightCategory[]).map((k) => (
          <li key={k} className="flex items-center gap-3">
            <span className="w-[62px]">
              <FlightCategoryBadge category={k} size="sm" />
            </span>
            <span className="text-xs text-muted">{FLIGHT_CATEGORY[k].label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-4 text-subtle">
        Based on ceiling and visibility: VFR &gt; 3,000 ft / 5 SM, MVFR 1,000–3,000 ft / 3–5 SM, IFR 500–1,000 ft / 1–3 SM, LIFR below.
      </p>
    </section>
  );
}
