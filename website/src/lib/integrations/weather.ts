import "server-only";
import { config } from "@/lib/config";
import { fetchJson } from "@/lib/data/http";
import type { FlightCategory, MetarReport, TafReport } from "@/lib/types";

/**
 * Aviation weather (METAR / TAF).
 *  - WEATHER_PROVIDER=mock            → deterministic demo data (default)
 *  - WEATHER_PROVIDER=aviationweather → https://aviationweather.gov/data/api (no key)
 *  - WEATHER_PROVIDER=checkwx         → https://www.checkwxapi.com (CHECKWX_API_KEY)
 */

export async function getMetar(icao: string): Promise<MetarReport | null> {
  const code = icao.toUpperCase();
  switch (config.WEATHER_PROVIDER) {
    case "aviationweather":
      return metarFromAviationWeather(code);
    case "checkwx":
      return metarFromCheckWx(code);
    default:
      return mockMetar(code);
  }
}

export async function getTaf(icao: string): Promise<TafReport | null> {
  const code = icao.toUpperCase();
  switch (config.WEATHER_PROVIDER) {
    case "aviationweather":
      return tafFromAviationWeather(code);
    case "checkwx":
      return tafFromCheckWx(code);
    default:
      return mockTaf(code);
  }
}

export function flightCategory(ceilingFt: number | null, visibilitySm: number): FlightCategory {
  const ceil = ceilingFt ?? Number.POSITIVE_INFINITY;
  if (ceil < 500 || visibilitySm < 1) return "LIFR";
  if (ceil < 1000 || visibilitySm < 3) return "IFR";
  if (ceil <= 3000 || visibilitySm <= 5) return "MVFR";
  return "VFR";
}

/* ---------------- aviationweather.gov ---------------- */

interface AwcMetar {
  icaoId: string;
  rawOb: string;
  reportTime: string;
  temp: number;
  dewp: number;
  wdir: number | "VRB" | null;
  wspd: number;
  wgst: number | null;
  visib: number | string;
  altim: number;
  wxString?: string | null;
  fltCat?: FlightCategory;
  clouds: Array<{ cover: string; base: number | null }>;
}

async function metarFromAviationWeather(icao: string): Promise<MetarReport | null> {
  const rows = await fetchJson<AwcMetar[]>(`https://aviationweather.gov/api/data/metar?ids=${icao}&format=json`, { revalidate: 300 });
  const m = rows[0];
  if (!m) return null;
  const visSm = typeof m.visib === "number" ? m.visib : Number.parseFloat(String(m.visib)) || 10;
  const ceiling = m.clouds.find((c) => c.cover === "BKN" || c.cover === "OVC")?.base ?? null;
  return {
    icao: m.icaoId,
    raw: m.rawOb,
    observedAt: m.reportTime,
    flightCategory: m.fltCat ?? flightCategory(ceiling, visSm),
    windDirDeg: typeof m.wdir === "number" ? m.wdir : null,
    windSpeedKt: m.wspd,
    windGustKt: m.wgst,
    visibility: typeof m.visib === "number" ? `${m.visib} SM` : `${m.visib} SM`,
    temperatureC: m.temp,
    dewpointC: m.dewp,
    altimeterHpa: Math.round(m.altim),
    clouds: m.clouds.map((c) => ({ cover: c.cover, baseFt: c.base ?? 0 })),
    conditions: m.wxString ? m.wxString.split(" ") : [],
  };
}

interface AwcTaf {
  icaoId: string;
  rawTAF: string;
  issueTime: string;
  validTimeFrom: number;
  validTimeTo: number;
  fcsts: Array<{ timeFrom: number; timeTo: number; fcstChange: string | null; wspd?: number; visib?: number | string; wxString?: string | null }>;
}

async function tafFromAviationWeather(icao: string): Promise<TafReport | null> {
  const rows = await fetchJson<AwcTaf[]>(`https://aviationweather.gov/api/data/taf?ids=${icao}&format=json`, { revalidate: 900 });
  const t = rows[0];
  if (!t) return null;
  const iso = (s: number) => new Date(s * 1000).toISOString();
  return {
    icao: t.icaoId,
    raw: t.rawTAF,
    issuedAt: t.issueTime,
    validFrom: iso(t.validTimeFrom),
    validTo: iso(t.validTimeTo),
    periods: t.fcsts.map((f) => ({
      from: iso(f.timeFrom),
      to: iso(f.timeTo),
      change: (f.fcstChange as TafReport["periods"][number]["change"]) ?? "BASE",
      // TEMPO/PROB groups often omit wind or visibility (null/empty) — show only what is forecast.
      summary: [f.wspd != null ? `Wind ${f.wspd} kt` : null, f.visib != null && f.visib !== "" ? `Vis ${f.visib} SM` : null, f.wxString || null]
        .filter(Boolean)
        .join(" · "),
    })),
  };
}

/* ---------------- CheckWX ---------------- */

interface CheckWxMetar {
  icao: string;
  raw_text: string;
  observed: string;
  flight_category?: FlightCategory;
  wind?: { degrees?: number; speed_kts?: number; gust_kts?: number };
  visibility?: { miles?: string; miles_float?: number };
  temperature?: { celsius: number };
  dewpoint?: { celsius: number };
  barometer?: { hpa: number };
  clouds?: Array<{ code: string; base_feet_agl?: number }>;
  conditions?: Array<{ code: string }>;
}

function checkWxHeaders(): HeadersInit {
  if (!config.CHECKWX_API_KEY) throw new Error("CHECKWX_API_KEY is not configured");
  return { "X-API-Key": config.CHECKWX_API_KEY };
}

async function metarFromCheckWx(icao: string): Promise<MetarReport | null> {
  const body = await fetchJson<{ data: CheckWxMetar[] }>(`https://api.checkwx.com/metar/${icao}/decoded`, {
    headers: checkWxHeaders(),
    revalidate: 300,
  });
  const m = body.data[0];
  if (!m) return null;
  const vis = m.visibility?.miles_float ?? 10;
  const ceiling = m.clouds?.find((c) => c.code === "BKN" || c.code === "OVC")?.base_feet_agl ?? null;
  return {
    icao: m.icao,
    raw: m.raw_text,
    observedAt: m.observed,
    flightCategory: m.flight_category ?? flightCategory(ceiling, vis),
    windDirDeg: m.wind?.degrees ?? null,
    windSpeedKt: m.wind?.speed_kts ?? 0,
    windGustKt: m.wind?.gust_kts ?? null,
    visibility: `${m.visibility?.miles ?? vis} SM`,
    temperatureC: m.temperature?.celsius ?? 0,
    dewpointC: m.dewpoint?.celsius ?? 0,
    altimeterHpa: Math.round(m.barometer?.hpa ?? 1013),
    clouds: (m.clouds ?? []).map((c) => ({ cover: c.code, baseFt: c.base_feet_agl ?? 0 })),
    conditions: (m.conditions ?? []).map((c) => c.code),
  };
}

interface CheckWxTaf {
  icao: string;
  raw_text: string;
  timestamp: { issued: string; from: string; to: string };
  forecast: Array<{ timestamp: { from: string; to: string }; change?: { indicator?: { code: string } }; wind?: { speed_kts?: number }; visibility?: { miles?: string } }>;
}

async function tafFromCheckWx(icao: string): Promise<TafReport | null> {
  const body = await fetchJson<{ data: CheckWxTaf[] }>(`https://api.checkwx.com/taf/${icao}/decoded`, {
    headers: checkWxHeaders(),
    revalidate: 900,
  });
  const t = body.data[0];
  if (!t) return null;
  return {
    icao: t.icao,
    raw: t.raw_text,
    issuedAt: t.timestamp.issued,
    validFrom: t.timestamp.from,
    validTo: t.timestamp.to,
    periods: t.forecast.map((f) => ({
      from: f.timestamp.from,
      to: f.timestamp.to,
      change: (f.change?.indicator?.code as TafReport["periods"][number]["change"]) ?? "BASE",
      summary: [f.wind?.speed_kts !== undefined ? `Wind ${f.wind.speed_kts} kt` : null, f.visibility?.miles ? `Vis ${f.visibility.miles} SM` : null]
        .filter(Boolean)
        .join(" · "),
    })),
  };
}

/* ---------------- Mock ---------------- */

function seedOf(s: string): number {
  return [...s].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
}

function zulu(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}Z`;
}

export function mockMetar(icao: string, now: Date = new Date()): MetarReport {
  const s = seedOf(icao);
  const windDir = (s % 36) * 10;
  const windSpd = 4 + (s % 14);
  const temp = 8 + (s % 24);
  const dew = temp - 2 - (s % 6);
  const qnh = 1005 + (s % 20);
  const cover = ["FEW", "SCT", "BKN"][s % 3];
  const base = (15 + (s % 30)) * 100;
  const observed = new Date(Math.floor(now.getTime() / 1_800_000) * 1_800_000);
  const raw = `${icao} ${zulu(observed)} ${String(windDir).padStart(3, "0")}${String(windSpd).padStart(2, "0")}KT 9999 ${cover}${String(base / 100).padStart(3, "0")} ${String(temp).padStart(2, "0")}/${String(dew).padStart(2, "0")} Q${qnh} NOSIG`;
  return {
    icao,
    raw,
    observedAt: observed.toISOString(),
    flightCategory: flightCategory(cover === "BKN" ? base : null, 10),
    windDirDeg: windDir,
    windSpeedKt: windSpd,
    windGustKt: null,
    visibility: "10+ km",
    temperatureC: temp,
    dewpointC: dew,
    altimeterHpa: qnh,
    clouds: [{ cover, baseFt: base }],
    conditions: [],
  };
}

export function mockTaf(icao: string, now: Date = new Date()): TafReport {
  const issued = new Date(Math.floor(now.getTime() / 21_600_000) * 21_600_000);
  const plus = (h: number) => new Date(issued.getTime() + h * 3_600_000);
  const s = seedOf(icao);
  const dir = String((s % 36) * 10).padStart(3, "0");
  return {
    icao,
    raw: `TAF ${icao} ${zulu(issued)} ${zulu(plus(0)).slice(0, 4)}/${zulu(plus(30)).slice(0, 4)} ${dir}10KT 9999 SCT035 TEMPO ${zulu(plus(6)).slice(0, 4)}/${zulu(plus(10)).slice(0, 4)} 4000 SHRA BKN014 BECMG ${zulu(plus(18)).slice(0, 4)}/${zulu(plus(20)).slice(0, 4)} ${dir}05KT`,
    issuedAt: issued.toISOString(),
    validFrom: plus(0).toISOString(),
    validTo: plus(30).toISOString(),
    periods: [
      { from: plus(0).toISOString(), to: plus(30).toISOString(), change: "BASE", summary: `Wind ${dir}° 10 kt · Vis 10+ km · SCT 3,500 ft` },
      { from: plus(6).toISOString(), to: plus(10).toISOString(), change: "TEMPO", summary: "Vis 4,000 m · Rain showers · BKN 1,400 ft" },
      { from: plus(18).toISOString(), to: plus(20).toISOString(), change: "BECMG", summary: `Wind ${dir}° 5 kt` },
    ],
  };
}
