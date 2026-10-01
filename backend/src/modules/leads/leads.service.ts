import type { Response } from "express";
import type { QueryFilter } from "mongoose";
import { logger } from "../../lib/logger.js";
import { notFound, validationError } from "../../lib/errors.js";
import { containsRegex, paginated, skipFor, type Paginated } from "../../lib/pagination.js";
import { sendMail, sendMailInBackground } from "../notifications/mailer.js";
import { emailCheckCode } from "../notifications/templates.js";
import type { OtpPurpose } from "../otp/otp.model.js";
import { consumeVerifiedEmail, issueOtp, verifyOtp } from "../otp/otp.service.js";
import { User } from "../users/user.model.js";
import { startCsvDownload, writeCsvRow } from "./csv.js";
import { Lead, type LeadAttrs, type LeadDetails, type LeadDoc, type LeadStatus, type LeadType, type LeadUserRef } from "./lead.model.js";
import {
  createdAtRange,
  type AdvertisingInput,
  type ContactInput,
  type DataLicenceInput,
  type DemoRequestInput,
  type ExportLeadsQuery,
  type ListLeadsQuery,
  type UpdateLeadInput,
} from "./leads.schemas.js";
import { LEAD_LABELS, leadConfirmationEmail, staffLeadEmail } from "./leads.templates.js";

/* ---------- email ownership (OTP) ---------- */

/**
 * Every public enquiry form proves the sender owns the email first. Demo requests use the
 * 6-digit code UI; the others share the 4-box one (see the frontend forms).
 */
export const LEAD_OTP = {
  contact: { purpose: "contact_email", length: 4 },
  demo: { purpose: "demo_email", length: 6 },
  advertising: { purpose: "advertising_email", length: 4 },
  dataLicence: { purpose: "data_licence_email", length: 4 },
  enquiry: { purpose: "enquiry_email", length: 4 },
} as const satisfies Record<string, { purpose: OtpPurpose; length: number }>;
export type OtpForm = keyof typeof LEAD_OTP;

export async function sendLeadOtp(form: OtpForm, email: string): Promise<void> {
  const { purpose, length } = LEAD_OTP[form];
  const code = await issueOtp(purpose, email, length);
  await sendMail(emailCheckCode(email, code));
}

export async function verifyLeadOtp(form: OtpForm, email: string, code: string): Promise<void> {
  await verifyOtp(LEAD_OTP[form].purpose, email, code, { consume: false });
}

/* ---------- submissions ---------- */

interface NewLead {
  type: LeadType;
  name: string;
  email: string;
  phone?: string | undefined;
  company?: string | undefined;
  message?: string | undefined;
  details: LeadDetails;
}

const blankToUndefined = (v: string | undefined) => (v ? v : undefined);
const isBot = (honeypot: string | undefined) => Boolean(honeypot?.trim());

/** Staff inbox = every active admin and manager. */
async function staffRecipients(): Promise<string[]> {
  const staff = await User.find({ role: { $in: ["ADMIN", "MANAGER"] }, status: "active" }, { email: 1 }).lean();
  return staff.map((u) => u.email);
}

function detailLines(lead: NewLead): Array<[string, string | undefined]> {
  const d = lead.details;
  return [
    ["Type", LEAD_LABELS[lead.type]],
    ["Name", lead.name],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["Company", lead.company],
    ["Subject", d.subject ?? undefined],
    ["Role", d.role ?? undefined],
    ["Interest", d.interest ?? undefined],
    ["Preferred date", d.preferredDate ?? undefined],
    ["Datasets", d.datasets?.join(", ")],
    ["Ad format", d.placement ?? undefined],
    ["Budget", d.budget ?? undefined],
    ["Message", lead.message],
  ];
}

/** Emails staff and the submitter without delaying (or failing) the response. */
function notifyInBackground(id: string, lead: NewLead): void {
  staffRecipients()
    .then((recipients) => {
      const lines = detailLines(lead);
      for (const to of recipients) sendMailInBackground(staffLeadEmail(to, { id, type: lead.type, name: lead.name, email: lead.email }, lines));
    })
    .catch((err: unknown) => logger.error({ err, leadId: id }, "Failed to notify staff of new lead"));
  sendMailInBackground(leadConfirmationEmail(lead.email, lead.type, lead.name));
}

async function createLead(lead: NewLead): Promise<void> {
  const doc = await Lead.create({
    type: lead.type,
    name: lead.name,
    email: lead.email,
    phone: blankToUndefined(lead.phone),
    company: blankToUndefined(lead.company),
    message: blankToUndefined(lead.message),
    details: lead.details,
  });
  logger.info({ leadId: doc.id, type: lead.type }, "Lead received");
  notifyInBackground(doc.id, lead);
}

/*
 * Honeypot hits get the same success response as real submissions so bots
 * can't learn they were filtered; nothing is stored or emailed.
 */

export async function submitContact(input: ContactInput): Promise<void> {
  if (isBot(input.website)) return;
  await consumeVerifiedEmail(LEAD_OTP.contact.purpose, input.email);
  await createLead({
    type: "contact",
    name: input.name,
    email: input.email,
    phone: input.phone,
    company: input.company,
    message: input.message,
    details: { subject: input.subject },
  });
}

export async function submitDemoRequest(input: DemoRequestInput): Promise<void> {
  if (isBot(input.website)) return;
  await consumeVerifiedEmail(LEAD_OTP.demo.purpose, input.email);
  await createLead({
    type: "demo",
    name: `${input.firstName} ${input.lastName}`,
    email: input.email,
    phone: input.phone,
    company: input.company,
    message: input.message,
    details: {
      firstName: input.firstName,
      lastName: input.lastName,
      role: blankToUndefined(input.role),
      interest: input.interest,
      preferredDate: blankToUndefined(input.preferredDate),
    },
  });
}

export async function submitDataLicence(input: DataLicenceInput): Promise<void> {
  if (isBot(input.website)) return;
  await consumeVerifiedEmail(LEAD_OTP.dataLicence.purpose, input.email);
  await createLead({
    type: "data_licence",
    name: input.name,
    email: input.email,
    company: input.company,
    message: input.useCase,
    details: { datasets: input.datasets },
  });
}

export async function submitAdvertising(input: AdvertisingInput): Promise<void> {
  if (isBot(input.website)) return;
  await consumeVerifiedEmail(LEAD_OTP.advertising.purpose, input.email);
  await createLead({
    type: "advertising",
    name: input.name,
    email: input.email,
    phone: input.phone,
    company: input.company,
    message: input.message,
    details: { placement: input.placement, budget: blankToUndefined(input.budget) },
  });
}

/* ---------- admin ---------- */

const USER_REF_FIELDS = "firstName lastName email";

interface UserRefDTO {
  id: string;
  name: string;
  email: string;
}

function toUserRef(u: unknown): UserRefDTO | null {
  if (!u || typeof u !== "object" || !("email" in u)) return null;
  const ref = u as LeadUserRef;
  return { id: ref._id.toString(), name: `${ref.firstName} ${ref.lastName}`.trim(), email: ref.email };
}

function cleanDetails(d: LeadDetails | null | undefined): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(d ?? {})) {
    if (typeof v === "string" && v) out[k] = v;
    else if (Array.isArray(v) && v.length) out[k] = v.map(String);
  }
  return out;
}

export interface LeadSummaryDTO {
  id: string;
  type: LeadType;
  status: LeadStatus;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  details: Record<string, string | string[]>;
  assignedTo: UserRefDTO | null;
  notesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeadDTO extends LeadSummaryDTO {
  notes: Array<{ id: string; by: UserRefDTO | null; text: string; at: string }>;
}

function toLeadSummary(l: LeadDoc): LeadSummaryDTO {
  return {
    id: l.id,
    type: l.type,
    status: l.status,
    name: l.name,
    email: l.email,
    phone: l.phone ?? null,
    company: l.company ?? null,
    message: l.message ?? null,
    details: cleanDetails(l.details),
    assignedTo: toUserRef(l.assignedTo),
    notesCount: l.notes.length,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}

function toLeadDTO(l: LeadDoc): LeadDTO {
  return {
    ...toLeadSummary(l),
    notes: l.notes.map((n) => ({ id: n._id.toString(), by: toUserRef(n.by), text: n.text, at: n.at.toISOString() })),
  };
}

function leadFilter(q: { type?: LeadType | undefined; status?: LeadStatus | undefined; from?: string | undefined; to?: string | undefined }): QueryFilter<LeadAttrs> {
  const filter: QueryFilter<LeadAttrs> = {};
  if (q.type) filter.type = q.type;
  if (q.status) filter.status = q.status;
  const range = createdAtRange(q.from, q.to);
  if (range) filter.createdAt = range;
  return filter;
}

export async function listLeads(query: ListLeadsQuery): Promise<Paginated<LeadSummaryDTO>> {
  const filter = leadFilter(query);
  if (query.q) {
    const rx = containsRegex(query.q);
    filter.$or = [{ name: rx }, { email: rx }, { company: rx }, { message: rx }];
  }
  const [items, total] = await Promise.all([
    Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip(skipFor(query.page, query.pageSize))
      .limit(query.pageSize)
      .populate("assignedTo", USER_REF_FIELDS),
    Lead.countDocuments(filter),
  ]);
  return paginated(items.map(toLeadSummary), total, query.page, query.pageSize);
}

async function loadLead(id: string): Promise<LeadDoc> {
  const lead = await Lead.findById(id).populate("assignedTo", USER_REF_FIELDS).populate("notes.by", USER_REF_FIELDS);
  if (!lead) throw notFound("Lead");
  return lead;
}

export async function getLead(id: string): Promise<LeadDTO> {
  return toLeadDTO(await loadLead(id));
}

/** Leads can only be assigned to active staff (admins or managers). */
async function assertAssignableStaff(userId: string): Promise<void> {
  const ok = await User.exists({ _id: userId, role: { $in: ["ADMIN", "MANAGER"] }, status: "active" });
  if (!ok) throw validationError({ assignedTo: "Choose an active admin or manager" });
}

export async function updateLead(id: string, input: UpdateLeadInput): Promise<LeadDTO> {
  if (input.assignedTo) await assertAssignableStaff(input.assignedTo);
  const update: { $set: Record<string, unknown>; $unset?: Record<string, 1> } = { $set: {} };
  if (input.status) update.$set.status = input.status;
  if (input.assignedTo) update.$set.assignedTo = input.assignedTo;
  if (input.assignedTo === null) update.$unset = { assignedTo: 1 };
  const res = await Lead.updateOne({ _id: id }, update);
  if (res.matchedCount === 0) throw notFound("Lead");
  return getLead(id);
}

const MAX_NOTES = 500;

export async function addLeadNote(id: string, authorId: string, text: string): Promise<LeadDTO> {
  // Atomic push with a size guard so concurrent notes never overwrite each other.
  const res = await Lead.updateOne(
    { _id: id, [`notes.${MAX_NOTES - 1}`]: { $exists: false } },
    { $push: { notes: { by: authorId, text, at: new Date() } } },
  );
  if (res.matchedCount === 0) {
    if (await Lead.exists({ _id: id })) throw validationError({ text: "This lead has reached the maximum number of notes" });
    throw notFound("Lead");
  }
  return getLead(id);
}

const EXPORT_LIMIT = 50_000;
const EXPORT_HEADER = ["id", "createdAt", "type", "status", "name", "email", "phone", "company", "message", "details", "assignedTo", "notes"] as const;

/** Streams matching leads as CSV (oldest first) straight from a cursor. */
export async function exportLeadsCsv(query: ExportLeadsQuery, res: Response): Promise<void> {
  const cursor = Lead.find(leadFilter(query)).sort({ createdAt: 1 }).limit(EXPORT_LIMIT).populate("assignedTo", "email").cursor();
  const stamp = new Date().toISOString().slice(0, 10);
  startCsvDownload(res, `leads-${query.type ?? "all"}-${stamp}.csv`, EXPORT_HEADER);
  try {
    for await (const lead of cursor) {
      const details = Object.entries(cleanDetails(lead.details))
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join("; ");
      await writeCsvRow(res, [
        lead.id,
        lead.createdAt,
        lead.type,
        lead.status,
        lead.name,
        lead.email,
        lead.phone,
        lead.company,
        lead.message,
        details,
        toUserRef(lead.assignedTo)?.email ?? "",
        lead.notes.length,
      ]);
    }
  } catch (err) {
    // Headers are already sent, so the error envelope can't be used; the truncated file is the signal.
    logger.error({ err }, "Lead CSV export failed mid-stream");
  } finally {
    await cursor.close();
    res.end();
  }
}
