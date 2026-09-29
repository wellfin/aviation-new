import type { FleetAircraft, Provider, ProviderAirport, Review, ServiceCategorySlug } from "@/lib/types";
import { AIRPORTS } from "./airports";

/**
 * Demo directory data. Used only while DATA_SOURCE=mock.
 * Mirrors the shape the /api/v1/providers endpoints will return.
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

function airportRefs(...icaos: string[]): ProviderAirport[] {
  return icaos
    .map((icao) => AIRPORTS.find((a) => a.icao === icao))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .map((a) => ({ icao: a.icao, iata: a.iata, name: a.shortName, city: a.city, countryCode: a.countryCode }));
}

const REVIEW_POOL: Omit<Review, "id">[] = [
  {
    author: "Capt. James Henderson",
    role: "Chief Pilot, Gulfstream G650",
    rating: 5,
    date: "2026-08-14",
    title: "Seamless turnaround",
    body: "Fuel, catering and customs were ready before we shut down. The crew lounge is excellent and the team handled a late slot change without fuss.",
  },
  {
    author: "Sarah Mitchell",
    role: "Flight Operations Manager",
    rating: 5,
    date: "2026-07-29",
    title: "Reliable 24/7 support",
    body: "We route most of our European trips through them. Quotes come back within the hour and the ops desk always picks up.",
  },
  {
    author: "Rahul Verma",
    role: "Director of Aviation, Private Office",
    rating: 4,
    date: "2026-07-02",
    title: "Great service, busy apron",
    body: "Professional staff and quick handling. Ramp was congested during peak hours but the team kept us informed throughout.",
  },
  {
    author: "Elena Rossi",
    role: "Cabin Crew Lead",
    rating: 5,
    date: "2026-06-18",
    title: "Catering was spot on",
    body: "Special dietary requests were delivered exactly as ordered and beautifully presented. Will book again.",
  },
];

function reviews(seed: number): Review[] {
  return REVIEW_POOL.map((r, i) => ({ ...r, id: `rv-${seed}-${i}` }));
}

const FLEET: FleetAircraft[] = [
  { id: "ac-1", model: "Gulfstream G650ER", category: "Ultra Long Range", seats: 14, rangeNm: 7500, speedKts: 516, baseIcao: "EGLF", image: IMG.cabin1, yearOfManufacture: 2021 },
  { id: "ac-2", model: "Bombardier Global 6000", category: "Heavy Jet", seats: 13, rangeNm: 6000, speedKts: 499, baseIcao: "EGLF", image: IMG.cabin2, yearOfManufacture: 2019 },
  { id: "ac-3", model: "Dassault Falcon 2000LXS", category: "Super Midsize Jet", seats: 10, rangeNm: 4000, speedKts: 482, baseIcao: "EGGW", image: IMG.cabin3, yearOfManufacture: 2020 },
  { id: "ac-4", model: "Embraer Phenom 300E", category: "Light Jet", seats: 7, rangeNm: 2010, speedKts: 453, baseIcao: "EGKK", image: IMG.cabin4, yearOfManufacture: 2022 },
];

interface Seed {
  slug: string;
  name: string;
  tier: Provider["tier"];
  category: ServiceCategorySlug;
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
}

const SERVICE_TEMPLATES: Record<string, Provider["services"]> = {
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

function build(seed: Seed, index: number): Provider {
  const isCharter = seed.category === "charter-operator" || seed.category === "charter-broker";
  return {
    id: `prv_${String(index + 1).padStart(4, "0")}`,
    slug: seed.slug,
    name: seed.name,
    tier: seed.tier,
    verified: seed.verified ?? seed.tier !== "basic",
    category: seed.category,
    countryCode: seed.countryCode,
    country: COUNTRY[seed.countryCode] ?? seed.countryCode,
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
    logo: seed.slug === "signature-aviation" ? IMG.signatureLogo : "",
    gallery: [IMG.cabin1, IMG.cabin2, IMG.fuel, IMG.nose, IMG.cabin3, IMG.cabin4],
    contact: {
      phone: seed.phone,
      email: `ops@${seed.domain}`,
      website: seed.domain,
      address: `${seed.city}, ${COUNTRY[seed.countryCode] ?? seed.countryCode}`,
      fax: seed.tier === "basic" ? undefined : seed.phone.replace(/\d$/, "1"),
      location: AIRPORTS.find((a) => a.icao === seed.airports[0])?.shortName ?? seed.city,
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
    airports: airportRefs(...seed.airports),
    certifications: [
      { name: "IS-BAH Stage III", issuer: "IBAC", validUntil: "2027-11-30", code: "ISBAH-3-20931" },
      { name: "ISO 9001:2015", issuer: "Bureau Veritas", validUntil: "2027-04-15", code: "ISO9001-UK-44120" },
      ...(isCharter ? [{ name: "Air Operator Certificate", issuer: "UK CAA", validUntil: "2028-01-31", code: "GB-2291" }] : []),
      { name: "ARGUS Platinum", issuer: "ARGUS International", validUntil: "2027-06-01", code: "ARG-P-8812" },
    ],
    brochures: [
      { title: `${seed.name} — Company Profile`, fileType: "PDF", sizeLabel: "2.4 MB", url: "#" },
      { title: "Services & Rates 2026", fileType: "PDF", sizeLabel: "1.1 MB", url: "#" },
    ],
    reviews: reviews(index),
    fleet: seed.fleet ? FLEET : [],
    videoUrl: seed.tier === "ultra_pro" ? "https://www.youtube.com/embed/1La4QzGeaaQ" : undefined,
    foundedYear: 1992 + (index % 25),
    employees: seed.tier === "basic" ? "11–50" : seed.tier === "pro" ? "51–200" : "1,000+",
  };
}

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

export const PROVIDERS: Provider[] = SEEDS.map(build);
