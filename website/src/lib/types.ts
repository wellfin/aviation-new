/**
 * Domain types shared by the UI, the mock data layer and (later) the backend API contract.
 * Keep these aligned with /api/v1 response shapes.
 */

export type ProviderTier = "basic" | "pro" | "ultra_pro";

/**
 * Service categories are admin-managed data (GET /api/v1/categories), so a slug is
 * any string. "charter-operator" and "charter-broker" keep special behaviour (fleet).
 */
export type ServiceCategorySlug = string;

export interface ServiceCategory {
  slug: ServiceCategorySlug;
  name: string;
  /** Long name used on profile headers, e.g. "Fixed Base Operator". */
  longName: string;
  /** lucide-react icon name. */
  icon: string;
  emoji: string;
  description?: string;
  /** Shown in the header "Services" menu and as a directory filter pill. */
  showInMenu: boolean;
  /** Number of published providers (from GET /categories). */
  providerCount?: number;
}

export interface ContactInfo {
  phone: string;
  email: string;
  website: string;
  address: string;
  fax?: string;
  location: string;
}

export interface SocialLinks {
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  x?: string;
}

export interface ProviderService {
  name: string;
  description: string;
  icon: string;
}

export interface ProviderAirport {
  icao: string;
  iata: string;
  name: string;
  city: string;
  countryCode: string;
}

export interface Certification {
  name: string;
  issuer: string;
  validUntil: string;
  code: string;
}

export interface Brochure {
  title: string;
  fileType: "PDF" | "DOCX";
  sizeLabel: string;
  url: string;
}

export interface Review {
  id: string;
  author: string;
  role: string;
  rating: number;
  date: string;
  title: string;
  body: string;
}

export interface FleetAircraft {
  id: string;
  model: string;
  category: "Light Jet" | "Midsize Jet" | "Super Midsize Jet" | "Heavy Jet" | "Ultra Long Range" | "Turboprop" | "Helicopter";
  seats: number;
  rangeNm: number;
  speedKts: number;
  baseIcao: string;
  image: string;
  yearOfManufacture: number;
}

export interface Provider {
  id: string;
  slug: string;
  name: string;
  tier: ProviderTier;
  verified: boolean;
  category: ServiceCategorySlug;
  countryCode: string;
  country: string;
  city: string;
  rating: number;
  reviewCount: number;
  summary: string;
  about: string[];
  coverImage: string;
  logo: string;
  gallery: string[];
  contact: ContactInfo;
  socials: SocialLinks;
  locationsLabel?: string;
  services: ProviderService[];
  airports: ProviderAirport[];
  certifications: Certification[];
  brochures: Brochure[];
  reviews: Review[];
  fleet: FleetAircraft[];
  videoUrl?: string;
  foundedYear?: number;
  employees?: string;
}

export type ProviderSort = "rating" | "reviews" | "name" | "newest";

export interface ProviderQuery {
  q?: string;
  category?: ServiceCategorySlug | "all";
  tier?: ProviderTier | "all";
  country?: string;
  airport?: string;
  sort?: ProviderSort;
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Runway {
  designator: string;
  lengthFt: number;
  widthFt: number;
  surface: string;
  lighting: boolean;
  headingDeg: number;
  ils?: string;
}

export interface Frequency {
  type: string;
  description: string;
  mhz: string;
}

export interface Airport {
  icao: string;
  iata: string;
  name: string;
  shortName: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  continent: string;
  type: "large_airport" | "medium_airport" | "small_airport";
  lat: number;
  lon: number;
  elevationFt: number;
  timezone: string;
  utcOffset: string;
  image: string;
  servicesCount: number;
  serviceTags: string[];
  runways: Runway[];
  frequencies: Frequency[];
  fireCategory: string;
  operatingHours: string;
  /* Optional operational details (admin-managed), shown under "More Airport Information". */
  trafficPermitted?: string;
  lightIntensity?: string;
  deicing?: string;
  airportCategory?: string;
  slotsRequired?: string;
  website?: string;
  /* Facilities shown on the "Airport Services" tab (admin-managed). */
  cargoHandling?: string;
  hangarSpace?: string;
  restaurants?: string;
  medicalFacilities?: string;
  customs: boolean;
  featured: boolean;
}

export interface NewsArticle {
  slug: string;
  title: string;
  excerpt: string;
  category: NewsCategory;
  image: string;
  publishedAt: string;
  author: string;
  authorRole: string;
  readMinutes: number;
  featured: boolean;
  body: string[];
}

export type NewsCategory = "Industry News" | "FBO Network" | "Regulatory" | "Fuel" | "Technology" | "Business Aviation";

export interface PricingPlan {
  id: "basic" | "pro" | "ultra_pro" | "enterprise";
  name: string;
  tagline: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  highlighted: boolean;
  features: string[];
  cta: string;
}

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface Advertisement {
  id: string;
  placement: "header-banner" | "sidebar" | "sponsored-strip" | "sticky-footer" | "inline";
  advertiser: string;
  headline?: string;
  body?: string;
  image: string;
  href: string;
  cta?: string;
  /** API mode: counts the click and redirects to `href` — use it as the link target when present. */
  clickUrl?: string;
}

/* ---------- Aviation tool results (third-party integrations) ---------- */

export type FlightCategory = "VFR" | "MVFR" | "IFR" | "LIFR";

export interface MetarReport {
  icao: string;
  raw: string;
  observedAt: string;
  flightCategory: FlightCategory;
  windDirDeg: number | null;
  windSpeedKt: number;
  windGustKt: number | null;
  visibility: string;
  temperatureC: number;
  dewpointC: number;
  altimeterHpa: number;
  clouds: Array<{ cover: string; baseFt: number }>;
  conditions: string[];
}

export interface TafReport {
  icao: string;
  raw: string;
  issuedAt: string;
  validFrom: string;
  validTo: string;
  periods: Array<{
    from: string;
    to: string;
    change: "FM" | "TEMPO" | "BECMG" | "PROB30" | "PROB40" | "BASE";
    summary: string;
  }>;
}

export type NotamSeverity = "critical" | "warning" | "info";

export interface Notam {
  id: string;
  icao: string;
  number: string;
  type: string;
  severity: NotamSeverity;
  subject: string;
  text: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface NearbyAirport {
  airport: Airport;
  distanceKm: number;
  bearingDeg: number;
}
