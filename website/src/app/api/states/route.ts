import { NextResponse } from "next/server";
import states from "@/lib/geo/states.json";

const BY_COUNTRY = states as Record<string, string[]>;

/** GET /api/states?country=IN → { states: ["Andhra Pradesh", …] } for the State dropdowns. */
export function GET(request: Request) {
  const country = (new URL(request.url).searchParams.get("country") ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "country must be a 2-letter ISO code." } }, { status: 400 });
  }
  // Static reference data: safe to cache for a day.
  return NextResponse.json({ states: BY_COUNTRY[country] ?? [] }, { headers: { "Cache-Control": "public, max-age=86400" } });
}
