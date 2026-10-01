/**
 * Domain types shared by the UI, the mock data layer and (later) the backend API contract.
 * Keep these aligned with /api/v1 response shapes.
 */

export type ProviderTier = "basic" | "pro" | "ultra_pro";

export type ServiceCategorySlug =
  | "fbo"
  | "ground-handler"
  | "trip-support"
  | "permit"
  | "fuel"
  | "catering"
  | "ground-transportation"
  | "charter-operator"
  | "charter-broker"
  | "supervisory-agent"
  | "mro"
  | "meet-and-assist";

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
  /* Optional details shown when the runway row is expanded on the airport page. */
  pcn?: string;
  coordinates?: string;
  elevation?: string;
  displacedThreshold?: string;
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
  /* Shown on the Fire/RFFS tab. */
  rescueEquipment?: string;
  disabledAircraftRemoval?: string;
  /* Optional operational details shown under "More Airport Information". */
  trafficPermitted: string;
  lightIntensity: string;
  deicing: string;
  airportCategory: string;
  slotsRequired: string;
  website: string;
  /** Runway diagram / airport chart shown on the Runways tab. */
  runwayDiagram?: string;
  /* Facilities shown on the airport page's "Airport Services" tab. */
  cargoHandling: string;
  hangarSpace: string;
  restaurants: string;
  medicalFacilities: string;
  customs: boolean;
  featured: boolean;
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
