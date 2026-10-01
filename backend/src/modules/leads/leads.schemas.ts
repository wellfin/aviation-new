import { z } from "zod";
import { isObjectId } from "../../lib/db.js";
import { BUSINESS_EMAIL_MESSAGE, isBusinessEmail } from "../../lib/business-email.js";
import { paginationQuery } from "../../lib/pagination.js";
import { LEAD_STATUSES, LEAD_TYPES } from "./lead.model.js";

/*
 * Public form schemas mirror website/src/lib/api/forms.ts field-for-field.
 * The frontend validates the same rules; these are the authoritative ones.
 */

/** Rejects control characters (keeps free text safe for email headers, CSV and logs). */
const noControl = (v: string) => {
  for (let i = 0; i < v.length; i += 1) {
    const c = v.charCodeAt(i);
    if ((c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) || c === 0x7f) return false;
  }
  return true;
};
const singleLine = (v: string) => noControl(v) && !/[\r\n]/.test(v);

/** Enquiry forms take professional/business addresses only (no Gmail, Yahoo, Outlook…). */
export const emailField = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(254)
  .pipe(z.email("Enter a valid email address"))
  .transform((v) => v.toLowerCase())
  .refine(isBusinessEmail, BUSINESS_EMAIL_MESSAGE);
const name = z.string().trim().min(2, "Please enter at least 2 characters").max(100).refine(singleLine, "Invalid characters");
const phone = z
  .string()
  .trim()
  .max(30)
  .regex(/^[+()\d\s-]*$/, "Enter a valid phone number")
  .optional()
  .or(z.literal(""));
const shortText = (max: number) => z.string().trim().max(max).refine(singleLine, "Invalid characters");
const optionalShort = (max: number) => shortText(max).optional().or(z.literal(""));
const message = z.string().trim().min(10, "Please enter at least 10 characters").max(5000).refine(noControl, "Invalid characters");
const optionalMessage = z.string().trim().max(5000).refine(noControl, "Invalid characters").optional().or(z.literal(""));
const company = shortText(120).pipe(z.string().min(2, "Company is required"));

/** Hidden field bots tend to fill in; humans never see it. */
const honeypot = { website: z.string().max(500).optional() };

export const contactBody = z.object({
  name,
  email: emailField,
  phone,
  company: optionalShort(120),
  subject: shortText(120).pipe(z.string().min(1, "Please choose a subject")),
  message,
  ...honeypot,
});

export const demoRequestBody = z.object({
  firstName: name,
  lastName: name,
  email: emailField,
  company,
  role: optionalShort(120),
  phone,
  interest: shortText(120).pipe(z.string().min(1, "Please choose an option")),
  preferredDate: optionalShort(40),
  message: optionalMessage,
  ...honeypot,
});

export const dataLicenceBody = z.object({
  name,
  email: emailField,
  company,
  datasets: z
    .array(z.string().trim().min(1).max(60).regex(/^[a-z0-9][a-z0-9_-]*$/i, "Invalid dataset"))
    .min(1, "Select at least one dataset")
    .max(30)
    .transform((list) => [...new Set(list)]),
  useCase: message,
  ...honeypot,
});

export const advertisingBody = z.object({
  name,
  email: emailField,
  company,
  phone,
  placement: shortText(60).pipe(z.string().min(1, "Please choose an ad format")),
  budget: optionalShort(60),
  message: optionalMessage,
  ...honeypot,
});

export const otpRequestBody = z.object({ email: emailField });
/** 4-digit code: contact, advertising, data-licence and provider-enquiry forms. */
export const contactOtpVerifyBody = z.object({ email: emailField, code: z.string().trim().regex(/^\d{4}$/, "Enter the 4-digit code") });
export const demoOtpVerifyBody = z.object({ email: emailField, code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code") });

export type ContactInput = z.infer<typeof contactBody>;
export type DemoRequestInput = z.infer<typeof demoRequestBody>;
export type DataLicenceInput = z.infer<typeof dataLicenceBody>;
export type AdvertisingInput = z.infer<typeof advertisingBody>;

/* ---------- admin ---------- */

export const idParams = z.object({ id: z.string().refine(isObjectId, "Invalid id") });

/** YYYY-MM-DD or a full ISO timestamp. */
const dateParam = z
  .string()
  .trim()
  .refine((v) => /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/.test(v) && !Number.isNaN(Date.parse(v)), "Use YYYY-MM-DD or an ISO date-time");

export const dateRangeQuery = z.object({ from: dateParam.optional(), to: dateParam.optional() });

export const listLeadsQuery = paginationQuery.extend({
  ...dateRangeQuery.shape,
  type: z.enum(LEAD_TYPES).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  q: z.string().trim().max(100).optional(),
});

export const exportLeadsQuery = z.object({
  ...dateRangeQuery.shape,
  type: z.enum(LEAD_TYPES).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
});

export const updateLeadBody = z
  .object({
    status: z.enum(LEAD_STATUSES),
    assignedTo: z.string().refine(isObjectId, "Invalid id").nullable(),
  })
  .partial()
  .refine((v) => v.status !== undefined || v.assignedTo !== undefined, "Nothing to update");

export const addNoteBody = z.object({ text: z.string().trim().min(1, "Note can't be empty").max(2000).refine(noControl, "Invalid characters") });

export type ListLeadsQuery = z.infer<typeof listLeadsQuery>;
export type ExportLeadsQuery = z.infer<typeof exportLeadsQuery>;
export type UpdateLeadInput = z.infer<typeof updateLeadBody>;

/**
 * Mongo filter for a createdAt window. A date-only `to` is inclusive of that
 * whole day, which is what people mean by "to 2026-09-30".
 */
export function createdAtRange(from?: string, to?: string): Record<string, Date> | undefined {
  if (!from && !to) return undefined;
  const range: Record<string, Date> = {};
  if (from) range.$gte = new Date(from);
  if (to) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) range.$lt = new Date(new Date(to).getTime() + 24 * 60 * 60_000);
    else range.$lte = new Date(to);
  }
  return range;
}
