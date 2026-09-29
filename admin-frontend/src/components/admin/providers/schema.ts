import { z } from "zod";
import type { Provider } from "@/lib/types";

/** Mirrors backend/src/modules/providers/providers.schemas.ts (admin create/update). The API re-validates. */

export const PROVIDER_TIERS = ["basic", "pro", "ultra_pro"] as const;
export const PROVIDER_STATUSES = ["draft", "pending", "published", "rejected", "suspended"] as const;
export const FLEET_CATEGORIES = ["Light Jet", "Midsize Jet", "Super Midsize Jet", "Heavy Jet", "Ultra Long Range", "Turboprop", "Helicopter"] as const;

export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];

export const TIER_LABEL: Record<(typeof PROVIDER_TIERS)[number], string> = { basic: "Basic", pro: "Pro", ultra_pro: "Ultra Pro" };

export interface AdminProvider extends Provider {
  status: ProviderStatus;
  rejectionReason: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  limits: { galleryImages: number; video: boolean; socials: boolean };
  owner: { id: string; email: string; name: string } | null;
}

/** Allowed source statuses per moderation action (same table as the backend's TRANSITIONS). */
export const TRANSITIONS = {
  approve: ["draft", "pending", "rejected", "suspended"],
  reject: ["pending"],
  suspend: ["published"],
  unpublish: ["published", "suspended"],
} as const satisfies Record<string, readonly ProviderStatus[]>;

export type ProviderAction = keyof typeof TRANSITIONS;

export function canTransition(action: ProviderAction, status: ProviderStatus): boolean {
  return (TRANSITIONS[action] as readonly ProviderStatus[]).includes(status);
}

const text = (max: number) => z.string().trim().max(max, `At most ${max} characters`);
const assetUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^\/[^/]/.test(v) || /^https?:\/\/[^\s]+$/i.test(v), "Use a site path (/images/…) or an http(s) URL");
const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/i.test(v), "Use a full https:// URL");
const icao = z.string().trim().regex(/^[A-Za-z0-9]{4}$/, "Enter a 4-character ICAO code");
const int = (min: number, max: number, label = "a whole number") =>
  z.number({ error: "Required" }).int(`Enter ${label}`).min(min, `Minimum ${min}`).max(max, `Maximum ${max}`);

export const providerSchema = z.object({
  name: text(120).min(2, "Enter at least 2 characters"),
  slug: z
    .string()
    .trim()
    .max(120)
    .regex(/^([a-z0-9]+(?:-[a-z0-9]+)*)?$/, "Use lowercase letters, numbers and hyphens")
    .optional(),
  category: z.string().trim().min(1, "Choose a category").max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Choose a category"),
  countryCode: z.string().trim().regex(/^[A-Za-z]{2}$/, "Enter a 2-letter country code"),
  country: text(80).min(2, "Enter the country"),
  city: text(80).min(1, "Enter the city"),
  summary: text(300).min(10, "Write at least 10 characters"),
  about: z.array(text(2000).min(1, "Remove empty paragraphs")).max(10),
  coverImage: assetUrl,
  logo: assetUrl,
  gallery: z.array(assetUrl.refine((v) => v !== "", "Required")).max(30, "At most 30 images"),
  contact: z.object({
    phone: z
      .string()
      .trim()
      .max(30)
      .regex(/^[+\d\s().A-Za-z-]*$/, "Enter a valid phone number"),
    email: z.union([z.email("Enter a valid email").max(254), z.literal("")]),
    website: text(200),
    address: text(300),
    fax: text(30),
    location: text(120),
  }),
  socials: z.object({ linkedin: httpsUrl, instagram: httpsUrl, facebook: httpsUrl, x: httpsUrl }),
  locationsLabel: text(60),
  services: z
    .array(
      z.object({
        name: text(80).min(1, "Required"),
        description: text(500).optional(),
        icon: z
          .string()
          .trim()
          .regex(/^[a-z0-9-]{1,40}$/, "Use a lowercase icon name like plane or fuel")
          .optional(),
      }),
    )
    .max(30),
  airports: z.array(icao).max(50, "At most 50 airports"),
  certifications: z
    .array(
      z.object({
        name: text(120).min(1, "Required"),
        issuer: text(120).min(1, "Required"),
        validUntil: z
          .string()
          .trim()
          .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Use YYYY-MM-DD")
          .optional(),
        code: text(60).optional(),
      }),
    )
    .max(20),
  brochures: z
    .array(
      z.object({
        title: text(150).min(1, "Required"),
        fileType: z.enum(["PDF", "DOCX"]),
        sizeLabel: text(20).optional(),
        url: assetUrl.refine((v) => v !== "", "Upload a file or enter its URL"),
      }),
    )
    .max(20),
  fleet: z
    .array(
      z.object({
        id: z.string().optional(),
        model: text(100).min(1, "Required"),
        category: z.enum(FLEET_CATEGORIES),
        seats: int(1, 600),
        rangeNm: int(0, 20_000),
        speedKts: int(0, 800),
        baseIcao: z.union([icao, z.literal("")]).optional(),
        image: assetUrl.optional(),
        yearOfManufacture: int(1950, 2100, "a year").optional(),
      }),
    )
    .max(50),
  videoUrl: httpsUrl,
  foundedYear: int(1900, 2100, "a year").nullable(),
  employees: text(20),
  tier: z.enum(PROVIDER_TIERS),
  verified: z.boolean(),
  ownerEmail: z.union([z.email("Enter a valid email").max(254), z.literal("")]),
  status: z.enum(["draft", "published"]).optional(),
});

export type ProviderPayload = z.infer<typeof providerSchema>;

/* ─────────────── Editor state (strings for number inputs) ─────────────── */

export interface ServiceRow {
  name: string;
  description: string;
  icon: string;
}
export interface CertRow {
  name: string;
  issuer: string;
  validUntil: string;
  code: string;
}
export interface BrochureRow {
  title: string;
  fileType: "PDF" | "DOCX";
  sizeLabel: string;
  url: string;
}
export interface FleetRow {
  id: string;
  model: string;
  category: (typeof FLEET_CATEGORIES)[number];
  seats: string;
  rangeNm: string;
  speedKts: string;
  baseIcao: string;
  image: string;
  yearOfManufacture: string;
}
export interface AirportChip {
  icao: string;
  label: string;
}

export interface ProviderFormState {
  name: string;
  slug: string;
  category: string;
  countryCode: string;
  country: string;
  city: string;
  summary: string;
  about: string[];
  coverImage: string;
  logo: string;
  gallery: string[];
  contact: { phone: string; email: string; website: string; address: string; fax: string; location: string };
  socials: { linkedin: string; instagram: string; facebook: string; x: string };
  locationsLabel: string;
  services: ServiceRow[];
  airports: AirportChip[];
  certifications: CertRow[];
  brochures: BrochureRow[];
  fleet: FleetRow[];
  videoUrl: string;
  foundedYear: string;
  employees: string;
  tier: (typeof PROVIDER_TIERS)[number];
  verified: boolean;
  ownerEmail: string;
  status: "draft" | "published";
}

export function emptyProviderState(): ProviderFormState {
  return {
    name: "",
    slug: "",
    category: "",
    countryCode: "",
    country: "",
    city: "",
    summary: "",
    about: [],
    coverImage: "",
    logo: "",
    gallery: [],
    contact: { phone: "", email: "", website: "", address: "", fax: "", location: "" },
    socials: { linkedin: "", instagram: "", facebook: "", x: "" },
    locationsLabel: "",
    services: [],
    airports: [],
    certifications: [],
    brochures: [],
    fleet: [],
    videoUrl: "",
    foundedYear: "",
    employees: "",
    tier: "basic",
    verified: false,
    ownerEmail: "",
    status: "draft",
  };
}

export function stateFromProvider(p: AdminProvider): ProviderFormState {
  return {
    name: p.name,
    slug: p.slug,
    category: p.category,
    countryCode: p.countryCode,
    country: p.country,
    city: p.city,
    summary: p.summary,
    about: p.about,
    coverImage: p.coverImage,
    logo: p.logo,
    gallery: p.gallery,
    contact: { phone: p.contact.phone, email: p.contact.email, website: p.contact.website, address: p.contact.address, fax: p.contact.fax ?? "", location: p.contact.location },
    socials: { linkedin: p.socials.linkedin ?? "", instagram: p.socials.instagram ?? "", facebook: p.socials.facebook ?? "", x: p.socials.x ?? "" },
    locationsLabel: p.locationsLabel ?? "",
    services: p.services.map((s) => ({ name: s.name, description: s.description, icon: s.icon })),
    airports: p.airports.map((a) => ({ icao: a.icao, label: [a.iata, a.name].filter(Boolean).join(" · ") })),
    certifications: p.certifications.map((c) => ({ ...c })),
    brochures: p.brochures.map((b) => ({ ...b })),
    fleet: p.fleet.map((f) => ({
      id: f.id,
      model: f.model,
      category: f.category,
      seats: String(f.seats),
      rangeNm: String(f.rangeNm),
      speedKts: String(f.speedKts),
      baseIcao: f.baseIcao,
      image: f.image,
      yearOfManufacture: f.yearOfManufacture ? String(f.yearOfManufacture) : "",
    })),
    videoUrl: p.videoUrl ?? "",
    foundedYear: p.foundedYear ? String(p.foundedYear) : "",
    employees: p.employees ?? "",
    tier: p.tier,
    verified: p.verified,
    ownerEmail: p.owner?.email ?? "",
    status: "draft",
  };
}

const num = (v: string): number | undefined => (v.trim() === "" ? undefined : Number(v));
const opt = (v: string): string | undefined => (v.trim() === "" ? undefined : v);

/** Converts editor state into the raw request body (validated by `providerSchema`). */
export function rawPayload(s: ProviderFormState, mode: "create" | "edit"): Record<string, unknown> {
  return {
    name: s.name,
    ...(s.slug.trim() ? { slug: s.slug } : {}),
    category: s.category,
    countryCode: s.countryCode,
    country: s.country,
    city: s.city,
    summary: s.summary,
    about: s.about,
    coverImage: s.coverImage,
    logo: s.logo,
    gallery: s.gallery,
    contact: s.contact,
    socials: s.socials,
    locationsLabel: s.locationsLabel,
    services: s.services.map((x) => ({ name: x.name, description: x.description, icon: opt(x.icon) })),
    airports: s.airports.map((a) => a.icao),
    certifications: s.certifications.map((c) => ({ ...c })),
    brochures: s.brochures.map((b) => ({ ...b })),
    fleet: s.fleet.map((f) => ({
      ...(f.id ? { id: f.id } : {}),
      model: f.model,
      category: f.category,
      seats: num(f.seats),
      rangeNm: num(f.rangeNm),
      speedKts: num(f.speedKts),
      baseIcao: f.baseIcao.toUpperCase(),
      image: f.image,
      yearOfManufacture: num(f.yearOfManufacture),
    })),
    videoUrl: s.videoUrl,
    foundedYear: num(s.foundedYear) ?? null,
    employees: s.employees,
    tier: s.tier,
    verified: s.verified,
    ownerEmail: s.ownerEmail,
    ...(mode === "create" ? { status: s.status } : {}),
  };
}

/** Final request body: create omits a blank owner; edit sends null to unassign. */
export function requestBody(p: ProviderPayload, mode: "create" | "edit"): Record<string, unknown> {
  const { ownerEmail, ...rest } = p;
  if (mode === "create") return ownerEmail ? { ...rest, ownerEmail } : rest;
  const edit: Partial<typeof rest> = { ...rest };
  delete edit.status;
  return { ...edit, ownerEmail: ownerEmail || null };
}
