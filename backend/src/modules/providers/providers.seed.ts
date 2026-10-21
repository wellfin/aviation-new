import { logger } from "../../lib/logger.js";
import { AIRPORT_SEED } from "../airports/airports.seed.js";
import { Airport } from "../airports/airport.model.js";
import { recountAirportServices } from "../airports/airports.service.js";
import type { CategorySlug, ProviderTier } from "../catalog/categories.js";
import { Provider, type FLEET_CATEGORIES } from "./provider.model.js";
import { resolveAirports } from "./providers.service.js";

/**
 * Demo directory listings (copied from the frontend's mock set). Seeded listings
 * are published and owner-less; rating/reviewCount are the mock aggregates.
 * Image paths are served by the frontend.
 */

const IMG = {
  cabin1: "/images/providers/cabin-1.jpg",
  cabin2: "/images/providers/cabin-2.jpg",
  cabin3: "/images/providers/cabin-3.jpg",
  cabin4: "/images/providers/cabin-4.jpg",
  cabinWide: "/images/providers/cabin-wide.jpg",
  fuel: "/images/providers/fuel-worker.jpg",
  nose: "/images/providers/aircraft-nose.jpg",
  terminal: "/images/airports/lhr.png",
  terminal2: "/images/airports/dxb.png",
  signatureLogo: "/images/providers/signature-logo.png",
};

const COUNTRY: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  CH: "Switzerland",
  DE: "Germany",
  AE: "United Arab Emirates",
  IN: "India",
  FR: "France",
  SG: "Singapore",
  LU: "Luxembourg",
  MT: "Malta",
};

interface FleetSeed {
  model: string;
  category: (typeof FLEET_CATEGORIES)[number];
  seats: number;
  rangeNm: number;
  speedKts: number;
  baseIcao: string;
  image: string;
  yearOfManufacture: number;
  yearOfRefurbishment?: number;
}

export const FLEET: FleetSeed[] = [
  { model: "Gulfstream G650ER", category: "Ultra Long Range", seats: 14, rangeNm: 7500, speedKts: 516, baseIcao: "EGLF", image: IMG.cabin1, yearOfManufacture: 2021, yearOfRefurbishment: 2024 },
  { model: "Bombardier Global 6000", category: "Heavy Jet", seats: 13, rangeNm: 6000, speedKts: 499, baseIcao: "EGLF", image: IMG.cabin2, yearOfManufacture: 2019, yearOfRefurbishment: 2022 },
  { model: "Dassault Falcon 2000LXS", category: "Super Midsize Jet", seats: 10, rangeNm: 4000, speedKts: 482, baseIcao: "EGGW", image: IMG.cabin3, yearOfManufacture: 2020, yearOfRefurbishment: 2023 },
  { model: "Embraer Phenom 300E", category: "Light Jet", seats: 7, rangeNm: 2010, speedKts: 453, baseIcao: "EGKK", image: IMG.cabin4, yearOfManufacture: 2022, yearOfRefurbishment: 2025 },
];

interface Seed {
  slug: string;
  name: string;
  tier: ProviderTier;
  /** Built-in slug, or an admin-created category such as "hotels". */
  category: CategorySlug | "hotels";
  countryCode: string;
  city: string;
  rating: number;
  reviewCount: number;
  summary: string;
  cover: string;
  airports: string[];
  domain: string;
  phone: string;
  locationsLabel?: string;
  verified?: boolean;
  fleet?: boolean;
  /** Optional overrides for the airport-listing contact block (Figma charter operator list). */
  logo?: string;
  address?: string;
  phone2?: string;
  email?: string;
  email2?: string;
}

type ServiceSeed = { name: string; description: string; icon: string };

const SERVICE_TEMPLATES: Record<"default" | "charter", ServiceSeed[]> = {
  default: [
    { name: "Ground Handling", description: "Ramp, baggage and passenger handling for all business aircraft types.", icon: "plane" },
    { name: "Fuel Services", description: "Jet A-1 and Avgas into-plane fuelling with competitive contract pricing.", icon: "fuel" },
    { name: "Crew & Passenger Lounges", description: "Private lounges, showers, rest rooms and conference facilities.", icon: "sofa" },
    { name: "Customs & Immigration", description: "On-site CIQ clearance for a fast, discreet arrival experience.", icon: "shield-check" },
    { name: "Hangarage", description: "Heated hangar space for aircraft up to BBJ / ACJ size.", icon: "warehouse" },
    { name: "Concierge", description: "Hotels, ground transport and in-flight catering arranged 24/7.", icon: "concierge-bell" },
  ],
  charter: [
    { name: "On-demand Charter", description: "Worldwide private jet charter from light jets to VIP airliners.", icon: "plane-takeoff" },
    { name: "Empty Legs", description: "Discounted one-way repositioning flights across Europe.", icon: "tag" },
    { name: "Aircraft Management", description: "Full CAMO, crewing and commercial management for owners.", icon: "settings" },
    { name: "Air Ambulance", description: "Medically equipped aircraft with specialist crews on standby.", icon: "heart-pulse" },
  ],
};

const SEEDS: Seed[] = [
  { slug: "signature-aviation", name: "Signature Aviation", tier: "ultra_pro", category: "fbo", countryCode: "US", city: "Orlando", rating: 4.9, reviewCount: 1284, summary: "World's leading network of FBOs and private aviation services with 200+ global locations.", cover: IMG.cabinWide, airports: ["EGLL", "KJFK", "KTEB", "OMDB", "LFPG", "EGLF"], domain: "signature.aero", phone: "+1 800 SIGNAV", locationsLabel: "200+ Global Locations" },
  { slug: "world-fuel-services", name: "World Fuel Services", tier: "ultra_pro", category: "fuel", countryCode: "US", city: "Miami", rating: 4.8, reviewCount: 967, summary: "Global leader in aviation fuel supply and energy management with operations in 200+ countries.", cover: IMG.fuel, airports: ["KJFK", "KLAX", "EGLL", "OMDB", "WSSS"], domain: "wfscorp.com", phone: "+1 305 428 8000", locationsLabel: "8,000+ Airports" },
  { slug: "jet-aviation", name: "Jet Aviation", tier: "ultra_pro", category: "fbo", countryCode: "CH", city: "Basel", rating: 4.8, reviewCount: 842, summary: "Premium FBO, MRO and completions group serving business aviation since 1967.", cover: IMG.cabin2, airports: ["LFPG", "EDDF", "OMDB", "WSSS", "KTEB"], domain: "jetaviation.com", phone: "+41 58 158 1111", locationsLabel: "50+ Locations" },
  { slug: "gate-gourmet", name: "Gate Gourmet", tier: "pro", category: "catering", countryCode: "CH", city: "Zurich", rating: 4.6, reviewCount: 511, summary: "World's leading network of in-flight catering kitchens for airlines and business aviation.", cover: IMG.terminal, airports: ["EGLL", "LFPG", "EDDF", "KJFK"], domain: "gategourmet.com", phone: "+41 44 568 1111" },
  { slug: "execujet", name: "ExecuJet", tier: "pro", category: "fbo", countryCode: "AE", city: "Dubai", rating: 4.7, reviewCount: 388, summary: "Luxaviation group FBO network with premium terminals across the Middle East, Asia and Europe.", cover: IMG.cabin3, airports: ["OMDB", "OMDW", "WSSS", "EGGW"], domain: "execujet.com", phone: "+971 4 601 6000" },
  { slug: "tag-aviation", name: "TAG Aviation", tier: "pro", category: "charter-operator", countryCode: "CH", city: "Geneva", rating: 4.7, reviewCount: 276, summary: "Aircraft management, charter and maintenance for private jet owners worldwide.", cover: IMG.cabin4, airports: ["EGLF", "LFPG", "EDDF"], domain: "tagaviation.com", phone: "+41 22 717 0000", fleet: true },
  { slug: "universal-weather", name: "Universal Weather & Aviation", tier: "ultra_pro", category: "trip-support", countryCode: "US", city: "Houston", rating: 4.9, reviewCount: 1012, summary: "End-to-end trip support: permits, handling, weather and 24/7 flight operations support.", cover: IMG.cabinWide, airports: ["KJFK", "KLAX", "EGLL", "OMDB", "VIDP"], domain: "universalweather.com", phone: "+1 713 944 1622", locationsLabel: "Global Coverage" },
  { slug: "dnata", name: "dnata", tier: "ultra_pro", category: "ground-handler", countryCode: "AE", city: "Dubai", rating: 4.7, reviewCount: 733, summary: "One of the world's largest air services providers: ground handling, cargo, catering and travel.", cover: IMG.terminal2, airports: ["OMDB", "OMDW", "EGLL", "WSSS"], domain: "dnata.com", phone: "+971 4 316 6666", locationsLabel: "35 Countries" },
  { slug: "indamer-mjets", name: "INDAMER MJETS Airport Services", tier: "pro", category: "ground-handler", countryCode: "IN", city: "New Delhi", rating: 4.5, reviewCount: 198, summary: "Premium general aviation terminal and ground handling at India's busiest gateway.", cover: IMG.terminal, airports: ["VIDP", "VABB"], domain: "indamermjets.com", phone: "+91 11 4583 0046" },
  { slug: "british-charter-group", name: "British Charter Group", tier: "ultra_pro", category: "charter-operator", countryCode: "GB", city: "Farnborough", rating: 4.8, reviewCount: 312, summary: "UK-based AOC holder operating a modern fleet of heavy and long-range business jets.", cover: IMG.cabin1, airports: ["EGLF", "EGGW", "EGKK"], domain: "britishchartergroup.aero", phone: "+44 1252 550 700", fleet: true },
  { slug: "air-charter-service", name: "Air Charter Service", tier: "pro", category: "charter-broker", countryCode: "GB", city: "London", rating: 4.6, reviewCount: 455, summary: "Global charter broker arranging private jets, airliners and cargo aircraft since 1990.", cover: IMG.cabin2, airports: ["EGLL", "EGKK", "KJFK", "OMDB"], domain: "aircharterservice.com", phone: "+44 20 8339 8588", fleet: true },
  { slug: "hunt-and-palmer", name: "Hunt & Palmer", tier: "basic", category: "charter-broker", countryCode: "GB", city: "Crawley", rating: 4.4, reviewCount: 87, summary: "Independent aircraft charter broker specialising in group and VIP travel.", cover: IMG.nose, airports: ["EGKK"], domain: "huntandpalmer.com", phone: "+44 1293 804 800", fleet: true },
  { slug: "jetsupport-mro", name: "Jetsupport MRO", tier: "basic", category: "mro", countryCode: "DE", city: "Munich", rating: 4.3, reviewCount: 64, summary: "EASA Part-145 line and base maintenance for Embraer, Dassault and Bombardier jets.", cover: IMG.nose, airports: ["EDDF"], domain: "jetsupport-mro.de", phone: "+49 89 9700 1200" },
  { slug: "luxaviation", name: "Luxaviation", tier: "pro", category: "charter-operator", countryCode: "LU", city: "Luxembourg", rating: 4.6, reviewCount: 241, summary: "One of the largest business aviation operators, with a managed fleet of 260+ aircraft.", cover: IMG.cabin3, airports: ["LFPG", "EDDF", "EGLF"], domain: "luxaviation.com", phone: "+352 42 52 52 1", fleet: true },
  { slug: "jetex", name: "Jetex", tier: "pro", category: "trip-support", countryCode: "AE", city: "Dubai", rating: 4.7, reviewCount: 389, summary: "Global FBO network and flight support provider with award-winning executive terminals.", cover: IMG.cabin4, airports: ["OMDW", "LFPG", "WSSS"], domain: "jetex.com", phone: "+971 4 212 4900" },
  { slug: "swissport", name: "Swissport", tier: "pro", category: "ground-handler", countryCode: "CH", city: "Opfikon", rating: 4.4, reviewCount: 356, summary: "World's largest provider of airport ground services and air cargo handling.", cover: IMG.terminal2, airports: ["EGLL", "EDDF", "KJFK"], domain: "swissport.com", phone: "+41 43 815 0000" },
  { slug: "menzies-aviation", name: "Menzies Aviation", tier: "basic", category: "fuel", countryCode: "GB", city: "London", rating: 4.2, reviewCount: 142, summary: "Into-plane fuelling, ground and cargo services at 200+ airports.", cover: IMG.fuel, airports: ["EGLL", "EGKK"], domain: "menziesaviation.com", phone: "+44 20 8750 6000" },
  { slug: "rocket-route-permits", name: "RocketRoute Permits", tier: "basic", category: "permit", countryCode: "GB", city: "London", rating: 4.3, reviewCount: 58, summary: "Overflight and landing permits processed in 190+ countries with same-day turnaround.", cover: IMG.nose, airports: ["EGLL"], domain: "rocketroute.com", phone: "+44 20 3290 1000" },
  { slug: "blacklane-aviation", name: "Blacklane Aviation Chauffeurs", tier: "basic", category: "ground-transportation", countryCode: "DE", city: "Berlin", rating: 4.5, reviewCount: 120, summary: "Airside and landside chauffeur transfers for crew and passengers in 50+ countries.", cover: IMG.terminal, airports: ["EDDF", "EGLL", "LFPG"], domain: "blacklane.com", phone: "+49 30 2089 8620" },
  { slug: "skyline-supervision", name: "Skyline Supervision", tier: "basic", category: "supervisory-agent", countryCode: "IN", city: "Mumbai", rating: 4.1, reviewCount: 34, summary: "Independent supervisory agents overseeing third-party handling on behalf of operators.", cover: IMG.terminal2, airports: ["VABB", "VIDP"], domain: "skylinesupervision.in", phone: "+91 22 6685 1100" },
  { slug: "vip-meet-assist", name: "VIP Meet & Assist", tier: "pro", category: "meet-and-assist", countryCode: "SG", city: "Singapore", rating: 4.6, reviewCount: 172, summary: "Fast-track arrivals, lounge access and personal escorts through the terminal.", cover: IMG.terminal, airports: ["WSSS", "OMDB", "EGLL"], domain: "vipmeetassist.com", phone: "+65 6542 1122" },
  { slug: "harrods-aviation", name: "Harrods Aviation", tier: "pro", category: "fbo", countryCode: "GB", city: "London", rating: 4.8, reviewCount: 298, summary: "Luxury FBO and maintenance services at London Luton and Stansted.", cover: IMG.cabin1, airports: ["EGGW"], domain: "harrodsaviation.com", phone: "+44 1582 424 426" },
  { slug: "air-bp", name: "Air BP", tier: "pro", category: "fuel", countryCode: "GB", city: "Sunbury", rating: 4.5, reviewCount: 402, summary: "Aviation fuels, lubricants and low-carbon SAF supplied at 800+ locations.", cover: IMG.fuel, airports: ["EGLL", "OMDB", "LFPG", "KLAX"], domain: "airbp.com", phone: "+44 20 7496 4000" },
  { slug: "do-co-catering", name: "DO & CO Catering", tier: "basic", category: "catering", countryCode: "FR", city: "Paris", rating: 4.4, reviewCount: 76, summary: "Gourmet in-flight catering for private jets and premium airline cabins.", cover: IMG.cabin2, airports: ["LFPG"], domain: "doco.com", phone: "+33 1 4862 1200" },
];

/**
 * Extra demo FBOs so an airport's FBO list shows all three plans together (Ultra Pro, Pro, Basic),
 * e.g. London Heathrow and Dubai. Fictional companies. Kept out of SEEDS: they are only inserted
 * when missing (seedMissingProviders), never overwritten.
 */
/** Every demo airport (main and neighbouring). */
const NETWORK = ["EGLL", "OMDB", "LFPG", "KJFK", "WSSS", "FCOA", "RJTT", "EDDF", "EGGW", "EGKK", "EGLF", "VIDP", "KLAX", "OMDW", "KTEB", "VABB", "EDDK", "EDDS", "EDFH", "KBUR", "KLGB", "KVNY", "LFPB", "LFPO", "LIRA", "RJAA", "VAOZ", "VAPO", "VIAG", "VICG", "VIDX", "VIJP", "WMKJ", "WSSL"];

export const DEMO_TIER_SEEDS: Seed[] = [
  { slug: "skyport-executive-fbo", name: "Skyport Executive FBO", tier: "pro", category: "fbo", countryCode: "GB", city: "London", rating: 4.6, reviewCount: 187, summary: "Private terminal, crew lounge and ramp services for business aviation at Heathrow and Dubai.", cover: IMG.cabin3, airports: ["EGLL", "OMDB"], domain: "skyportfbo.example", phone: "+44 20 8750 2200" },
  { slug: "westway-jet-centre", name: "Westway Jet Centre", tier: "basic", category: "fbo", countryCode: "GB", city: "London", rating: 4.2, reviewCount: 41, summary: "Independent FBO offering handling, fuel coordination and passenger lounge access.", cover: IMG.terminal, airports: ["EGLL"], domain: "westwayjet.example", phone: "+44 20 8750 3300" },
  { slug: "crown-aviation-services", name: "Crown Aviation Services", tier: "basic", category: "fbo", countryCode: "GB", city: "London", rating: 4.0, reviewCount: 27, summary: "Compact FBO for light and midsize jets with 24-hour ramp support.", cover: IMG.cabin4, airports: ["EGLL", "EGGW"], domain: "crownaviation.example", phone: "+44 20 8750 4400" },
  // Network listings (fictional) covering every demo airport, so each "Airport Services" row has a provider.
  { slug: "aerohub-fbo-network", name: "AeroHub FBO Network", tier: "pro", category: "fbo", countryCode: "AE", city: "Dubai", rating: 4.5, reviewCount: 214, summary: "Network of executive terminals and general aviation lounges at major airports worldwide.", cover: IMG.cabin2, airports: NETWORK, domain: "aerohubfbo.example", phone: "+971 4 220 6600", locationsLabel: "34 locations worldwide" },
  { slug: "skyserve-ground-handling", name: "SkyServe Ground Handling", tier: "basic", category: "ground-handler", countryCode: "GB", city: "London", rating: 4.2, reviewCount: 88, summary: "Ramp, baggage and passenger handling for business and commercial flights.", cover: IMG.terminal, airports: NETWORK, domain: "skyservehandling.example", phone: "+44 20 8750 5500" },
  { slug: "jetfuel-direct", name: "JetFuel Direct", tier: "basic", category: "fuel", countryCode: "GB", city: "London", rating: 4.1, reviewCount: 63, summary: "Jet A-1 into-plane fuelling with contract pricing for business aviation.", cover: IMG.fuel, airports: NETWORK, domain: "jetfueldirect.example", phone: "+44 20 8750 6600" },
  { slug: "cloud-kitchen-catering", name: "Cloud Kitchen Aviation Catering", tier: "basic", category: "catering", countryCode: "FR", city: "Paris", rating: 4.3, reviewCount: 52, summary: "Made-to-order in-flight catering delivered to the aircraft.", cover: IMG.cabin1, airports: NETWORK, domain: "cloudkitchenair.example", phone: "+33 1 4862 3300" },
  { slug: "aerofix-mro", name: "AeroFix MRO", tier: "pro", category: "mro", countryCode: "DE", city: "Frankfurt", rating: 4.6, reviewCount: 131, summary: "Line and AOG maintenance for visiting business jets and turboprops.", cover: IMG.nose, airports: NETWORK, domain: "aerofixmro.example", phone: "+49 69 6900 4400" },
  { slug: "crew-rest-hotels", name: "Crew Rest Hotels", tier: "basic", category: "hotels", countryCode: "SG", city: "Singapore", rating: 4.2, reviewCount: 74, summary: "Transit and crew hotels at or next to the airport, bookable 24/7.", cover: IMG.terminal2, airports: NETWORK, domain: "crewresthotels.example", phone: "+65 6542 3300" },
  { slug: "airlink-executive-transfers", name: "AirLink Executive Transfers", tier: "basic", category: "ground-transportation", countryCode: "US", city: "New York", rating: 4.3, reviewCount: 96, summary: "Chauffeured cars and crew transfers from the aircraft steps.", cover: IMG.cabin4, airports: NETWORK, domain: "airlinktransfers.example", phone: "+1 212 555 0140" },
  // Charter operators and brokers (fictional) so the charter search results fill several pages.
  { slug: "skybridge-charter", name: "SkyBridge Charter", tier: "pro", category: "charter-operator", countryCode: "GB", city: "London", rating: 4.6, reviewCount: 142, summary: "Private jet charter from London: light to heavy jets for business and leisure trips.", cover: IMG.cabin1, airports: ["EGLL", "EGGW", "EGLF"], domain: "skybridgecharter.example", phone: "+44 20 8750 7100", fleet: true },
  { slug: "falconair-charter", name: "FalconAir Charter", tier: "basic", category: "charter-operator", countryCode: "AE", city: "Dubai", rating: 4.3, reviewCount: 58, summary: "Private jet charter from Dubai: light to heavy jets for business and leisure trips.", cover: IMG.cabin2, airports: ["OMDB", "OMDW"], domain: "falconaircharter.example", phone: "+971 4 220 7100", fleet: true },
  { slug: "indus-jet-charter", name: "Indus Jet Charter", tier: "basic", category: "charter-operator", countryCode: "IN", city: "New Delhi", rating: 4.2, reviewCount: 41, summary: "Private jet charter from New Delhi: light to heavy jets for business and leisure trips.", cover: IMG.cabin3, airports: ["VIDP", "VABB"], domain: "indusjetcharter.example", phone: "+91 11 4583 7100", fleet: true },
  { slug: "coastal-wings-aviation", name: "Coastal Wings Aviation", tier: "basic", category: "charter-operator", countryCode: "US", city: "Los Angeles", rating: 4.1, reviewCount: 37, summary: "Private jet charter from Los Angeles: light to heavy jets for business and leisure trips.", cover: IMG.cabin4, airports: ["KLAX", "KVNY"], domain: "coastalwingsaviation.example", phone: "+1 310 555 0171", fleet: true },
  { slug: "atlantic-air-charter", name: "Atlantic Air Charter", tier: "basic", category: "charter-operator", countryCode: "US", city: "New York", rating: 4.3, reviewCount: 66, summary: "Private jet charter from New York: light to heavy jets for business and leisure trips.", cover: IMG.nose, airports: ["KJFK", "KTEB"], domain: "atlanticaircharter.example", phone: "+1 212 555 0172", fleet: true },
  { slug: "alpine-jet-services", name: "Alpine Jet Services", tier: "basic", category: "charter-operator", countryCode: "CH", city: "Geneva", rating: 4.4, reviewCount: 49, summary: "Private jet charter from Geneva: light to heavy jets for business and leisure trips.", cover: IMG.cabinWide, airports: ["LFPG", "LFPB"], domain: "alpinejetservices.example", phone: "+41 22 555 7100", fleet: true },
  { slug: "rhein-air-charter", name: "Rhein Air Charter", tier: "basic", category: "charter-operator", countryCode: "DE", city: "Frankfurt", rating: 4.0, reviewCount: 29, summary: "Private jet charter from Frankfurt: light to heavy jets for business and leisure trips.", cover: IMG.cabin1, airports: ["EDDF", "EDDK"], domain: "rheinaircharter.example", phone: "+49 69 6900 7100", fleet: true },
  { slug: "lion-city-charter", name: "Lion City Charter", tier: "basic", category: "charter-operator", countryCode: "SG", city: "Singapore", rating: 4.2, reviewCount: 33, summary: "Private jet charter from Singapore: light to heavy jets for business and leisure trips.", cover: IMG.cabin2, airports: ["WSSS", "WSSL"], domain: "lioncitycharter.example", phone: "+65 6542 7100", fleet: true },
  { slug: "rising-sun-aviation", name: "Rising Sun Aviation", tier: "basic", category: "charter-operator", countryCode: "JP", city: "Tokyo", rating: 4.1, reviewCount: 22, summary: "Private jet charter from Tokyo: light to heavy jets for business and leisure trips.", cover: IMG.cabin3, airports: ["RJTT", "RJAA"], domain: "risingsunaviation.example", phone: "+81 3 5555 7100", fleet: true },
  { slug: "roma-executive-air", name: "Roma Executive Air", tier: "basic", category: "charter-operator", countryCode: "IT", city: "Rome", rating: 4.0, reviewCount: 18, summary: "Private jet charter from Rome: light to heavy jets for business and leisure trips.", cover: IMG.cabin4, airports: ["LIRA"], domain: "romaexecutiveair.example", phone: "+39 06 5555 7100", fleet: true },
  { slug: "gateway-private-jets", name: "Gateway Private Jets", tier: "basic", category: "charter-operator", countryCode: "IN", city: "Mumbai", rating: 4.2, reviewCount: 44, summary: "Private jet charter from Mumbai: light to heavy jets for business and leisure trips.", cover: IMG.nose, airports: ["VABB", "VAPO"], domain: "gatewayprivatejets.example", phone: "+91 22 6685 7100", fleet: true },
  { slug: "sahara-sky-charter", name: "Sahara Sky Charter", tier: "basic", category: "charter-operator", countryCode: "AE", city: "Dubai", rating: 3.9, reviewCount: 21, summary: "Private jet charter from Dubai: light to heavy jets for business and leisure trips.", cover: IMG.cabinWide, airports: ["OMDW"], domain: "saharaskycharter.example", phone: "+971 4 220 7200", fleet: true },
  { slug: "thames-executive-jets", name: "Thames Executive Jets", tier: "basic", category: "charter-operator", countryCode: "GB", city: "Luton", rating: 4.1, reviewCount: 27, summary: "Private jet charter from Luton: light to heavy jets for business and leisure trips.", cover: IMG.cabin1, airports: ["EGGW", "EGKK"], domain: "thamesexecutivejets.example", phone: "+44 1582 555 710", fleet: true },
  { slug: "pacific-crest-air", name: "Pacific Crest Air", tier: "basic", category: "charter-operator", countryCode: "US", city: "Long Beach", rating: 4.0, reviewCount: 19, summary: "Private jet charter from Long Beach: light to heavy jets for business and leisure trips.", cover: IMG.cabin2, airports: ["KLGB", "KBUR"], domain: "pacificcrestair.example", phone: "+1 562 555 0173", fleet: true },
  { slug: "jetconnect-brokers", name: "JetConnect Brokers", tier: "pro", category: "charter-broker", countryCode: "GB", city: "London", rating: 4.5, reviewCount: 121, summary: "Charter brokerage in London sourcing the right aircraft from vetted operators worldwide.", cover: IMG.cabin1, airports: ["EGLL", "EGKK"], domain: "jetconnectbrokers.example", phone: "+44 20 8750 7300", fleet: true },
  { slug: "aircharter-match", name: "AirCharter Match", tier: "basic", category: "charter-broker", countryCode: "AE", city: "Dubai", rating: 4.2, reviewCount: 38, summary: "Charter brokerage in Dubai sourcing the right aircraft from vetted operators worldwide.", cover: IMG.cabin2, airports: ["OMDB"], domain: "airchartermatch.example", phone: "+971 4 220 7300", fleet: true },
  { slug: "skyquote-charter-brokers", name: "SkyQuote Charter Brokers", tier: "basic", category: "charter-broker", countryCode: "US", city: "New York", rating: 4.1, reviewCount: 31, summary: "Charter brokerage in New York sourcing the right aircraft from vetted operators worldwide.", cover: IMG.cabin3, airports: ["KJFK", "KTEB"], domain: "skyquotecharterbrokers.example", phone: "+1 212 555 0174", fleet: true },
  { slug: "indiflight-brokers", name: "IndiFlight Brokers", tier: "basic", category: "charter-broker", countryCode: "IN", city: "New Delhi", rating: 4.0, reviewCount: 24, summary: "Charter brokerage in New Delhi sourcing the right aircraft from vetted operators worldwide.", cover: IMG.cabin4, airports: ["VIDP"], domain: "indiflightbrokers.example", phone: "+91 11 4583 7300", fleet: true },
  { slug: "eurojet-brokerage", name: "EuroJet Brokerage", tier: "basic", category: "charter-broker", countryCode: "FR", city: "Paris", rating: 4.2, reviewCount: 35, summary: "Charter brokerage in Paris sourcing the right aircraft from vetted operators worldwide.", cover: IMG.nose, airports: ["LFPG", "LFPB"], domain: "eurojetbrokerage.example", phone: "+33 1 4862 7300", fleet: true },
  { slug: "asia-air-brokers", name: "Asia Air Brokers", tier: "basic", category: "charter-broker", countryCode: "SG", city: "Singapore", rating: 4.0, reviewCount: 17, summary: "Charter brokerage in Singapore sourcing the right aircraft from vetted operators worldwide.", cover: IMG.cabinWide, airports: ["WSSS"], domain: "asiaairbrokers.example", phone: "+65 6542 7300", fleet: true },
  // Permit providers (fictional) at every demo airport: the airport page's Permit list (Ultra Pro, then Pro).
  { slug: "globalpermit-solutions", name: "GlobalPermit Solutions", tier: "ultra_pro", category: "permit", countryCode: "GB", city: "London", rating: 4.9, reviewCount: 412, summary: "Overflight and landing permits in 190+ countries, typically secured within 24 hours.", cover: IMG.cabin1, airports: NETWORK, domain: "globalpermit.example", phone: "+44 20 8750 8100" },
  { slug: "skyclear-permits", name: "SkyClear Permits", tier: "ultra_pro", category: "permit", countryCode: "AE", city: "Dubai", rating: 4.8, reviewCount: 296, summary: "Round-the-clock permit desk for overflight, landing and diplomatic clearances.", cover: IMG.nose, airports: NETWORK, domain: "skyclearpermits.example", phone: "+971 4 220 8100" },
  { slug: "aeroclear-international", name: "AeroClear International", tier: "ultra_pro", category: "permit", countryCode: "US", city: "Houston", rating: 4.8, reviewCount: 233, summary: "Permits, slots and parking approvals for business aviation flights worldwide.", cover: IMG.cabin2, airports: NETWORK, domain: "aeroclear.example", phone: "+1 713 555 0181" },
  { slug: "permitpro-aviation", name: "PermitPro Aviation", tier: "pro", category: "permit", countryCode: "CH", city: "Geneva", rating: 4.6, reviewCount: 148, summary: "Landing and overflight permits for European, Middle East and African routes.", cover: IMG.terminal, airports: NETWORK, domain: "permitpro.example", phone: "+41 22 555 8100" },
  { slug: "flightclear-services", name: "FlightClear Services", tier: "pro", category: "permit", countryCode: "IN", city: "New Delhi", rating: 4.5, reviewCount: 117, summary: "Indian and South Asian overflight and landing permits with 24/7 operations support.", cover: IMG.cabin3, airports: NETWORK, domain: "flightclear.example", phone: "+91 11 4583 8100" },
  { slug: "rapid-permits-worldwide", name: "Rapid Permits Worldwide", tier: "pro", category: "permit", countryCode: "SG", city: "Singapore", rating: 4.5, reviewCount: 96, summary: "Fast-turnaround permits across Asia-Pacific for private and charter flights.", cover: IMG.terminal2, airports: NETWORK, domain: "rapidpermits.example", phone: "+65 6542 8100" },
  // Charter brokers (fictional) at every demo airport: the airport page's Charter Broker list (all plans).
  { slug: "elite-jet-brokers", name: "Elite Jet Brokers", tier: "ultra_pro", category: "charter-broker", countryCode: "GB", city: "London", rating: 4.9, reviewCount: 388, summary: "Premium charter brokerage sourcing light to ultra-long-range jets from vetted operators worldwide.", cover: IMG.cabin1, airports: NETWORK, domain: "elitejetbrokers.example", phone: "+44 20 8750 9100", fleet: true },
  { slug: "luxwing-charter-brokers", name: "LuxWing Charter Brokers", tier: "ultra_pro", category: "charter-broker", countryCode: "AE", city: "Dubai", rating: 4.8, reviewCount: 274, summary: "VIP and corporate charter brokerage with 24/7 quotes and on-trip support.", cover: IMG.cabinWide, airports: NETWORK, domain: "luxwing.example", phone: "+971 4 220 9100", fleet: true },
  { slug: "skyquote-global", name: "SkyQuote Global", tier: "pro", category: "charter-broker", countryCode: "US", city: "Miami", rating: 4.6, reviewCount: 152, summary: "Charter brokerage comparing quotes from hundreds of operators for every mission.", cover: IMG.cabin2, airports: NETWORK, domain: "skyquoteglobal.example", phone: "+1 305 555 0191", fleet: true },
  { slug: "aerolink-brokerage", name: "AeroLink Brokerage", tier: "pro", category: "charter-broker", countryCode: "CH", city: "Zurich", rating: 4.5, reviewCount: 108, summary: "European charter brokerage for business, leisure and group flights.", cover: IMG.cabin3, airports: NETWORK, domain: "aerolinkbrokerage.example", phone: "+41 44 555 9100", fleet: true },
  { slug: "jetfinder-brokers", name: "JetFinder Brokers", tier: "basic", category: "charter-broker", countryCode: "IN", city: "Mumbai", rating: 4.2, reviewCount: 46, summary: "Charter brokerage for private jets and helicopters across India and the Gulf.", cover: IMG.nose, airports: NETWORK, domain: "jetfinder.example", phone: "+91 22 6685 9100", fleet: true },
  { slug: "openair-charter-brokers", name: "OpenAir Charter Brokers", tier: "basic", category: "charter-broker", countryCode: "SG", city: "Singapore", rating: 4.1, reviewCount: 29, summary: "Charter brokerage for Asia-Pacific trips, empty legs and group charters.", cover: IMG.cabin4, airports: NETWORK, domain: "openaircharter.example", phone: "+65 6542 9100", fleet: true },
  // Charter operators (fictional) at every demo airport, drawn like the design's airport listing: wordmark logo,
  // full address, two phones and two emails (Ultra Pro, Pro), then Basic listings with contacts on request.
  { slug: "ajets-airport-services", name: "AJETS Airport Services Pvt Ltd", tier: "ultra_pro", category: "charter-operator", countryCode: "IN", city: "New Delhi", rating: 4.9, reviewCount: 214, summary: "Private jet charter and airport services from New Delhi: light to heavy jets for business and leisure trips.", cover: IMG.cabin1, airports: NETWORK, domain: "ajets.example", phone: "+91 11 4583 0046", phone2: "+91 96540 12545", email: "charter@ajets.example", email2: "ops@ajets.example", address: "Room 24A, Ground Floor, Terminal 1D, IGI Airport, New Delhi, 110037", logo: "/images/providers/logos/ajets.png", fleet: true },
  { slug: "njets-aviation", name: "NJETS Aviation Pvt Ltd", tier: "ultra_pro", category: "charter-operator", countryCode: "IN", city: "Mumbai", rating: 4.8, reviewCount: 167, summary: "Private jet and helicopter charter from Mumbai with 24/7 operations.", cover: IMG.cabinWide, airports: NETWORK, domain: "njets.example", phone: "+91 22 6685 0046", phone2: "+91 98200 31245", email: "charter@njets.example", email2: "ops@njets.example", address: "Hangar 4, General Aviation Terminal, CSMI Airport, Mumbai, 400099", logo: "/images/providers/logos/njets.png", fleet: true },
  { slug: "ojets-airport-services", name: "OJETS Airport Services Pvt Ltd", tier: "pro", category: "charter-operator", countryCode: "IN", city: "Bengaluru", rating: 4.6, reviewCount: 98, summary: "Business jet charter from Bengaluru for corporate and leisure travel.", cover: IMG.cabin2, airports: NETWORK, domain: "ojets.example", phone: "+91 80 4120 0046", phone2: "+91 99001 22545", email: "charter@ojets.example", email2: "ops@ojets.example", address: "Office 12, GA Terminal, Kempegowda International Airport, Bengaluru, 560300", logo: "/images/providers/logos/ojets.png", fleet: true },
  { slug: "kjets-charter", name: "KJETS Charter Pvt Ltd", tier: "pro", category: "charter-operator", countryCode: "IN", city: "Hyderabad", rating: 4.5, reviewCount: 76, summary: "Light and midsize jet charter from Hyderabad across India and the Gulf.", cover: IMG.cabin3, airports: NETWORK, domain: "kjets.example", phone: "+91 40 6650 0046", phone2: "+91 90000 42545", email: "charter@kjets.example", email2: "ops@kjets.example", address: "Unit 7, Business Aviation Terminal, RGI Airport, Hyderabad, 500409", logo: "/images/providers/logos/kjets.png", fleet: true },
  { slug: "zenith-air-charter", name: "Zenith Air Charter Pvt Ltd", tier: "basic", category: "charter-operator", countryCode: "IN", city: "New Delhi", rating: 4.2, reviewCount: 31, summary: "Turboprop and light jet charter from New Delhi.", cover: IMG.nose, airports: NETWORK, domain: "zenithaircharter.example", phone: "+91 11 4583 0146", address: "Room 18, First Floor, Terminal 1D, IGI Airport, New Delhi, 110037", fleet: true },
  { slug: "horizon-jet-charters", name: "Horizon Jet Charters Pvt Ltd", tier: "basic", category: "charter-operator", countryCode: "IN", city: "Ahmedabad", rating: 4.1, reviewCount: 22, summary: "Regional jet charter from Ahmedabad for business trips.", cover: IMG.cabin4, airports: NETWORK, domain: "horizonjetcharters.example", phone: "+91 79 2286 0046", address: "Office 3, GA Terminal, SVPI Airport, Ahmedabad, 382475", fleet: true },
  { slug: "desert-falcon-fbo", name: "Desert Falcon FBO", tier: "basic", category: "fbo", countryCode: "AE", city: "Dubai", rating: 4.1, reviewCount: 35, summary: "Business aviation handling and VIP lounge at Dubai International.", cover: IMG.terminal2, airports: ["OMDB"], domain: "desertfalcon.example", phone: "+971 4 220 5500" },
];

const airportShortName = (icao: string | undefined) => AIRPORT_SEED.find((a) => a.icao === icao)?.shortName;

/** Mirrors the frontend mock's `build()` so the seeded directory looks identical. */
function build(seed: Seed, index: number) {
  const isCharter = seed.category === "charter-operator" || seed.category === "charter-broker";
  const country = COUNTRY[seed.countryCode] ?? seed.countryCode;
  return {
    name: seed.name,
    tier: seed.tier,
    verified: seed.verified ?? seed.tier !== "basic",
    category: seed.category,
    countryCode: seed.countryCode,
    country,
    city: seed.city,
    rating: seed.rating,
    reviewCount: seed.reviewCount,
    summary: seed.summary,
    about: [
      `${seed.name} is ${seed.summary.charAt(0).toLowerCase()}${seed.summary.slice(1).replace(/\.+$/, "")}.`,
      "Our teams operate around the clock to deliver safe, efficient and discreet service to business aviation operators, owners and their passengers. Every location is staffed by trained professionals who understand the demands of on-time private flight operations.",
      "We hold industry-leading safety accreditations and continuously invest in our facilities, equipment and people to exceed the expectations of the world's most demanding flight departments.",
    ],
    coverImage: seed.cover,
    logo: seed.logo ?? (seed.slug === "signature-aviation" ? IMG.signatureLogo : ""),
    gallery: [IMG.cabin1, IMG.cabin2, IMG.fuel, IMG.nose, IMG.cabin3, IMG.cabin4],
    contact: {
      phone: seed.phone,
      phone2: seed.phone2,
      email: seed.email ?? `ops@${seed.domain}`,
      email2: seed.email2,
      website: seed.domain,
      address: seed.address ?? `${seed.city}, ${country}`,
      fax: seed.tier === "basic" ? undefined : seed.phone.replace(/\d$/, "1"),
      location: airportShortName(seed.airports[0]) ?? seed.city,
    },
    socials:
      seed.tier === "basic"
        ? {}
        : {
            linkedin: `https://www.linkedin.com/company/${seed.slug}`,
            instagram: `https://www.instagram.com/${seed.slug.replace(/-/g, "")}`,
            facebook: `https://www.facebook.com/${seed.slug.replace(/-/g, "")}`,
            x: `https://x.com/${seed.slug.replace(/-/g, "")}`,
          },
    locationsLabel: seed.locationsLabel,
    services: isCharter ? SERVICE_TEMPLATES.charter : SERVICE_TEMPLATES.default,
    certifications: [
      { name: "IS-BAH Stage III", issuer: "IBAC", validUntil: "2027-11-30", code: "ISBAH-3-20931" },
      { name: "ISO 9001:2015", issuer: "Bureau Veritas", validUntil: "2027-04-15", code: "ISO9001-UK-44120" },
      ...(isCharter ? [{ name: "Air Operator Certificate", issuer: "UK CAA", validUntil: "2028-01-31", code: "GB-2291" }] : []),
      { name: "ARGUS Platinum", issuer: "ARGUS International", validUntil: "2027-06-01", code: "ARG-P-8812" },
    ],
    brochures: [
      { title: `${seed.name} — Company Profile`, fileType: "PDF" as const, sizeLabel: "2.4 MB", url: "#" },
      { title: "Services & Rates 2026", fileType: "PDF" as const, sizeLabel: "1.1 MB", url: "#" },
    ],
    fleet: seed.fleet ? FLEET : [],
    videoUrl: seed.tier === "ultra_pro" ? "https://www.youtube.com/embed/1La4QzGeaaQ" : undefined,
    foundedYear: 1992 + (index % 25),
    employees: seed.tier === "basic" ? "11–50" : seed.tier === "pro" ? "51–200" : "1,000+",
  };
}

/**
 * Upserts the demo listings by slug (run after seedAirports). Existing fleet
 * entries are replaced on re-run; airport service counts are recomputed.
 */
export async function seedProviders(): Promise<number> {
  const touched = new Set<string>();
  const now = Date.now();
  for (const [index, seed] of SEEDS.entries()) {
    const { ids, codes } = await resolveAirports(seed.airports);
    const doc = (await Provider.findOne({ slug: seed.slug })) ?? new Provider({ slug: seed.slug });
    // Stagger publication dates so "newest" ordering is deterministic.
    doc.set({ ...build(seed, index), airports: ids, airportCodes: codes, status: "published", owner: undefined });
    doc.publishedAt ??= new Date(now - (SEEDS.length - index) * 60_000);
    await doc.save();
    seed.airports.forEach((c) => touched.add(c));
  }
  await recountAirportServices([...touched]);
  logger.info({ count: SEEDS.length }, "Seeded providers");
  return SEEDS.length;
}

/**
 * Inserts the DEMO_TIER_SEEDS listings that are not in the database yet and leaves every existing
 * listing untouched, so it is safe to run against a database staff have been editing.
 */
export async function seedMissingProviders(): Promise<string[]> {
  const existing = new Set((await Provider.find({ slug: { $in: DEMO_TIER_SEEDS.map((s) => s.slug) } }, { slug: 1 }).lean()).map((p) => p.slug));
  const added: string[] = [];
  const touched = new Set<string>();
  for (const [index, seed] of DEMO_TIER_SEEDS.entries()) {
    if (existing.has(seed.slug)) continue;
    // Network listings name every demo airport; attach only the ones this database has.
    const present = new Set((await Airport.find({ icao: { $in: seed.airports } }, { icao: 1 }).lean()).map((x) => x.icao));
    const airports = seed.airports.filter((c) => present.has(c));
    if (airports.length === 0) continue;
    const { ids, codes } = await resolveAirports(airports);
    await new Provider({ slug: seed.slug, ...build(seed, SEEDS.length + index), airports: ids, airportCodes: codes, status: "published", publishedAt: new Date() }).save();
    airports.forEach((c) => touched.add(c));
    added.push(seed.slug);
  }
  if (touched.size) await recountAirportServices([...touched]);
  logger.info({ added: added.length }, "Seeded missing demo providers");
  return added;
}
