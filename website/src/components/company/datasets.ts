export interface Dataset {
  id: string;
  emoji: string;
  name: string;
  frequency: string;
  description: string;
  volume: string;
  formats: string[];
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
    volume: "40,000+ records",
    formats: ["CSV", "JSON", "XML"],
    endpoint: "GET /v1/airports/{icao}",
  },
  {
    id: "providers",
    emoji: "🏭",
    name: "Provider Database",
    frequency: "Daily",
    description: "Full service provider database with company details, service categories, airport coverage, contact information, and verified status.",
    volume: "50,000+ records",
    formats: ["CSV", "JSON"],
    endpoint: "GET /v1/providers?airport={icao}",
  },
  {
    id: "weather",
    emoji: "🌤️",
    name: "Weather Feed",
    frequency: "30 min",
    description: "Live METAR and TAF data for 40,000+ airports sourced from NOAA, AVIMET, and national meteorological services.",
    volume: "Real-time",
    formats: ["JSON API", "WebSocket"],
    endpoint: "GET /v1/weather/{icao}/metar",
  },
  {
    id: "notams",
    emoji: "⚠️",
    name: "NOTAM Feed",
    frequency: "Hourly",
    description: "Full NOTAM feeds from all ICAO NOF contracting states with parsed, structured data and criticality classification.",
    volume: "Real-time",
    formats: ["JSON API", "XML"],
    endpoint: "GET /v1/notams/{icao}",
  },
  {
    id: "runways",
    emoji: "✈️",
    name: "Runway Database",
    frequency: "Quarterly",
    description: "Technical runway data including designators, dimensions, surface type, ILS frequencies, lighting, and obstacle clearance data.",
    volume: "120,000+ runways",
    formats: ["CSV", "JSON"],
    endpoint: "GET /v1/airports/{icao}/runways",
  },
  {
    id: "fuel-prices",
    emoji: "⛽",
    name: "Fuel Prices",
    frequency: "Daily",
    description: "Aviation fuel prices (AvGas & Jet-A) at airports worldwide, sourced from supplier networks and updated daily.",
    volume: "Global coverage",
    formats: ["JSON API", "CSV"],
    endpoint: "GET /v1/fuel-prices?airport={icao}",
  },
];

export const DATA_STATS = [
  { value: "40K+", label: "Airports indexed" },
  { value: "50K+", label: "Providers" },
  { value: "180", label: "Countries" },
  { value: "99.7%", label: "Data accuracy" },
] as const;
