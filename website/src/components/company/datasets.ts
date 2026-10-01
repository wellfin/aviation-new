export interface Dataset {
  id: string;
  emoji: string;
  name: string;
  frequency: string;
  description: string;
  /** Example REST endpoint shown in the API section. */
  endpoint: string;
}

export const DATASETS: Dataset[] = [
  {
    id: "airports",
    emoji: "🏢",
    name: "Airport Database",
    frequency: "Monthly",
    description: "Complete global airport data including ICAO/IATA codes, coordinates, elevation, timezone, runway details, navaids, and communication frequencies.",
    endpoint: "GET /v1/airports/{icao}",
  },
  {
    id: "providers",
    emoji: "🏭",
    name: "Provider Database",
    frequency: "Daily",
    description: "Full service provider database with company details, service categories, airport coverage, contact information, and verified status.",
    endpoint: "GET /v1/providers?airport={icao}",
  },
  {
    id: "weather",
    emoji: "🌤️",
    name: "Weather Feed",
    frequency: "30 min",
    description: "Live METAR and TAF data for 40,000+ airports sourced from NOAA, AVIMET, and national meteorological services.",
    endpoint: "GET /v1/weather/{icao}/metar",
  },
  {
    id: "notams",
    emoji: "⚠️",
    name: "NOTAM Feed",
    frequency: "Hourly",
    description: "Full NOTAM feeds from all ICAO NOF contracting states with parsed, structured data and criticality classification.",
    endpoint: "GET /v1/notams/{icao}",
  },
  {
    id: "runways",
    emoji: "✈️",
    name: "Runway Database",
    frequency: "Quarterly",
    description: "Technical runway data including designators, dimensions, surface type, ILS frequencies, lighting, and obstacle clearance data.",
    endpoint: "GET /v1/airports/{icao}/runways",
  },
  {
    id: "nearby-airports",
    emoji: "📍",
    name: "Nearby Airports",
    frequency: "Monthly",
    description: "Airports within a chosen radius of any airport or coordinate, with distance, bearing, and the FBOs and handlers available at each.",
    endpoint: "GET /v1/airports/{icao}/nearby?radius={nm}",
  },
];

export const DATA_STATS = [
  { value: "40K+", label: "Airports indexed" },
  { value: "50K+", label: "Providers" },
  { value: "180", label: "Countries" },
  { value: "99.7%", label: "Data accuracy" },
] as const;
