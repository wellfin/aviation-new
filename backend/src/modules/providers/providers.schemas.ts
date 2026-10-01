import { z } from "zod";
import { isObjectId } from "../../lib/db.js";
import { paginationQuery } from "../../lib/pagination.js";
import { airportCode, countryCode, icaoCode } from "../airports/airports.schemas.js";
import { PROVIDER_TIERS } from "../catalog/categories.js";
import { categorySlug } from "../categories/category.schemas.js";
import { FLEET_CATEGORIES, PROVIDER_STATUSES } from "./provider.model.js";

const text = (max: number) => z.string().trim().max(max);
const objectIdString = z.string().refine(isObjectId, "Invalid id");

/** Site-relative path (served by the frontend/uploads) or an absolute http(s) URL; "" clears it. */
const assetUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^\/[^/]/.test(v) || /^https?:\/\/[^\s]+$/i.test(v), "Use a site path (/images/…) or an http(s) URL");

/** Absolute https URL, or "" to clear. */
const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/i.test(v), "Use a full https:// URL");

export const slugParams = z.object({ slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug").max(120) });
export const idParams = z.object({ id: objectIdString });

/* ------------------------------------------------------------ public -- */

export const PROVIDER_SORTS = ["rating", "reviews", "name", "newest"] as const;

export const listProvidersQuery = paginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  /** "all" or a category slug (unknown slugs simply match nothing). */
  category: z.union([z.literal("all"), categorySlug]).default("all"),
  tier: z.enum([...PROVIDER_TIERS, "all"]).default("all"),
  country: countryCode.optional(),
  airport: airportCode.optional(),
  sort: z.enum(PROVIDER_SORTS).default("rating"),
  pageSize: z.coerce.number().int().min(1).max(100).default(9),
});
export type ListProvidersQuery = z.infer<typeof listProvidersQuery>;

export const relatedQuery = z.object({ limit: z.coerce.number().int().min(1).max(12).default(4) });

/* ---------------------------------------------------- editable fields -- */

const service = z.object({
  name: text(80).min(1),
  description: text(500).optional(),
  icon: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{1,40}$/, "Use a lowercase icon name like plane or fuel")
    .optional(),
});

const certification = z.object({
  name: text(120).min(1),
  issuer: text(120).min(1),
  validUntil: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Use YYYY-MM-DD")
    .optional(),
  code: text(60).optional(),
});

const brochure = z.object({
  title: text(150).min(1),
  fileType: z.enum(["PDF", "DOCX"]).default("PDF"),
  sizeLabel: text(20).optional(),
  url: assetUrl.refine((v) => v !== "", "Required"),
});

const fleetItem = z.object({
  /** Existing aircraft keep their id so enquiries that reference it stay valid. */
  id: objectIdString.optional(),
  model: text(100).min(1),
  category: z.enum(FLEET_CATEGORIES),
  seats: z.number().int().min(1).max(600),
  rangeNm: z.number().int().min(0).max(20_000),
  speedKts: z.number().int().min(0).max(800),
  baseIcao: z.union([icaoCode, z.literal("")]).optional(),
  image: assetUrl.optional(),
  yearOfManufacture: z.number().int().min(1950).max(2100).optional(),
});

const contact = z
  .object({
    phone: z
      .string()
      .trim()
      .max(30)
      .regex(/^[+\d\s().A-Za-z-]*$/, "Enter a valid phone number"),
    email: z.union([z.email("Enter a valid email").max(254), z.literal("")]),
    website: text(200),
    address: text(300),
    fax: text(30),
    phone2: z
      .string()
      .trim()
      .max(30)
      .regex(/^[+\d\s().A-Za-z-]*$/, "Enter a valid phone number"),
    email2: z.union([z.email("Enter a valid email").max(254), z.literal("")]),
    sita: text(30),
    location: text(120),
  })
  .partial();

const socials = z.object({ linkedin: httpsUrl, instagram: httpsUrl, facebook: httpsUrl, x: httpsUrl }).partial();

/** Fields a listing owner may edit — never tier, verification, status, rating or ownership. */
export const editableFields = {
  name: text(120).min(2),
  /** Validated against the live catalogue in the service layer. */
  category: categorySlug,
  countryCode,
  country: text(80).min(2),
  city: text(80).min(1),
  summary: text(300).min(10),
  about: z.array(text(2000).min(1)).max(10),
  coverImage: assetUrl,
  logo: assetUrl,
  gallery: z.array(assetUrl.refine((v) => v !== "", "Required")).max(30),
  contact,
  socials,
  locationsLabel: text(60),
  services: z.array(service).max(30),
  airports: z.array(icaoCode).max(50),
  certifications: z.array(certification).max(20),
  brochures: z.array(brochure).max(20),
  fleet: z.array(fleetItem).max(50),
  videoUrl: httpsUrl,
  foundedYear: z.number().int().min(1900).max(2100).nullable(),
  employees: text(20),
};

const editableObject = z.object(editableFields);
export type EditableListingInput = Partial<z.infer<typeof editableObject>>;

const nonEmpty = (v: object) => Object.values(v).some((x) => x !== undefined);

export const createListingBody = editableObject.partial().required({
  name: true,
  category: true,
  countryCode: true,
  country: true,
  city: true,
  summary: true,
});
export type CreateListingInput = z.infer<typeof createListingBody>;

export const updateListingBody = editableObject.partial().refine(nonEmpty, "Nothing to update");

/* ------------------------------------------------------------- admin -- */

const staffFields = {
  tier: z.enum(PROVIDER_TIERS),
  verified: z.boolean(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens")
    .max(120),
};

export const adminCreateBody = createListingBody.extend({
  ...z.object(staffFields).partial().shape,
  /** Existing PROVIDER account that should manage this listing. */
  ownerEmail: z.email().max(254).toLowerCase().optional(),
  status: z.enum(["draft", "published"]).default("draft"),
});
export type AdminCreateInput = z.infer<typeof adminCreateBody>;

export const adminUpdateBody = z
  .object({ ...editableFields, ...staffFields, ownerEmail: z.email().max(254).toLowerCase().nullable() })
  .partial()
  .refine(nonEmpty, "Nothing to update");
export type AdminUpdateInput = z.infer<typeof adminUpdateBody>;

export const adminListQuery = paginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(PROVIDER_STATUSES).optional(),
  category: categorySlug.optional(),
  tier: z.enum(PROVIDER_TIERS).optional(),
  sort: z.enum(["newest", "oldest", "updated", "name", "rating"]).default("newest"),
});
export type AdminListQuery = z.infer<typeof adminListQuery>;

export const rejectBody = z.object({ reason: text(500).min(5, "Please give the provider a reason (at least 5 characters)") });
