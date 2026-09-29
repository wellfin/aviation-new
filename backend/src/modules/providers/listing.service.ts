import type { ClientSession } from "mongoose";
import { assertActiveCategory } from "../categories/category.service.js";
import { isDuplicateKeyError, withTransaction } from "../../lib/db.js";
import { conflict, notFound, validationError } from "../../lib/errors.js";
import { recountAirportServices } from "../airports/airports.service.js";
import { User, type UserDoc } from "../users/user.model.js";
import { AIRPORT_REF_FIELDS, Provider, type ProviderDoc } from "./provider.model.js";
import type { CreateListingInput, EditableListingInput } from "./providers.schemas.js";
import { assertTierLimits, icaosOf, resolveAirports, toListingDTO, uniqueSlug } from "./providers.service.js";

/**
 * Copies whitelisted, already-validated fields onto a listing. Nested objects are
 * merged key by key so a PATCH of `contact.phone` keeps the other contact fields.
 * Returns the ICAO codes whose provider counts may have changed.
 */
export async function applyEditableFields(doc: ProviderDoc, input: EditableListingInput, session: ClientSession): Promise<string[]> {
  const { airports, contact, socials, fleet, foundedYear, videoUrl, ...simple } = input;
  for (const [key, value] of Object.entries(simple)) {
    if (value !== undefined) doc.set(key, value);
  }
  for (const [key, value] of Object.entries(contact ?? {})) {
    if (value !== undefined) doc.set(`contact.${key}`, value);
  }
  for (const [key, value] of Object.entries(socials ?? {})) {
    if (value !== undefined) doc.set(`socials.${key}`, value || undefined);
  }
  if (videoUrl !== undefined) doc.set("videoUrl", videoUrl || undefined);
  if (foundedYear !== undefined) doc.set("foundedYear", foundedYear ?? undefined);
  if (fleet) {
    const seen = new Set<string>();
    doc.set(
      "fleet",
      fleet.map(({ id, baseIcao, ...aircraft }) => {
        const keepId = id && !seen.has(id);
        if (id) seen.add(id);
        return { ...aircraft, baseIcao: baseIcao || undefined, ...(keepId ? { _id: id } : {}) };
      }),
    );
  }
  if (!airports) return [];
  const before = icaosOf(doc.airportCodes);
  const resolved = await resolveAirports(airports, session);
  doc.set("airports", resolved.ids);
  doc.set("airportCodes", resolved.codes);
  return [...before, ...airports];
}

export async function populated(doc: ProviderDoc) {
  await doc.populate("airports", AIRPORT_REF_FIELDS);
  return toListingDTO(doc);
}

/** Retries once on a slug race (two listings with the same name created at the same instant). */
export async function withSlugRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isDuplicateKeyError(err) && "slug" in (err.keyPattern ?? {})) return fn();
    throw err;
  }
}

async function ownListing(owner: UserDoc, session?: ClientSession): Promise<ProviderDoc> {
  const listing = await Provider.findOne({ owner: owner._id }).session(session ?? null);
  if (!listing) throw notFound("Listing");
  return listing;
}

export async function getMyListing(owner: UserDoc) {
  return populated(await ownListing(owner));
}

/** One listing per provider account; new listings start as drafts on the Basic tier. */
export async function createMyListing(owner: UserDoc, input: CreateListingInput) {
  await assertActiveCategory(input.category);
  assertTierLimits("basic", input);
  const doc = await withSlugRetry(() =>
    withTransaction(async (session) => {
      // Touching the owner's user document makes concurrent creates for the same
      // owner conflict, so the "one listing" check below can't be raced.
      await User.updateOne({ _id: owner._id }, { $currentDate: { updatedAt: true } }, { session });
      if (await Provider.exists({ owner: owner._id }).session(session)) {
        throw conflict("You already have a listing. Edit it instead.", undefined, "LISTING_EXISTS");
      }
      const listing = new Provider({
        slug: await uniqueSlug(input.name, session),
        name: input.name,
        category: input.category,
        countryCode: input.countryCode,
        country: input.country,
        city: input.city,
        summary: input.summary,
        owner: owner._id,
        status: "draft",
        tier: "basic",
        verified: false,
      });
      await applyEditableFields(listing, input, session);
      await listing.save({ session });
      return listing;
    }),
  );
  return populated(doc);
}

/** Edits never change the workflow status: a published listing stays published. */
export async function updateMyListing(owner: UserDoc, input: EditableListingInput) {
  if (input.category !== undefined) await assertActiveCategory(input.category);
  const doc = await withTransaction(async (session) => {
    const listing = await ownListing(owner, session);
    assertTierLimits(listing.tier, input);
    const affected = await applyEditableFields(listing, input, session);
    await listing.save({ session });
    if (listing.status === "published" && affected.length) await recountAirportServices(affected, session);
    return listing;
  });
  return populated(doc);
}

/** Minimum content a listing needs before staff review it. */
function missingForReview(p: ProviderDoc): Record<string, string> {
  const missing: Record<string, string> = {};
  if (!p.about?.some((para) => para.trim())) missing.about = "Add at least one paragraph about your business";
  if (!p.contact?.email && !p.contact?.phone) missing.contact = "Add a contact email or phone number";
  if (!p.airports?.length) missing.airports = "Add at least one airport you serve";
  if (!p.services?.length) missing.services = "Add at least one service";
  return missing;
}

export async function submitMyListing(owner: UserDoc) {
  const doc = await withTransaction(async (session) => {
    const listing = await ownListing(owner, session);
    if (listing.status !== "draft" && listing.status !== "rejected") {
      throw conflict(`Your listing is ${listing.status} and can't be submitted again.`, undefined, "INVALID_STATUS");
    }
    const missing = missingForReview(listing);
    if (Object.keys(missing).length) throw validationError(missing);
    listing.status = "pending";
    listing.rejectionReason = undefined;
    await listing.save({ session });
    return listing;
  });
  return populated(doc);
}
