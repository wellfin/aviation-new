import { logger } from "../../lib/logger.js";
import { Airport } from "./airport.model.js";
import type { CreateAirportInput } from "./airports.schemas.js";

/**
 * Demo airport data (copied from the frontend's mock set so both show the same
 * directory). Image paths are served by the frontend. `servicesCount` is not
 * seeded — it is derived from published providers (see recountAirportServices).
 */
/** Optional operational details ("More Airport Information") are filled in by staff, not seeded. */
type OptionalDetail =
  | "trafficPermitted"
  | "lightIntensity"
  | "deicing"
  | "airportCategory"
  | "slotsRequired"
  | "website"
  | "cargoHandling"
  | "hangarSpace"
  | "restaurants"
  | "medicalFacilities"
  | "runwayDiagram"
  | "rescueEquipment"
  | "disabledAircraftRemoval";
type AirportSeed = Required<Omit<CreateAirportInput, "iata" | OptionalDetail>> & { iata: string; servicesCount?: number };

const TAGS = ["Fuel", "FBO", "MRO", "Ground"];

export const AIRPORT_SEED: AirportSeed[] = [
  {
    icao: "EGLL",
    iata: "LHR",
    name: "London Heathrow Airport",
    shortName: "London Heathrow",
    city: "London",
    region: "Hillingdon, London",
    country: "United Kingdom",
    countryCode: "GB",
    continent: "Europe",
    type: "large_airport",
    lat: 51.4706,
    lon: -0.461941,
    elevationFt: 83,
    timezone: "Europe/London",
    utcOffset: "UTC+0",
    image: "/images/airports/lhr.png",
    servicesCount: 284,
    serviceTags: TAGS,
    runways: [
      { designator: "09L/27R", lengthFt: 12799, widthFt: 164, surface: "Asphalt", lighting: true, headingDeg: 89, ils: "CAT IIIb" },
      { designator: "09R/27L", lengthFt: 12008, widthFt: 164, surface: "Asphalt", lighting: true, headingDeg: 89, ils: "CAT IIIb" },
    ],
    frequencies: [
      { type: "ATIS", description: "Arrival ATIS", mhz: "128.075" },
      { type: "TWR", description: "Heathrow Tower", mhz: "118.505" },
      { type: "GND", description: "Heathrow Ground", mhz: "121.905" },
      { type: "APP", description: "London Approach", mhz: "119.730" },
      { type: "DEL", description: "Heathrow Delivery", mhz: "121.980" },
    ],
    fireCategory: "CAT 10",
    operatingHours: "24 hours (night quota restrictions apply)",
    customs: true,
    featured: true,
  },
  {
    icao: "OMDB",
    iata: "DXB",
    name: "Dubai International Airport",
    shortName: "Dubai International",
    city: "Dubai",
    region: "Al Garhoud, Dubai",
    country: "United Arab Emirates",
    countryCode: "AE",
    continent: "Asia",
    type: "large_airport",
    lat: 25.2528,
    lon: 55.3644,
    elevationFt: 62,
    timezone: "Asia/Dubai",
    utcOffset: "UTC+4",
    image: "/images/airports/dxb.png",
    servicesCount: 312,
    serviceTags: TAGS,
    runways: [
      { designator: "12L/30R", lengthFt: 13124, widthFt: 197, surface: "Asphalt", lighting: true, headingDeg: 120, ils: "CAT IIIb" },
      { designator: "12R/30L", lengthFt: 14590, widthFt: 197, surface: "Asphalt", lighting: true, headingDeg: 120, ils: "CAT IIIb" },
    ],
    frequencies: [
      { type: "ATIS", description: "Dubai ATIS", mhz: "131.700" },
      { type: "TWR", description: "Dubai Tower", mhz: "118.750" },
      { type: "GND", description: "Dubai Ground", mhz: "118.350" },
      { type: "APP", description: "Dubai Approach", mhz: "124.900" },
    ],
    fireCategory: "CAT 10",
    operatingHours: "24 hours",
    customs: true,
    featured: true,
  },
  {
    icao: "KJFK",
    iata: "JFK",
    name: "John F. Kennedy International Airport",
    shortName: "John F. Kennedy Intl",
    city: "New York",
    region: "Queens, New York",
    country: "United States",
    countryCode: "US",
    continent: "North America",
    type: "large_airport",
    lat: 40.6398,
    lon: -73.7789,
    elevationFt: 13,
    timezone: "America/New_York",
    utcOffset: "UTC-5",
    image: "/images/airports/jfk.png",
    servicesCount: 256,
    serviceTags: TAGS,
    runways: [
      { designator: "04L/22R", lengthFt: 12079, widthFt: 200, surface: "Asphalt", lighting: true, headingDeg: 44, ils: "CAT I" },
      { designator: "04R/22L", lengthFt: 8400, widthFt: 200, surface: "Asphalt", lighting: true, headingDeg: 44, ils: "CAT III" },
      { designator: "13L/31R", lengthFt: 10000, widthFt: 200, surface: "Concrete", lighting: true, headingDeg: 134, ils: "CAT I" },
      { designator: "13R/31L", lengthFt: 14511, widthFt: 200, surface: "Concrete", lighting: true, headingDeg: 134, ils: "CAT II" },
    ],
    frequencies: [
      { type: "ATIS", description: "Kennedy ATIS", mhz: "128.725" },
      { type: "TWR", description: "Kennedy Tower", mhz: "119.100" },
      { type: "GND", description: "Kennedy Ground", mhz: "121.900" },
      { type: "APP", description: "New York Approach", mhz: "132.400" },
    ],
    fireCategory: "CAT 10",
    operatingHours: "24 hours",
    customs: true,
    featured: true,
  },
  {
    icao: "WSSS",
    iata: "SIN",
    name: "Singapore Changi Airport",
    shortName: "Singapore Changi",
    city: "Singapore",
    region: "Changi",
    country: "Singapore",
    countryCode: "SG",
    continent: "Asia",
    type: "large_airport",
    lat: 1.35019,
    lon: 103.994,
    elevationFt: 22,
    timezone: "Asia/Singapore",
    utcOffset: "UTC+8",
    image: "/images/airports/sin.png",
    servicesCount: 198,
    serviceTags: TAGS,
    runways: [
      { designator: "02L/20R", lengthFt: 13123, widthFt: 197, surface: "Asphalt", lighting: true, headingDeg: 22, ils: "CAT II" },
      { designator: "02C/20C", lengthFt: 13123, widthFt: 197, surface: "Asphalt", lighting: true, headingDeg: 22, ils: "CAT II" },
    ],
    frequencies: [
      { type: "ATIS", description: "Changi ATIS", mhz: "128.600" },
      { type: "TWR", description: "Changi Tower", mhz: "118.600" },
      { type: "GND", description: "Changi Ground", mhz: "124.300" },
    ],
    fireCategory: "CAT 10",
    operatingHours: "24 hours",
    customs: true,
    featured: true,
  },
  {
    icao: "LFPG",
    iata: "CDG",
    name: "Paris Charles de Gaulle Airport",
    shortName: "Paris Charles de Gaulle",
    city: "Paris",
    region: "Roissy-en-France, Île-de-France",
    country: "France",
    countryCode: "FR",
    continent: "Europe",
    type: "large_airport",
    lat: 49.0097,
    lon: 2.5479,
    elevationFt: 392,
    timezone: "Europe/Paris",
    utcOffset: "UTC+1",
    image: "/images/airports/cdg.png",
    servicesCount: 231,
    serviceTags: TAGS,
    runways: [
      { designator: "08L/26R", lengthFt: 13829, widthFt: 148, surface: "Asphalt", lighting: true, headingDeg: 85, ils: "CAT IIIb" },
      { designator: "09R/27L", lengthFt: 13780, widthFt: 197, surface: "Asphalt", lighting: true, headingDeg: 85, ils: "CAT IIIb" },
    ],
    frequencies: [
      { type: "ATIS", description: "De Gaulle ATIS", mhz: "127.125" },
      { type: "TWR", description: "De Gaulle Tower", mhz: "118.650" },
      { type: "GND", description: "De Gaulle Ground", mhz: "121.800" },
    ],
    fireCategory: "CAT 10",
    operatingHours: "24 hours",
    customs: true,
    featured: true,
  },
  {
    icao: "RJTT",
    iata: "HND",
    name: "Tokyo Haneda Airport",
    shortName: "Tokyo Haneda",
    city: "Tokyo",
    region: "Ōta, Tokyo",
    country: "Japan",
    countryCode: "JP",
    continent: "Asia",
    type: "large_airport",
    lat: 35.5523,
    lon: 139.78,
    elevationFt: 35,
    timezone: "Asia/Tokyo",
    utcOffset: "UTC+9",
    image: "/images/airports/hnd.png",
    servicesCount: 187,
    serviceTags: TAGS,
    runways: [
      { designator: "16R/34L", lengthFt: 9843, widthFt: 197, surface: "Asphalt", lighting: true, headingDeg: 157, ils: "CAT I" },
      { designator: "16L/34R", lengthFt: 11024, widthFt: 197, surface: "Asphalt", lighting: true, headingDeg: 157, ils: "CAT IIIa" },
    ],
    frequencies: [
      { type: "ATIS", description: "Tokyo ATIS", mhz: "128.800" },
      { type: "TWR", description: "Tokyo Tower", mhz: "118.100" },
      { type: "GND", description: "Tokyo Ground", mhz: "121.700" },
    ],
    fireCategory: "CAT 10",
    operatingHours: "24 hours",
    customs: true,
    featured: true,
  },
  {
    icao: "VIDP",
    iata: "DEL",
    name: "Indira Gandhi International Airport",
    shortName: "Indira Gandhi Intl",
    city: "New Delhi",
    region: "Palam, Delhi",
    country: "India",
    countryCode: "IN",
    continent: "Asia",
    type: "large_airport",
    lat: 28.5665,
    lon: 77.1031,
    elevationFt: 777,
    timezone: "Asia/Kolkata",
    utcOffset: "UTC+5:30",
    image: "/images/airports/lhr.png",
    servicesCount: 164,
    serviceTags: TAGS,
    runways: [
      { designator: "09/27", lengthFt: 9229, widthFt: 150, surface: "Asphalt", lighting: true, headingDeg: 92, ils: "CAT I" },
      { designator: "10/28", lengthFt: 12500, widthFt: 150, surface: "Asphalt", lighting: true, headingDeg: 102, ils: "CAT IIIb" },
      { designator: "11/29", lengthFt: 14534, widthFt: 197, surface: "Asphalt", lighting: true, headingDeg: 112, ils: "CAT IIIb" },
    ],
    frequencies: [
      { type: "ATIS", description: "Delhi ATIS", mhz: "126.400" },
      { type: "TWR", description: "Delhi Tower", mhz: "118.100" },
      { type: "GND", description: "Delhi Ground", mhz: "121.900" },
    ],
    fireCategory: "CAT 10",
    operatingHours: "24 hours",
    customs: true,
    featured: false,
  },
  {
    icao: "EDDF",
    iata: "FRA",
    name: "Frankfurt am Main Airport",
    shortName: "Frankfurt",
    city: "Frankfurt",
    region: "Hesse",
    country: "Germany",
    countryCode: "DE",
    continent: "Europe",
    type: "large_airport",
    lat: 50.0333,
    lon: 8.5706,
    elevationFt: 364,
    timezone: "Europe/Berlin",
    utcOffset: "UTC+1",
    image: "/images/airports/cdg.png",
    servicesCount: 176,
    serviceTags: TAGS,
    runways: [
      { designator: "07C/25C", lengthFt: 13123, widthFt: 197, surface: "Asphalt", lighting: true, headingDeg: 69, ils: "CAT IIIb" },
      { designator: "18", lengthFt: 13123, widthFt: 148, surface: "Asphalt", lighting: true, headingDeg: 180 },
    ],
    frequencies: [
      { type: "ATIS", description: "Frankfurt ATIS", mhz: "118.025" },
      { type: "TWR", description: "Frankfurt Tower", mhz: "119.900" },
    ],
    fireCategory: "CAT 10",
    operatingHours: "05:00–23:00 local",
    customs: true,
    featured: false,
  },
  {
    icao: "KLAX",
    iata: "LAX",
    name: "Los Angeles International Airport",
    shortName: "Los Angeles Intl",
    city: "Los Angeles",
    region: "California",
    country: "United States",
    countryCode: "US",
    continent: "North America",
    type: "large_airport",
    lat: 33.9425,
    lon: -118.408,
    elevationFt: 125,
    timezone: "America/Los_Angeles",
    utcOffset: "UTC-8",
    image: "/images/airports/jfk.png",
    servicesCount: 221,
    serviceTags: TAGS,
    runways: [
      { designator: "06L/24R", lengthFt: 8926, widthFt: 150, surface: "Concrete", lighting: true, headingDeg: 83, ils: "CAT I" },
      { designator: "07L/25R", lengthFt: 12923, widthFt: 150, surface: "Concrete", lighting: true, headingDeg: 83, ils: "CAT IIIb" },
    ],
    frequencies: [
      { type: "ATIS", description: "LAX ATIS", mhz: "133.800" },
      { type: "TWR", description: "LA Tower", mhz: "133.900" },
    ],
    fireCategory: "CAT 10",
    operatingHours: "24 hours",
    customs: true,
    featured: false,
  },
  {
    icao: "EGLF",
    iata: "FAB",
    name: "Farnborough Airport",
    shortName: "Farnborough",
    city: "Farnborough",
    region: "Hampshire",
    country: "United Kingdom",
    countryCode: "GB",
    continent: "Europe",
    type: "medium_airport",
    lat: 51.2758,
    lon: -0.776333,
    elevationFt: 238,
    timezone: "Europe/London",
    utcOffset: "UTC+0",
    image: "/images/airports/lhr.png",
    servicesCount: 58,
    serviceTags: ["Fuel", "FBO", "Ground"],
    runways: [{ designator: "06/24", lengthFt: 8005, widthFt: 150, surface: "Asphalt", lighting: true, headingDeg: 63, ils: "CAT I" }],
    frequencies: [
      { type: "TWR", description: "Farnborough Tower", mhz: "122.505" },
      { type: "APP", description: "Farnborough Radar", mhz: "125.250" },
    ],
    fireCategory: "CAT 7",
    operatingHours: "07:00–22:00 local",
    customs: true,
    featured: false,
  },
  {
    icao: "EGGW",
    iata: "LTN",
    name: "London Luton Airport",
    shortName: "London Luton",
    city: "Luton",
    region: "Bedfordshire",
    country: "United Kingdom",
    countryCode: "GB",
    continent: "Europe",
    type: "large_airport",
    lat: 51.8747,
    lon: -0.368333,
    elevationFt: 526,
    timezone: "Europe/London",
    utcOffset: "UTC+0",
    image: "/images/airports/lhr.png",
    servicesCount: 72,
    serviceTags: TAGS,
    runways: [{ designator: "07/25", lengthFt: 7087, widthFt: 150, surface: "Asphalt", lighting: true, headingDeg: 72, ils: "CAT IIIa" }],
    frequencies: [{ type: "TWR", description: "Luton Tower", mhz: "126.730" }],
    fireCategory: "CAT 9",
    operatingHours: "24 hours",
    customs: true,
    featured: false,
  },
  {
    icao: "EGKK",
    iata: "LGW",
    name: "London Gatwick Airport",
    shortName: "London Gatwick",
    city: "London",
    region: "West Sussex",
    country: "United Kingdom",
    countryCode: "GB",
    continent: "Europe",
    type: "large_airport",
    lat: 51.1481,
    lon: -0.190278,
    elevationFt: 202,
    timezone: "Europe/London",
    utcOffset: "UTC+0",
    image: "/images/airports/lhr.png",
    servicesCount: 96,
    serviceTags: TAGS,
    runways: [{ designator: "08R/26L", lengthFt: 10879, widthFt: 148, surface: "Asphalt", lighting: true, headingDeg: 78, ils: "CAT IIIb" }],
    frequencies: [{ type: "TWR", description: "Gatwick Tower", mhz: "124.230" }],
    fireCategory: "CAT 10",
    operatingHours: "24 hours",
    customs: true,
    featured: false,
  },
  {
    icao: "OMDW",
    iata: "DWC",
    name: "Al Maktoum International Airport",
    shortName: "Dubai World Central",
    city: "Dubai",
    region: "Jebel Ali, Dubai",
    country: "United Arab Emirates",
    countryCode: "AE",
    continent: "Asia",
    type: "large_airport",
    lat: 24.8964,
    lon: 55.1614,
    elevationFt: 171,
    timezone: "Asia/Dubai",
    utcOffset: "UTC+4",
    image: "/images/airports/dxb.png",
    servicesCount: 48,
    serviceTags: TAGS,
    runways: [{ designator: "12/30", lengthFt: 14764, widthFt: 197, surface: "Asphalt", lighting: true, headingDeg: 120, ils: "CAT IIIb" }],
    frequencies: [{ type: "TWR", description: "Al Maktoum Tower", mhz: "119.550" }],
    fireCategory: "CAT 10",
    operatingHours: "24 hours",
    customs: true,
    featured: false,
  },
  {
    icao: "KTEB",
    iata: "TEB",
    name: "Teterboro Airport",
    shortName: "Teterboro",
    city: "Teterboro",
    region: "New Jersey",
    country: "United States",
    countryCode: "US",
    continent: "North America",
    type: "medium_airport",
    lat: 40.8501,
    lon: -74.0608,
    elevationFt: 9,
    timezone: "America/New_York",
    utcOffset: "UTC-5",
    image: "/images/airports/jfk.png",
    servicesCount: 64,
    serviceTags: ["Fuel", "FBO", "Ground"],
    runways: [
      { designator: "01/19", lengthFt: 7000, widthFt: 150, surface: "Asphalt", lighting: true, headingDeg: 10, ils: "CAT I" },
      { designator: "06/24", lengthFt: 6013, widthFt: 150, surface: "Asphalt", lighting: true, headingDeg: 60, ils: "CAT I" },
    ],
    frequencies: [{ type: "TWR", description: "Teterboro Tower", mhz: "119.500" }],
    fireCategory: "CAT 6",
    operatingHours: "24 hours",
    customs: true,
    featured: false,
  },
  {
    icao: "VABB",
    iata: "BOM",
    name: "Chhatrapati Shivaji Maharaj International Airport",
    shortName: "Mumbai",
    city: "Mumbai",
    region: "Maharashtra",
    country: "India",
    countryCode: "IN",
    continent: "Asia",
    type: "large_airport",
    lat: 19.0887,
    lon: 72.8679,
    elevationFt: 39,
    timezone: "Asia/Kolkata",
    utcOffset: "UTC+5:30",
    image: "/images/airports/sin.png",
    servicesCount: 141,
    serviceTags: TAGS,
    runways: [{ designator: "09/27", lengthFt: 11302, widthFt: 197, surface: "Asphalt", lighting: true, headingDeg: 93, ils: "CAT I" }],
    frequencies: [{ type: "TWR", description: "Mumbai Tower", mhz: "118.100" }],
    fireCategory: "CAT 10",
    operatingHours: "24 hours",
    customs: true,
    featured: false,
  },
];

type NeighbourInput = Pick<
  AirportSeed,
  "icao" | "iata" | "name" | "shortName" | "city" | "region" | "country" | "countryCode" | "continent" | "lat" | "lon" | "elevationFt" | "timezone" | "utcOffset" | "runways"
> &
  Partial<Pick<AirportSeed, "type" | "customs" | "image" | "serviceTags">>;

/** Shorthand for the neighbouring airports below; details staff have not confirmed stay blank. */
function neighbour(a: NeighbourInput): AirportSeed {
  return { type: "large_airport", customs: true, image: "/images/airports/lhr.png", serviceTags: ["Fuel", "Ground"], frequencies: [], fireCategory: "", operatingHours: "", featured: false, ...a };
}
const rwy = (designator: string, lengthFt: number, widthFt: number, headingDeg: number, surface = "Asphalt") => ({ designator, lengthFt, widthFt, surface, lighting: true, headingDeg });

/**
 * Airports near the demo ones, so every airport page has a "Nearby Airport" list.
 * Kept out of AIRPORT_SEED: they are only ever inserted when missing (see seedMissingAirports).
 */
export const NEIGHBOUR_AIRPORT_SEED: AirportSeed[] = [
  // Near Delhi (VIDP)
  neighbour({ icao: "VIJP", iata: "JAI", name: "Jaipur International Airport", shortName: "Jaipur", city: "Jaipur", region: "Rajasthan", country: "India", countryCode: "IN", continent: "Asia", lat: 26.8242, lon: 75.8122, elevationFt: 1263, timezone: "Asia/Kolkata", utcOffset: "UTC+5:30", image: "/images/airports/sin.png", runways: [rwy("08/26", 11483, 148, 87)] }),
  neighbour({ icao: "VICG", iata: "IXC", name: "Chandigarh International Airport", shortName: "Chandigarh", city: "Chandigarh", region: "Chandigarh", country: "India", countryCode: "IN", continent: "Asia", lat: 30.6735, lon: 76.7885, elevationFt: 1012, timezone: "Asia/Kolkata", utcOffset: "UTC+5:30", image: "/images/airports/sin.png", runways: [rwy("11/29", 10400, 150, 110)] }),
  neighbour({ icao: "VIAG", iata: "AGR", name: "Agra Airport", shortName: "Agra", city: "Agra", region: "Uttar Pradesh", country: "India", countryCode: "IN", continent: "Asia", type: "medium_airport", customs: false, lat: 27.1558, lon: 77.9609, elevationFt: 551, timezone: "Asia/Kolkata", utcOffset: "UTC+5:30", image: "/images/airports/sin.png", runways: [rwy("05/23", 9000, 148, 50)] }),
  neighbour({ icao: "VIDX", iata: "HDO", name: "Hindon Airport", shortName: "Hindon", city: "Ghaziabad", region: "Uttar Pradesh", country: "India", countryCode: "IN", continent: "Asia", type: "medium_airport", customs: false, lat: 28.7077, lon: 77.3589, elevationFt: 700, timezone: "Asia/Kolkata", utcOffset: "UTC+5:30", image: "/images/airports/sin.png", runways: [rwy("09/27", 9000, 148, 90)] }),
  // Near Mumbai (VABB)
  neighbour({ icao: "VAPO", iata: "PNQ", name: "Pune International Airport", shortName: "Pune", city: "Pune", region: "Maharashtra", country: "India", countryCode: "IN", continent: "Asia", lat: 18.5822, lon: 73.9197, elevationFt: 1942, timezone: "Asia/Kolkata", utcOffset: "UTC+5:30", image: "/images/airports/sin.png", runways: [rwy("10/28", 8329, 148, 100)] }),
  neighbour({ icao: "VAOZ", iata: "ISK", name: "Nashik Airport", shortName: "Nashik", city: "Nashik", region: "Maharashtra", country: "India", countryCode: "IN", continent: "Asia", type: "medium_airport", customs: false, lat: 20.1191, lon: 73.9129, elevationFt: 1959, timezone: "Asia/Kolkata", utcOffset: "UTC+5:30", image: "/images/airports/sin.png", runways: [rwy("09/27", 9843, 148, 90)] }),
  // Near Paris CDG (LFPG)
  neighbour({ icao: "LFPO", iata: "ORY", name: "Paris Orly Airport", shortName: "Paris Orly", city: "Paris", region: "Île-de-France", country: "France", countryCode: "FR", continent: "Europe", lat: 48.7233, lon: 2.3794, elevationFt: 291, timezone: "Europe/Paris", utcOffset: "UTC+1", image: "/images/airports/cdg.png", runways: [rwy("06/24", 11975, 148, 62, "Concrete"), rwy("08/26", 10892, 148, 75, "Concrete")] }),
  neighbour({ icao: "LFPB", iata: "LBG", name: "Paris–Le Bourget Airport", shortName: "Paris Le Bourget", city: "Paris", region: "Île-de-France", country: "France", countryCode: "FR", continent: "Europe", type: "medium_airport", lat: 48.9694, lon: 2.4414, elevationFt: 218, timezone: "Europe/Paris", utcOffset: "UTC+1", image: "/images/airports/cdg.png", serviceTags: ["Fuel", "FBO", "MRO", "Ground"], runways: [rwy("07/25", 9843, 148, 70), rwy("03/21", 8743, 197, 26)] }),
  // Near Frankfurt (EDDF)
  neighbour({ icao: "EDFH", iata: "HHN", name: "Frankfurt-Hahn Airport", shortName: "Frankfurt-Hahn", city: "Lautzenhausen", region: "Rhineland-Palatinate", country: "Germany", countryCode: "DE", continent: "Europe", type: "medium_airport", lat: 49.9487, lon: 7.2639, elevationFt: 1649, timezone: "Europe/Berlin", utcOffset: "UTC+1", image: "/images/airports/cdg.png", runways: [rwy("03/21", 12467, 148, 30, "Concrete")] }),
  neighbour({ icao: "EDDK", iata: "CGN", name: "Cologne Bonn Airport", shortName: "Cologne Bonn", city: "Cologne", region: "North Rhine-Westphalia", country: "Germany", countryCode: "DE", continent: "Europe", lat: 50.8659, lon: 7.1427, elevationFt: 302, timezone: "Europe/Berlin", utcOffset: "UTC+1", image: "/images/airports/cdg.png", runways: [rwy("14L/32R", 12516, 197, 138)] }),
  neighbour({ icao: "EDDS", iata: "STR", name: "Stuttgart Airport", shortName: "Stuttgart", city: "Stuttgart", region: "Baden-Württemberg", country: "Germany", countryCode: "DE", continent: "Europe", lat: 48.6899, lon: 9.222, elevationFt: 1276, timezone: "Europe/Berlin", utcOffset: "UTC+1", image: "/images/airports/cdg.png", runways: [rwy("07/25", 10974, 148, 73, "Concrete")] }),
  // Near Los Angeles (KLAX)
  neighbour({ icao: "KVNY", iata: "VNY", name: "Van Nuys Airport", shortName: "Van Nuys", city: "Los Angeles", region: "California", country: "United States", countryCode: "US", continent: "North America", type: "medium_airport", lat: 34.2098, lon: -118.49, elevationFt: 802, timezone: "America/Los_Angeles", utcOffset: "UTC-8", image: "/images/airports/jfk.png", serviceTags: ["Fuel", "FBO", "MRO", "Ground"], runways: [rwy("16R/34L", 8001, 150, 175)] }),
  neighbour({ icao: "KBUR", iata: "BUR", name: "Hollywood Burbank Airport", shortName: "Burbank", city: "Burbank", region: "California", country: "United States", countryCode: "US", continent: "North America", type: "medium_airport", customs: false, lat: 34.2007, lon: -118.3587, elevationFt: 778, timezone: "America/Los_Angeles", utcOffset: "UTC-8", image: "/images/airports/jfk.png", runways: [rwy("15/33", 6886, 150, 165), rwy("08/26", 5802, 150, 91)] }),
  neighbour({ icao: "KLGB", iata: "LGB", name: "Long Beach Airport", shortName: "Long Beach", city: "Long Beach", region: "California", country: "United States", countryCode: "US", continent: "North America", type: "medium_airport", customs: false, lat: 33.8177, lon: -118.1516, elevationFt: 60, timezone: "America/Los_Angeles", utcOffset: "UTC-8", image: "/images/airports/jfk.png", runways: [rwy("12/30", 10000, 200, 136)] }),
  // Near Singapore Changi (WSSS)
  neighbour({ icao: "WSSL", iata: "XSP", name: "Seletar Airport", shortName: "Seletar", city: "Singapore", region: "Singapore", country: "Singapore", countryCode: "SG", continent: "Asia", type: "medium_airport", lat: 1.417, lon: 103.868, elevationFt: 36, timezone: "Asia/Singapore", utcOffset: "UTC+8", image: "/images/airports/sin.png", serviceTags: ["Fuel", "FBO", "MRO", "Ground"], runways: [rwy("03/21", 6024, 151, 30)] }),
  neighbour({ icao: "WMKJ", iata: "JHB", name: "Senai International Airport", shortName: "Johor Bahru", city: "Johor Bahru", region: "Johor", country: "Malaysia", countryCode: "MY", continent: "Asia", lat: 1.6413, lon: 103.6696, elevationFt: 135, timezone: "Asia/Kuala_Lumpur", utcOffset: "UTC+8", image: "/images/airports/sin.png", runways: [rwy("16/34", 12467, 148, 160)] }),
  // Near Tokyo Haneda (RJTT)
  neighbour({ icao: "RJAA", iata: "NRT", name: "Narita International Airport", shortName: "Tokyo Narita", city: "Narita", region: "Chiba", country: "Japan", countryCode: "JP", continent: "Asia", lat: 35.7647, lon: 140.3864, elevationFt: 141, timezone: "Asia/Tokyo", utcOffset: "UTC+9", image: "/images/airports/hnd.png", runways: [rwy("16R/34L", 13123, 197, 157), rwy("16L/34R", 8202, 197, 157)] }),
  // Near Rome Fiumicino
  neighbour({ icao: "LIRA", iata: "CIA", name: "Rome Ciampino Airport", shortName: "Rome Ciampino", city: "Rome", region: "Lazio", country: "Italy", countryCode: "IT", continent: "Europe", type: "medium_airport", lat: 41.7994, lon: 12.5949, elevationFt: 427, timezone: "Europe/Rome", utcOffset: "UTC+1", image: "/images/airports/cdg.png", runways: [rwy("15/33", 7244, 154, 150)] }),
];

/**
 * Inserts any demo or neighbouring airport that is not in the database yet and leaves existing
 * ones untouched, so it is safe to run against a database staff have been editing.
 */
export async function seedMissingAirports(): Promise<string[]> {
  const candidates = [...AIRPORT_SEED, ...NEIGHBOUR_AIRPORT_SEED];
  const existing = new Set((await Airport.find({ icao: { $in: candidates.map((c) => c.icao) } }, { icao: 1 }).lean()).map((doc) => doc.icao));
  const added: string[] = [];
  for (const { lat, lon, servicesCount: _derived, ...fields } of candidates) {
    if (existing.has(fields.icao)) continue;
    await new Airport({ ...fields, location: { type: "Point", coordinates: [lon, lat] } }).save();
    added.push(fields.icao);
  }
  logger.info({ added: added.length }, "Seeded missing airports");
  return added;
}

/** Upserts the demo airports by ICAO (idempotent; keeps each airport's derived servicesCount). */
export async function seedAirports(): Promise<number> {
  for (const { lat, lon, servicesCount: _derived, ...fields } of AIRPORT_SEED) {
    const doc = (await Airport.findOne({ icao: fields.icao })) ?? new Airport({ icao: fields.icao });
    doc.set({ ...fields, location: { type: "Point", coordinates: [lon, lat] } });
    await doc.save();
  }
  logger.info({ count: AIRPORT_SEED.length }, "Seeded airports");
  return AIRPORT_SEED.length;
}
