import type { Types } from "mongoose";
import { isObjectId } from "../../lib/db.js";
import { forbidden, notFound, validationError } from "../../lib/errors.js";
import { containsRegex, paginated, skipFor } from "../../lib/pagination.js";
import { logger } from "../../lib/logger.js";
import { sendMailInBackground } from "../notifications/mailer.js";
import { Provider } from "../providers/provider.model.js";
import type { UserDoc } from "../users/user.model.js";
import { enquiryConfirmationEmail, providerEnquiryEmail } from "./enquiry.emails.js";
import { Enquiry, type EnquiryAttrs, type ENQUIRY_STATUSES } from "./enquiry.model.js";
import type { AdminListQuery, EnquiryInput, OWNER_SETTABLE_STATUSES } from "./enquiry.schemas.js";

type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];
type EnquiryLike = Omit<EnquiryAttrs, "provider"> & { _id: Types.ObjectId; provider: unknown; createdAt: Date; updatedAt: Date };

/** Tiers whose listings show the enquiry forms. */
const ENQUIRY_TIERS = new Set(["pro", "ultra_pro"]);
const PROVIDER_REF = "slug name";

function providerRef(value: unknown): { id: string; slug: string; name: string } {
  if (typeof value === "object" && value !== null && "slug" in value) {
    const p = value as { _id: Types.ObjectId; slug: string; name: string };
    return { id: String(p._id), slug: p.slug, name: p.name };
  }
  return { id: String(value), slug: "", name: "" };
}

/** Full enquiry including enquirer PII — only ever returned to the listing owner or staff. */
export function toEnquiryDTO(e: EnquiryLike) {
  const t = e.trip;
  return {
    id: String(e._id),
    type: e.type,
    status: e.status,
    provider: providerRef(e.provider),
    name: e.name,
    email: e.email,
    phone: e.phone ?? "",
    company: e.company ?? "",
    service: e.service ?? "",
    message: e.message ?? "",
    trip:
      e.type === "fleet" && t?.tripType
        ? { tripType: t.tripType, from: t.from ?? "", to: t.to ?? "", departAt: t.departAt ?? "", passengers: t.passengers ?? 0, aircraft: t.aircraft ?? "" }
        : null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

function toAdminEnquiryDTO(e: EnquiryLike) {
  return { ...toEnquiryDTO(e), userId: e.user ? String(e.user) : null };
}

/** Distinct, non-empty recipient addresses (case-insensitive). */
function recipients(...emails: Array<string | null | undefined>): string[] {
  const seen = new Map<string, string>();
  for (const e of emails) {
    const v = e?.trim();
    if (v && !seen.has(v.toLowerCase())) seen.set(v.toLowerCase(), v);
  }
  return [...seen.values()];
}

/**
 * Stores a lead for a published pro/ultra_pro listing and notifies the provider
 * and the enquirer. Honeypot submissions pass every check (so bots can't tell)
 * but are neither stored nor emailed.
 */
export async function submitEnquiry(slug: string, input: EnquiryInput, user: UserDoc | undefined): Promise<void> {
  const provider = await Provider.findOne({ slug, status: "published" })
    .select("name tier owner contact.email services.name fleet._id fleet.model")
    .populate<{ owner: { _id: Types.ObjectId; email: string } | null }>("owner", "email")
    .lean();
  if (!provider) throw notFound("Provider");
  if (!ENQUIRY_TIERS.has(provider.tier)) throw forbidden("This provider doesn't accept enquiries");

  let service = input.service;
  let aircraft: string | undefined;
  if (input.type === "general") {
    const match = (provider.services ?? []).find((s) => s.name.toLowerCase() === input.service.toLowerCase());
    if (!match && input.service.toLowerCase() !== "other") throw validationError({ service: "Please select a service" });
    service = match?.name ?? "Other";
  } else if (input.trip?.aircraftId) {
    const id = input.trip.aircraftId;
    const plane = (provider.fleet ?? []).find((f) => String((f as { _id?: Types.ObjectId })._id) === id);
    if (!plane) throw validationError({ aircraftId: "Please choose an aircraft from this provider's fleet" });
    aircraft = plane.model;
  }

  if (input.isBot) {
    logger.info({ provider: String(provider._id) }, "Enquiry honeypot triggered; submission dropped");
    return;
  }

  const enquiry = await Enquiry.create({
    provider: provider._id,
    user: user?._id,
    type: input.type,
    name: input.name,
    email: input.email,
    phone: input.phone,
    company: input.company,
    service,
    message: input.message,
    ...(input.trip
      ? {
          trip: {
            tripType: input.trip.tripType,
            from: input.trip.from,
            to: input.trip.to,
            departAt: input.trip.departAt,
            passengers: input.trip.passengers,
            aircraft,
          },
        }
      : {}),
  });

  const to = recipients(provider.contact?.email, provider.owner?.email);
  if (to.length === 0) logger.warn({ enquiry: enquiry.id, provider: String(provider._id) }, "Enquiry stored but provider has no email address");
  const notified: EnquiryInput = { ...input, service };
  for (const address of to) sendMailInBackground(providerEnquiryEmail(address, provider.name, notified, aircraft));
  sendMailInBackground(enquiryConfirmationEmail(input.email, provider.name));
}

async function ownedProviderIds(user: UserDoc): Promise<Types.ObjectId[]> {
  const owned = await Provider.find({ owner: user._id }).select("_id").lean();
  return owned.map((p) => p._id);
}

export async function listOwnEnquiries(user: UserDoc, query: { status?: EnquiryStatus; page: number; pageSize: number }) {
  const filter: Record<string, unknown> = { provider: { $in: await ownedProviderIds(user) } };
  if (query.status) filter.status = query.status;
  const [items, total] = await Promise.all([
    Enquiry.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skipFor(query.page, query.pageSize))
      .limit(query.pageSize)
      .populate("provider", PROVIDER_REF)
      .lean<EnquiryLike[]>(),
    Enquiry.countDocuments(filter),
  ]);
  return paginated(items.map(toEnquiryDTO), total, query.page, query.pageSize);
}

/** Opening a new enquiry marks it read (only the new → read transition is automatic). */
export async function getOwnEnquiry(user: UserDoc, id: string) {
  const filter = { _id: id, provider: { $in: await ownedProviderIds(user) } };
  await Enquiry.updateOne({ ...filter, status: "new" }, { $set: { status: "read" } });
  const enquiry = await Enquiry.findOne(filter).populate("provider", PROVIDER_REF).lean<EnquiryLike>();
  if (!enquiry) throw notFound("Enquiry");
  return toEnquiryDTO(enquiry);
}

export async function updateOwnEnquiryStatus(user: UserDoc, id: string, status: (typeof OWNER_SETTABLE_STATUSES)[number]) {
  const enquiry = await Enquiry.findOneAndUpdate(
    { _id: id, provider: { $in: await ownedProviderIds(user) } },
    { $set: { status } },
    { returnDocument: "after", runValidators: true },
  )
    .populate("provider", PROVIDER_REF)
    .lean<EnquiryLike>();
  if (!enquiry) throw notFound("Enquiry");
  return toEnquiryDTO(enquiry);
}

export async function adminListEnquiries(query: AdminListQuery) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.provider) {
    const ref = query.provider;
    const found = await Provider.find(isObjectId(ref) ? { _id: ref } : { slug: ref.toLowerCase() }).select("_id").lean();
    filter.provider = { $in: found.map((p) => p._id) };
  }
  if (query.from || query.to) filter.createdAt = { ...(query.from ? { $gte: query.from } : {}), ...(query.to ? { $lte: query.to } : {}) };
  if (query.q) {
    const rx = containsRegex(query.q);
    filter.$or = [{ name: rx }, { email: rx }, { company: rx }, { message: rx }];
  }
  const [items, total] = await Promise.all([
    Enquiry.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skipFor(query.page, query.pageSize))
      .limit(query.pageSize)
      .populate("provider", PROVIDER_REF)
      .lean<EnquiryLike[]>(),
    Enquiry.countDocuments(filter),
  ]);
  return paginated(items.map(toAdminEnquiryDTO), total, query.page, query.pageSize);
}

export async function adminGetEnquiry(id: string) {
  const enquiry = await Enquiry.findById(id).populate("provider", PROVIDER_REF).lean<EnquiryLike>();
  if (!enquiry) throw notFound("Enquiry");
  return toAdminEnquiryDTO(enquiry);
}

export async function adminUpdateEnquiryStatus(id: string, status: EnquiryStatus) {
  const enquiry = await Enquiry.findByIdAndUpdate(id, { $set: { status } }, { returnDocument: "after", runValidators: true })
    .populate("provider", PROVIDER_REF)
    .lean<EnquiryLike>();
  if (!enquiry) throw notFound("Enquiry");
  return toAdminEnquiryDTO(enquiry);
}
