import { z } from "zod";
import { BUSINESS_EMAIL_MESSAGE, isBusinessEmail } from "../../lib/business-email.js";
import { isObjectId } from "../../lib/db.js";
import { parse } from "../../lib/http.js";
import { paginationQuery } from "../../lib/pagination.js";
import { ENQUIRY_STATUSES } from "./enquiry.model.js";

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Provider is required")
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid provider");

export const slugParams = z.object({ slug });
export const providerSlugBody = z.object({ providerSlug: slug });
export const idParams = z.object({ id: z.string().refine(isObjectId, "Invalid id") });

// Field rules mirror website/src/lib/api/forms.ts (enquirySchema) and
// provider-profile/schema.ts (fleetEnquirySchema) so field errors line up with the UI.
const singleLine = /^[^\p{Cc}]*$/u;
const name = z.string().trim().min(2, "Please enter at least 2 characters").max(100).regex(singleLine, "Please enter a valid name");
/** Professional/business addresses only (no Gmail, Yahoo, Outlook…). */
export const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .pipe(z.email("Enter a valid email address"))
  .pipe(z.string().max(254))
  .refine(isBusinessEmail, BUSINESS_EMAIL_MESSAGE);

export const enquiryOtpRequestBody = z.object({ email });
export const enquiryOtpVerifyBody = z.object({ email, code: z.string().trim().regex(/^\d{4}$/, "Enter the 4-digit code") });
const dialCode = z
  .string()
  .trim()
  .max(6)
  .regex(/^\+?\d{0,4}$/, "Invalid dialling code")
  .optional();
const phone = z
  .string()
  .trim()
  .max(30)
  .regex(/^[+()\d\s-]*$/, "Enter a valid phone number")
  .optional();
const company = z.string().trim().max(120).regex(singleLine).optional();
const optionalMessage = z.string().trim().max(5000).optional();
/** Honeypot: invisible to humans, so any value means a bot. */
const website = z.string().max(500).optional();
const tripType = z.enum(["one-way", "round-trip", "multi-leg"]);
const airportField = (msg: string) => z.string().trim().min(3, msg).max(80).regex(singleLine, msg);
const passengers = z.coerce.number().int("At least 1 passenger").min(1, "At least 1 passenger").max(500);
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

const contactFields = { name, email, dialCode, phone, company, website };

export const generalEnquiryBody = z.object({
  type: z.literal("general").optional(),
  ...contactFields,
  service: z.string().trim().min(1, "Please select a service").max(120),
  message: z.string().trim().min(10, "Please enter at least 10 characters").max(5000),
});

/** API-native fleet enquiry shape. */
export const fleetEnquiryBody = z.object({
  type: z.literal("fleet"),
  ...contactFields,
  message: optionalMessage,
  trip: z.object({
    tripType,
    from: airportField("Enter a departure airport"),
    to: airportField("Enter a destination airport"),
    departAt: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/, "Choose a departure date"),
    passengers,
    /** Fleet aircraft id from the provider profile. */
    aircraftId: z.string().trim().max(60).optional(),
  }),
});

/** Flat shape posted by the profile's "Aircraft Fleet Enquiry" form (fleetEnquirySchema). */
export const flatFleetEnquiryBody = z.object({
  ...contactFields,
  aircraftId: z.string().trim().min(1, "Please choose an aircraft").max(60),
  tripType,
  from: airportField("Enter a departure airport"),
  to: airportField("Enter a destination airport"),
  date: z.string().trim().regex(isoDate, "Choose a departure date"),
  time: z
    .string()
    .trim()
    .regex(/^(\d{2}:\d{2})?$/, "Enter a valid time")
    .optional(),
  passengers,
  message: optionalMessage,
});

export interface TripInput {
  tripType: z.infer<typeof tripType>;
  from: string;
  to: string;
  departAt: string;
  passengers: number;
  aircraftId?: string;
}

/** Normalised enquiry, independent of which request shape was used. */
export interface EnquiryInput {
  type: "general" | "fleet";
  name: string;
  email: string;
  phone: string;
  company: string;
  service: string;
  message: string;
  trip?: TripInput;
  /** True when the honeypot was filled — accepted but dropped. */
  isBot: boolean;
}

function joinPhone(dial: string | undefined, number: string | undefined): string {
  const n = number?.trim() ?? "";
  if (!n) return "";
  const d = dial?.trim() ?? "";
  return d && !n.startsWith("+") ? `${d.startsWith("+") ? d : `+${d}`} ${n}` : n;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Picks the schema for a raw enquiry body (general, API fleet, or the UI's flat
 * fleet form), validates it and returns one normalised shape. Validation errors
 * use the field names of the shape that was sent.
 */
export function parseEnquiryBody(raw: unknown): EnquiryInput {
  const body = isRecord(raw) ? raw : {};
  if (body.type === "fleet" || "trip" in body) {
    const v = parse(fleetEnquiryBody, body);
    return {
      type: "fleet",
      name: v.name,
      email: v.email,
      phone: joinPhone(v.dialCode, v.phone),
      company: v.company ?? "",
      service: "Aircraft charter",
      message: v.message ?? "",
      trip: v.trip,
      isBot: Boolean(v.website),
    };
  }
  if ("tripType" in body || "aircraftId" in body) {
    const v = parse(flatFleetEnquiryBody, body);
    return {
      type: "fleet",
      name: v.name,
      email: v.email,
      phone: joinPhone(v.dialCode, v.phone),
      company: v.company ?? "",
      service: "Aircraft charter",
      message: v.message ?? "",
      trip: {
        tripType: v.tripType,
        from: v.from,
        to: v.to,
        departAt: v.time ? `${v.date}T${v.time}` : v.date,
        passengers: v.passengers,
        aircraftId: v.aircraftId,
      },
      isBot: Boolean(v.website),
    };
  }
  const v = parse(generalEnquiryBody, body);
  return {
    type: "general",
    name: v.name,
    email: v.email,
    phone: joinPhone(v.dialCode, v.phone),
    company: v.company ?? "",
    service: v.service,
    message: v.message,
    isBot: Boolean(v.website),
  };
}

export const OWNER_SETTABLE_STATUSES = ["read", "replied", "closed", "spam"] as const;

export const ownerListQuery = paginationQuery.extend({ status: z.enum(ENQUIRY_STATUSES).optional() });
export const ownerUpdateBody = z.object({ status: z.enum(OWNER_SETTABLE_STATUSES) });

export const adminListQuery = paginationQuery
  .extend({
    status: z.enum(ENQUIRY_STATUSES).optional(),
    /** Provider id or slug. */
    provider: z.string().trim().max(120).optional(),
    q: z.string().trim().max(100).optional(),
    from: z.coerce.date().optional(),
    /** A date-only value (`2026-01-31`) includes that whole UTC day. */
    to: z.preprocess((v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T23:59:59.999Z` : v), z.coerce.date()).optional(),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, { message: "`from` must be before `to`", path: ["from"] });
export type AdminListQuery = z.infer<typeof adminListQuery>;
export const adminUpdateBody = z.object({ status: z.enum(ENQUIRY_STATUSES) });
