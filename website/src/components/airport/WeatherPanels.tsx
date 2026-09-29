import Link from "next/link";
import { CloudSun } from "lucide-react";
import type { FlightCategory, MetarReport, TafReport } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

const CATEGORY_TONE: Record<FlightCategory, string> = {
  VFR: "bg-success/10 border-success/30 text-[#15803d]",
  MVFR: "bg-brand/10 border-brand/30 text-brand",
  IFR: "bg-danger/10 border-danger/30 text-danger",
  LIFR: "bg-purple/10 border-purple/30 text-purple",
};

export function FlightCategoryBadge({ category }: { category: FlightCategory }) {
  return <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-[0.5px]", CATEGORY_TONE[category])}>{category}</span>;
}

function zuluTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" })} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}Z`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2.5">
      <dt className="text-[10px] font-bold tracking-[0.6px] text-subtle uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold text-ink">{value}</dd>
    </div>
  );
}

function Raw({ text }: { text: string }) {
  return <p className="mt-3 rounded-xl bg-navy-900 px-4 py-3 font-mono text-xs leading-5 break-words text-brand-cyan">{text}</p>;
}

/** Live METAR + TAF with raw strings and decoded values. */
export function WeatherPanels({ icao, metar, taf }: { icao: string; metar: MetarReport | null; taf: TafReport | null }) {
  const wind = metar
    ? metar.windSpeedKt === 0
      ? "Calm"
      : `${metar.windDirDeg === null ? "VRB" : `${String(metar.windDirDeg).padStart(3, "0")}°`} ${metar.windSpeedKt} kt${metar.windGustKt ? ` G${metar.windGustKt}` : ""}`
    : "";

  return (
    <section aria-labelledby="weather-heading" className="rounded-[20px] bg-white p-5 shadow-card md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="weather-heading" className="flex items-center gap-2 text-lg font-bold text-ink">
          <CloudSun className="size-5 text-brand" aria-hidden /> Weather — METAR / TAF
        </h2>
        <Link href={`/tools/weather?icao=${icao}`} className="text-sm font-semibold text-brand hover:underline">
          Open weather tool →
        </Link>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <article aria-label="METAR" className="rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-ink">METAR</h3>
            {metar && <FlightCategoryBadge category={metar.flightCategory} />}
          </div>
          {metar ? (
            <>
              <p className="mt-1 text-xs text-muted">Observed {zuluTime(metar.observedAt)}</p>
              <Raw text={metar.raw} />
              <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Stat label="Wind" value={wind} />
                <Stat label="Visibility" value={metar.visibility} />
                <Stat label="Temp / Dew" value={`${metar.temperatureC}° / ${metar.dewpointC}°C`} />
                <Stat label="QNH" value={`${metar.altimeterHpa} hPa`} />
                <Stat
                  label="Clouds"
                  value={metar.clouds.length ? metar.clouds.map((c) => `${c.cover} ${formatNumber(c.baseFt)} ft`).join(", ") : "Clear"}
                />
                <Stat label="Weather" value={metar.conditions.length ? metar.conditions.join(", ") : "None"} />
              </dl>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">No METAR is currently available for {icao}.</p>
          )}
        </article>

        <article aria-label="TAF" className="rounded-2xl border border-line p-4">
          <h3 className="text-sm font-extrabold text-ink">TAF</h3>
          {taf ? (
            <>
              <p className="mt-1 text-xs text-muted">
                Issued {zuluTime(taf.issuedAt)} · valid {zuluTime(taf.validFrom)} – {zuluTime(taf.validTo)}
              </p>
              <Raw text={taf.raw} />
              <ol className="mt-3 space-y-2">
                {taf.periods.map((p, i) => (
                  <li key={`${p.change}-${i}`} className="flex gap-3 rounded-xl bg-surface px-3 py-2.5">
                    <span className="h-fit shrink-0 rounded-md bg-navy-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">{p.change}</span>
                    <div className="min-w-0 text-xs">
                      <p className="font-semibold text-ink">{p.summary}</p>
                      <p className="mt-0.5 text-muted">
                        {zuluTime(p.from)} – {zuluTime(p.to)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">No TAF is currently issued for {icao}.</p>
          )}
        </article>
      </div>
    </section>
  );
}
