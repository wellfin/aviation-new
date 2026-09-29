import { z } from "zod";
import type { ServiceCategorySlug } from "@/lib/types";

/**
 * Client mirror of backend providers.schemas.ts (`editableFields`, `createListingBody`),
 * same limits and messages, for instant feedback. The API re-validates everything.
 */

const text = (max: number) => z.string().trim().max(max, `Use at most ${max} characters`);

const assetUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^\/[^/]/.test(v) || /^https?:\/\/[^\s]+$/i.test(v), "Use a site path (/images/…) or an http(s) URL");

export const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/i.test(v), "Use a full https:// URL");

export const icaoCode = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{4}$/, "Enter a 4-character ICAO code")
  .transform((v) => v.toUpperCase());

const countryCode = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2}$/, "Choose a country")
  .transform((v) => v.toUpperCase());


export const FLEET_CATEGORIES = ["Light Jet", "Midsize Jet", "Super Midsize Jet", "Heavy Jet", "Ultra Long Range", "Turboprop", "Helicopter"] as const;

/** Categories whose profiles show an aircraft fleet. */
export const FLEET_LISTING_CATEGORIES: ServiceCategorySlug[] = ["charter-operator", "charter-broker"];

/** Icons the public profile knows how to draw for services. */
export const SERVICE_ICONS = ["plane", "plane-takeoff", "fuel", "sofa", "shield-check", "warehouse", "concierge-bell", "tag", "settings", "heart-pulse"] as const;

export const basicsSchema = z.object({
  name: text(120).min(2, "Please enter at least 2 characters"),
  /** Validated against the live catalogue by the API. */
  category: z.string().trim().min(1, "Choose a category").max(60),
  countryCode,
  country: text(80).min(2, "Choose a country"),
  city: text(80).min(1, "City is required"),
  summary: text(300).min(10, "Please write at least 10 characters"),
  locationsLabel: text(60),
  foundedYear: z.number().int("Enter a year").min(1900, "Enter a year from 1900").max(2100, "Enter a valid year").nullable(),
  employees: text(20),
});

export const createSchema = basicsSchema.pick({ name: true, category: true, countryCode: true, country: true, city: true, summary: true });

export const aboutSchema = z.object({ about: z.array(text(2000).min(1, "Remove empty paragraphs")).max(10, "Use at most 10 paragraphs") });

export const contactSchema = z.object({
  contact: z.object({
    phone: z
      .string()
      .trim()
      .max(30, "Use at most 30 characters")
      .regex(/^[+\d\s().A-Za-z-]*$/, "Enter a valid phone number"),
    email: z.union([z.email("Enter a valid email").max(254), z.literal("")]),
    website: text(200),
    address: text(300),
    fax: text(30),
    location: text(120),
  }),
});

export const socialsSchema = z.object({ socials: z.object({ linkedin: httpsUrl, instagram: httpsUrl, facebook: httpsUrl, x: httpsUrl }) });

export const mediaSchema = z.object({
  logo: assetUrl,
  coverImage: assetUrl,
  gallery: z.array(assetUrl.refine((v) => v !== "", "Required")).max(30),
  /** Omitted when the plan doesn't include video. */
  videoUrl: httpsUrl.optional(),
});

export const servicesSchema = z.object({
  services: z
    .array(
      z.object({
        name: text(80).min(1, "Service name is required"),
        description: text(500),
        icon: z.enum(SERVICE_ICONS),
      }),
    )
    .max(30, "Use at most 30 services"),
});

export const airportsSchema = z.object({ airports: z.array(icaoCode).max(50, "Use at most 50 airports") });

export const certificationsSchema = z.object({
  certifications: z
    .array(
      z.object({
        name: text(120).min(1, "Name is required"),
        issuer: text(120).min(1, "Issuer is required"),
        validUntil: z
          .string()
          .trim()
          .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Use YYYY-MM-DD"),
        code: text(60),
      }),
    )
    .max(20, "Use at most 20 certifications"),
});

export const brochuresSchema = z.object({
  brochures: z
    .array(
      z.object({
        title: text(150).min(1, "Title is required"),
        fileType: z.enum(["PDF", "DOCX"]),
        sizeLabel: text(20),
        url: assetUrl.refine((v) => v !== "", "Upload a PDF"),
      }),
    )
    .max(20, "Use at most 20 brochures"),
});

const optionalObjectId = z
  .string()
  .regex(/^([a-f0-9]{24})?$/i)
  .transform((v) => v || undefined);

export const fleetSchema = z.object({
  fleet: z
    .array(
      z.object({
        id: optionalObjectId,
        model: text(100).min(1, "Model is required"),
        category: z.enum(FLEET_CATEGORIES),
        seats: z.number({ message: "Enter seats" }).int("Whole number").min(1, "At least 1").max(600, "At most 600"),
        rangeNm: z.number({ message: "Enter range" }).int("Whole number").min(0, "0 or more").max(20_000, "At most 20,000"),
        speedKts: z.number({ message: "Enter speed" }).int("Whole number").min(0, "0 or more").max(800, "At most 800"),
        baseIcao: z.union([icaoCode, z.literal("")]),
        image: assetUrl,
        yearOfManufacture: z
          .number()
          .int("Whole number")
          .min(1950, "1950 or later")
          .max(2100, "Enter a valid year")
          .optional(),
      }),
    )
    .max(50, "Use at most 50 aircraft"),
});
