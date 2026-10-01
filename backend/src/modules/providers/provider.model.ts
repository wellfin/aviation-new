import { type HydratedDocument, type InferSchemaType, Schema, type Types, model } from "mongoose";
import { PROVIDER_TIERS } from "../catalog/categories.js";

export const PROVIDER_STATUSES = ["draft", "pending", "published", "rejected", "suspended"] as const;
export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];

export const FLEET_CATEGORIES = ["Light Jet", "Midsize Jet", "Super Midsize Jet", "Heavy Jet", "Ultra Long Range", "Turboprop", "Helicopter"] as const;

const url = { type: String, trim: true, maxlength: 500 };

const serviceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    icon: { type: String, trim: true, maxlength: 40, default: "plane" },
  },
  { _id: false },
);

const certificationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    issuer: { type: String, required: true, trim: true, maxlength: 120 },
    validUntil: { type: String, trim: true, maxlength: 20, default: "" },
    code: { type: String, trim: true, maxlength: 60, default: "" },
  },
  { _id: false },
);

const brochureSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    fileType: { type: String, enum: ["PDF", "DOCX"], default: "PDF" },
    sizeLabel: { type: String, trim: true, maxlength: 20, default: "" },
    url: { ...url, required: true },
  },
  { _id: false },
);

const fleetSchema = new Schema({
  model: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, enum: FLEET_CATEGORIES, required: true },
  seats: { type: Number, required: true, min: 1, max: 600 },
  rangeNm: { type: Number, required: true, min: 0, max: 20_000 },
  speedKts: { type: Number, required: true, min: 0, max: 800 },
  baseIcao: { type: String, uppercase: true, trim: true, match: /^[A-Z0-9]{4}$/ },
  image: { ...url, default: "" },
  yearOfManufacture: { type: Number, min: 1950, max: 2100 },
});

const providerSchema = new Schema(
  {
    slug: { type: String, required: true, lowercase: true, trim: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, maxlength: 120 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    /** The provider account that manages this listing (absent for admin-curated listings). */
    owner: { type: Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: PROVIDER_STATUSES, required: true, default: "draft" },
    rejectionReason: { type: String, trim: true, maxlength: 500 },
    tier: { type: String, enum: PROVIDER_TIERS, required: true, default: "basic" },
    verified: { type: Boolean, default: false },
    /** Slug of an admin-managed ServiceCategory (validated by the services on write). */
    category: { type: String, required: true, lowercase: true, trim: true, maxlength: 60 },
    countryCode: { type: String, required: true, uppercase: true, trim: true, match: /^[A-Z]{2}$/ },
    country: { type: String, required: true, trim: true, maxlength: 80 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    summary: { type: String, required: true, trim: true, maxlength: 300 },
    about: [{ type: String, trim: true, maxlength: 2000 }],
    coverImage: { ...url, default: "" },
    logo: { ...url, default: "" },
    gallery: [url],
    contact: {
      phone: { type: String, trim: true, maxlength: 30, default: "" },
      email: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
      website: { type: String, trim: true, maxlength: 200, default: "" },
      address: { type: String, trim: true, maxlength: 300, default: "" },
      fax: { type: String, trim: true, maxlength: 30 },
      /* Extra contact lines shown on the airport page's provider listing. */
      phone2: { type: String, trim: true, maxlength: 30 },
      email2: { type: String, trim: true, lowercase: true, maxlength: 254 },
      sita: { type: String, trim: true, maxlength: 30 },
      location: { type: String, trim: true, maxlength: 120, default: "" },
    },
    socials: {
      linkedin: url,
      instagram: url,
      facebook: url,
      x: url,
    },
    locationsLabel: { type: String, trim: true, maxlength: 60 },
    services: [serviceSchema],
    airports: [{ type: Schema.Types.ObjectId, ref: "Airport" }],
    /** ICAO + IATA codes of `airports`, denormalised for fast filtering. */
    airportCodes: [{ type: String, uppercase: true }],
    certifications: [certificationSchema],
    brochures: [brochureSchema],
    fleet: [fleetSchema],
    videoUrl: url,
    foundedYear: { type: Number, min: 1900, max: 2100 },
    employees: { type: String, trim: true, maxlength: 20 },
    /** Aggregates of approved reviews (maintained transactionally by the reviews module). */
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

providerSchema.index({ slug: 1 }, { unique: true });
// One listing per provider account (admin-curated listings have no owner).
providerSchema.index({ owner: 1 }, { unique: true, partialFilterExpression: { owner: { $exists: true } } });
providerSchema.index({ airports: 1 });
providerSchema.index({ status: 1, category: 1, tier: -1, rating: -1 });
providerSchema.index({ status: 1, tier: -1, rating: -1 });
providerSchema.index({ status: 1, tier: -1, reviewCount: -1 });
providerSchema.index({ status: 1, tier: -1, publishedAt: -1 });
providerSchema.index({ status: 1, airportCodes: 1 });
providerSchema.index({ status: 1, countryCode: 1 });
providerSchema.index({ name: "text", summary: "text", city: "text", country: "text" }, { weights: { name: 10, city: 3, summary: 1 } });

export type ProviderAttrs = InferSchemaType<typeof providerSchema>;
export type ProviderDoc = HydratedDocument<ProviderAttrs>;
export const Provider = model("Provider", providerSchema);

export interface ProviderAirportRef {
  _id: Types.ObjectId;
  icao: string;
  iata?: string | null;
  shortName: string;
  city: string;
  countryCode: string;
}

export interface ReviewDTO {
  id: string;
  author: string;
  role: string;
  rating: number;
  date: string;
  title: string;
  body: string;
}

type ProviderLike = ProviderAttrs & { _id: Types.ObjectId };

/**
 * Public response shape — matches the frontend `Provider` type exactly.
 * `airports` must be populated with ProviderAirportRef documents.
 */
export function toProviderDTO(p: ProviderLike, opts: { reviews?: ReviewDTO[] } = {}) {
  const airports = (p.airports as unknown as Array<ProviderAirportRef | Types.ObjectId>).filter(
    (a): a is ProviderAirportRef => typeof a === "object" && a !== null && "icao" in a,
  );
  return {
    id: String(p._id),
    slug: p.slug,
    name: p.name,
    tier: p.tier,
    verified: Boolean(p.verified),
    category: p.category,
    countryCode: p.countryCode,
    country: p.country,
    city: p.city,
    rating: Math.round((p.rating ?? 0) * 10) / 10,
    reviewCount: p.reviewCount ?? 0,
    summary: p.summary,
    about: p.about ?? [],
    coverImage: p.coverImage ?? "",
    logo: p.logo ?? "",
    gallery: p.gallery ?? [],
    contact: {
      phone: p.contact?.phone ?? "",
      email: p.contact?.email ?? "",
      website: p.contact?.website ?? "",
      address: p.contact?.address ?? "",
      location: p.contact?.location ?? "",
      ...(p.contact?.fax ? { fax: p.contact.fax } : {}),
      ...(p.contact?.phone2 ? { phone2: p.contact.phone2 } : {}),
      ...(p.contact?.email2 ? { email2: p.contact.email2 } : {}),
      ...(p.contact?.sita ? { sita: p.contact.sita } : {}),
    },
    socials: Object.fromEntries(Object.entries(p.socials ?? {}).filter(([, v]) => typeof v === "string" && v)),
    ...(p.locationsLabel ? { locationsLabel: p.locationsLabel } : {}),
    services: (p.services ?? []).map((s) => ({ name: s.name, description: s.description ?? "", icon: s.icon ?? "plane" })),
    airports: airports.map((a) => ({ icao: a.icao, iata: a.iata ?? "", name: a.shortName, city: a.city, countryCode: a.countryCode })),
    certifications: (p.certifications ?? []).map((c) => ({ name: c.name, issuer: c.issuer, validUntil: c.validUntil ?? "", code: c.code ?? "" })),
    brochures: (p.brochures ?? []).map((b) => ({ title: b.title, fileType: b.fileType ?? "PDF", sizeLabel: b.sizeLabel ?? "", url: b.url })),
    reviews: opts.reviews ?? [],
    fleet: (p.fleet ?? []).map((f) => ({
      id: String((f as { _id?: Types.ObjectId })._id ?? ""),
      model: f.model,
      category: f.category,
      seats: f.seats,
      rangeNm: f.rangeNm,
      speedKts: f.speedKts,
      baseIcao: f.baseIcao ?? "",
      image: f.image ?? "",
      yearOfManufacture: f.yearOfManufacture ?? 0,
    })),
    ...(p.videoUrl ? { videoUrl: p.videoUrl } : {}),
    ...(p.foundedYear ? { foundedYear: p.foundedYear } : {}),
    ...(p.employees ? { employees: p.employees } : {}),
  };
}
export type ProviderDTO = ReturnType<typeof toProviderDTO>;

/** Fields needed to render ProviderAirport refs. */
export const AIRPORT_REF_FIELDS = "icao iata shortName city countryCode";
