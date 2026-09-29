import type { ClientSession, SortOrder, Types } from "mongoose";
import { assertActiveCategory } from "../categories/category.service.js";
import { isDuplicateKeyError, withTransaction } from "../../lib/db.js";
import { conflict, notFound, validationError } from "../../lib/errors.js";
import { containsRegex, paginated, skipFor } from "../../lib/pagination.js";
import { logger } from "../../lib/logger.js";
import { recountAirportServices } from "../airports/airports.service.js";
import { Enquiry } from "../enquiries/enquiry.model.js";
import { sendMailInBackground } from "../notifications/mailer.js";
import { Review } from "../reviews/review.model.js";
import { User } from "../users/user.model.js";
import { applyEditableFields, withSlugRetry } from "./listing.service.js";
import { AIRPORT_REF_FIELDS, Provider, type ProviderDoc, type ProviderStatus } from "./provider.model.js";
import { listingApprovedEmail, listingRejectedEmail } from "./providers.emails.js";
import type { AdminCreateInput, AdminListQuery, AdminUpdateInput } from "./providers.schemas.js";
import { icaosOf, toListingDTO, uniqueSlug } from "./providers.service.js";

const OWNER_FIELDS = "email firstName lastName";

interface OwnerRef {
  _id: Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
}

function ownerOf(p: ProviderDoc): OwnerRef | null {
  const owner = p.owner as unknown;
  return owner && typeof owner === "object" && "email" in owner ? (owner as OwnerRef) : null;
}

export function toAdminProviderDTO(p: ProviderDoc) {
  const owner = ownerOf(p);
  return {
    ...toListingDTO(p),
    owner: owner ? { id: String(owner._id), email: owner.email, name: `${owner.firstName} ${owner.lastName}`.trim() } : null,
  };
}

async function adminView(doc: ProviderDoc) {
  await doc.populate([
    { path: "airports", select: AIRPORT_REF_FIELDS },
    { path: "owner", select: OWNER_FIELDS },
  ]);
  return toAdminProviderDTO(doc);
}

const ADMIN_SORTS: Record<AdminListQuery["sort"], Record<string, SortOrder>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  updated: { updatedAt: -1 },
  name: { name: 1 },
  rating: { rating: -1, reviewCount: -1 },
};

export async function adminListProviders(query: AdminListQuery) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.tier) filter.tier = query.tier;
  if (query.q) {
    const rx = containsRegex(query.q);
    filter.$or = [{ name: rx }, { slug: rx }, { city: rx }, { country: rx }, { "contact.email": rx }, { airportCodes: query.q.toUpperCase() }];
  }
  const [items, total] = await Promise.all([
    Provider.find(filter)
      .sort({ ...ADMIN_SORTS[query.sort], _id: -1 })
      .skip(skipFor(query.page, query.pageSize))
      .limit(query.pageSize)
      .populate([
        { path: "airports", select: AIRPORT_REF_FIELDS },
        { path: "owner", select: OWNER_FIELDS },
      ]),
    Provider.countDocuments(filter),
  ]);
  return paginated(items.map(toAdminProviderDTO), total, query.page, query.pageSize);
}

export async function adminGetProvider(id: string) {
  const doc = await Provider.findById(id);
  if (!doc) throw notFound("Provider");
  return adminView(doc);
}

/** Resolves an owner email to a PROVIDER account that doesn't already manage another listing. */
async function resolveOwner(email: string, session: ClientSession, excludeListing?: Types.ObjectId): Promise<Types.ObjectId> {
  const user = await User.findOne({ email }, { role: 1 }).session(session);
  if (!user) throw validationError({ ownerEmail: "No account uses this email address" });
  if (user.role !== "PROVIDER") throw validationError({ ownerEmail: "This account isn't a provider account" });
  const other = await Provider.exists({ owner: user._id, ...(excludeListing ? { _id: { $ne: excludeListing } } : {}) }).session(session);
  if (other) throw conflict("This provider account already manages a listing.", { ownerEmail: "Already manages a listing" }, "LISTING_EXISTS");
  // Serialises concurrent assignments to the same owner (see createMyListing).
  await User.updateOne({ _id: user._id }, { $currentDate: { updatedAt: true } }, { session });
  return user._id;
}

function slugTaken(err: unknown): never {
  if (isDuplicateKeyError(err) && "slug" in (err.keyPattern ?? {})) {
    throw conflict("Another listing already uses this slug.", { slug: "Already in use" });
  }
  throw err;
}

/** Staff-curated listing; may be published immediately and assigned to a provider account. */
export async function adminCreateProvider(input: AdminCreateInput) {
  await assertActiveCategory(input.category);
  const { ownerEmail, tier, verified, slug, status, ...fields } = input;
  const create = () =>
    withTransaction(async (session) => {
      const doc = new Provider({
        slug: slug ?? (await uniqueSlug(fields.name, session)),
        name: fields.name,
        category: fields.category,
        countryCode: fields.countryCode,
        country: fields.country,
        city: fields.city,
        summary: fields.summary,
        tier: tier ?? "basic",
        verified: verified ?? false,
        status,
        ...(status === "published" ? { publishedAt: new Date() } : {}),
        ...(ownerEmail ? { owner: await resolveOwner(ownerEmail, session) } : {}),
      });
      const affected = await applyEditableFields(doc, fields, session);
      await doc.save({ session });
      if (status === "published") await recountAirportServices(affected, session);
      return doc;
    });
  try {
    return await adminView(slug ? await create() : await withSlugRetry(create));
  } catch (err) {
    return slugTaken(err);
  }
}

export async function adminUpdateProvider(id: string, input: AdminUpdateInput) {
  if (input.category !== undefined) await assertActiveCategory(input.category);
  const { ownerEmail, tier, verified, slug, ...fields } = input;
  try {
    const doc = await withTransaction(async (session) => {
      const listing = await Provider.findById(id).session(session);
      if (!listing) throw notFound("Provider");
      if (tier !== undefined) listing.tier = tier;
      if (verified !== undefined) listing.verified = verified;
      if (slug !== undefined) listing.slug = slug;
      if (ownerEmail !== undefined) listing.owner = ownerEmail ? await resolveOwner(ownerEmail, session, listing._id) : undefined;
      const affected = await applyEditableFields(listing, fields, session);
      await listing.save({ session });
      if (listing.status === "published" && affected.length) await recountAirportServices(affected, session);
      return listing;
    });
    return await adminView(doc);
  } catch (err) {
    return slugTaken(err);
  }
}

export type ProviderAction = "approve" | "reject" | "suspend" | "unpublish";

/** Allowed source statuses and the resulting status for each moderation action. */
const TRANSITIONS: Record<ProviderAction, { from: readonly ProviderStatus[]; to: ProviderStatus }> = {
  approve: { from: ["draft", "pending", "rejected", "suspended"], to: "published" },
  reject: { from: ["pending"], to: "rejected" },
  suspend: { from: ["published"], to: "suspended" },
  unpublish: { from: ["published", "suspended"], to: "draft" },
};

export async function transitionProvider(id: string, action: ProviderAction, reason?: string) {
  const rule = TRANSITIONS[action];
  const doc = await withTransaction(async (session) => {
    const listing = await Provider.findById(id).session(session);
    if (!listing) throw notFound("Provider");
    if (!rule.from.includes(listing.status)) {
      throw conflict(`A ${listing.status} listing can't be ${action === "approve" ? "approved" : `${action}ed`}.`, undefined, "INVALID_STATUS");
    }
    listing.status = rule.to;
    if (action === "approve") {
      listing.publishedAt ??= new Date();
      listing.rejectionReason = undefined;
    }
    if (action === "reject") listing.rejectionReason = reason;
    await listing.save({ session });
    await recountAirportServices(icaosOf(listing.airportCodes), session);
    return listing;
  });
  const view = await adminView(doc);
  notifyOwner(doc, action, reason);
  logger.info({ providerId: id, action }, "Provider status changed");
  return view;
}

/** Emails the owner (if any) after approve/reject; failures never fail the request. */
function notifyOwner(doc: ProviderDoc, action: ProviderAction, reason?: string): void {
  const owner = ownerOf(doc);
  if (!owner) return;
  if (action === "approve") sendMailInBackground(listingApprovedEmail(owner.email, owner.firstName, doc.name, doc.slug));
  if (action === "reject" && reason) sendMailInBackground(listingRejectedEmail(owner.email, owner.firstName, doc.name, reason));
}

/** Removes a listing with its reviews, enquiries and favourites in one transaction. */
export async function adminDeleteProvider(id: string): Promise<void> {
  await withTransaction(async (session) => {
    const listing = await Provider.findById(id).session(session);
    if (!listing) throw notFound("Provider");
    // Sequential: operations within one transaction must not run concurrently.
    await Review.deleteMany({ provider: listing._id }, { session });
    await Enquiry.deleteMany({ provider: listing._id }, { session });
    await User.updateMany({ favorites: listing._id }, { $pull: { favorites: listing._id } }, { session });
    await listing.deleteOne({ session });
    await recountAirportServices(icaosOf(listing.airportCodes), session);
  });
}
