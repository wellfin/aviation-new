const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"] as const;

/** 16-point compass label for a true bearing, e.g. 67 → "ENE". */
export function compassPoint(deg: number): string {
  return COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

/** Three-digit bearing, e.g. 7.4 → "007°". */
export function bearingLabel(deg: number): string {
  return `${String(Math.round(deg) % 360).padStart(3, "0")}°`;
}

/** ISO timestamp → "2026-09-10 06:00Z". */
export function zuluTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().slice(0, 16).replace("T", " ")}Z`;
}

/** ISO timestamp → "10 Sep 06:00Z" (compact, for TAF periods). */
export function shortZulu(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
  return `${day} ${d.toISOString().slice(11, 16)}Z`;
}

export const FT_TO_M = 0.3048;

export function metres(ft: number): number {
  return Math.round(ft * FT_TO_M);
}
