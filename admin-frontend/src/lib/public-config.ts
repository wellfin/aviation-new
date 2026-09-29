/**
 * Browser-safe configuration. Only NEXT_PUBLIC_* variables belong here.
 * Next.js inlines these at build time.
 */
export const publicConfig = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /** "mock" simulates form submissions/auth in the browser; "api" calls the backend. */
  dataSource: (process.env.NEXT_PUBLIC_DATA_SOURCE === "api" ? "api" : "mock") as "mock" | "api",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000",
  /** "osm" needs no key. "google" requires NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY. */
  mapProvider: (process.env.NEXT_PUBLIC_MAP_PROVIDER === "google" ? "google" : "osm") as "osm" | "google",
  googleMapsEmbedKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY ?? "",
} as const;
