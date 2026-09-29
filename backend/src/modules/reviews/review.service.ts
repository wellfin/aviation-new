import type { ClientSession, Types } from "mongoose";
import { isDuplicateKeyError, isObjectId, withTransaction } from "../../lib/db.js";
import { AppError, forbidden, notFound } from "../../lib/errors.js";
import { containsRegex, type Paginated, paginated, skipFor } from "../../lib/pagination.js";
import { Provider, type ReviewDTO } from "../providers/provider.model.js";
import type { UserDoc } from "../users/user.model.js";
import { Review, type ReviewAttrs } from "./review.model.js";
import type { AdminListQuery, CreateReviewInput } from "./review.schemas.js";

type ReviewLike = Omit<ReviewAttrs, "provider"> & { _id: Types.ObjectId; provider: unknown; createdAt: Date; updatedAt: Date };

interface ProviderRef {
  id: string;
  slug: string;
  name: string;
}

/** Public shape — matches the frontend `Review` type. */
export function toReviewDTO(r: ReviewLike): ReviewDTO {
  return {
    id: String(r._id),
    author: r.authorName,
    role: r.authorRole ?? "",
    rating: r.rating,
    date: r.createdAt.toISOString(),
    title: r.title,
    body: r.body,
  };
}

/** Normalises a populated (or bare-id) provider reference. */
function providerRef(value: unknown): ProviderRef {
  if (typeof value === "object" && value !== null && "slug" in value) {
    const p = value as { _id: Types.ObjectId; slug: string; name: string };
    return { id: String(p._id), slug: p.slug, name: p.name };
  }
  return { id: String(value), slug: "", name: "" };
}

/** What the author sees about their own review (includes moderation state). */
export function toOwnReviewDTO(r: ReviewLike) {
  return {
    ...toReviewDTO(r),
    status: r.status,
    provider: providerRef(r.provider),
    moderationNote: r.status === "rejected" ? (r.moderationNote ?? "") : "",
    updatedAt: r.updatedAt.toISOString(),
  };
}

/** Staff moderation view. */
export function toAdminReviewDTO(r: ReviewLike) {
  return {
    ...toOwnReviewDTO(r),
    authorId: String(r.author),
    moderatedBy: r.moderatedBy ? String(r.moderatedBy) : null,
    moderatedAt: r.moderatedAt?.toISOString() ?? null,
    moderationNote: r.moderationNote ?? "",
  };
}

/** "Jane D." — a reviewer's full surname is never shown publicly. */
export function publicAuthorName(user: Pick<UserDoc, "firstName" | "lastName">): string {
  const initial = user.lastName.trim().charAt(0).toUpperCase();
  return initial ? `${user.firstName.trim()} ${initial}.` : user.firstName.trim();
}

/**
 * Recomputes rating/reviewCount from approved reviews. Must run inside the same
 * transaction as the status change: concurrent recomputations write the same
 * provider document, so MongoDB raises a write conflict and the loser retries
 * with a fresh snapshot — the stored aggregate can never go stale.
 */
export async function recomputeProviderAggregates(providerId: Types.ObjectId, session: ClientSession): Promise<void> {
  const [agg] = await Review.aggregate<{ avg: number; count: number }>([
    { $match: { provider: providerId, status: "approved" } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]).session(session);
  await Provider.updateOne({ _id: providerId }, { $set: { rating: agg?.avg ?? 0, reviewCount: agg?.count ?? 0 } }, { session });
}

async function findPublishedProvider(slug: string) {
  const provider = await Provider.findOne({ slug, status: "published" }).select("_id owner slug name").lean();
  if (!provider) throw notFound("Provider");
  return provider;
}

export async function listApprovedReviews(slug: string, page: number, pageSize: number): Promise<Paginated<ReviewDTO>> {
  const provider = await findPublishedProvider(slug);
  const filter = { provider: provider._id, status: "approved" as const };
  const [items, total] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skipFor(page, pageSize)).limit(pageSize).lean(),
    Review.countDocuments(filter),
  ]);
  return paginated(items.map(toReviewDTO), total, page, pageSize);
}

const duplicateReview = () => new AppError(409, "DUPLICATE_REVIEW", "You've already reviewed this provider.");

export async function createReview(slug: string, user: UserDoc, input: CreateReviewInput) {
  const provider = await findPublishedProvider(slug);
  if (provider.owner?.equals(user._id)) throw forbidden("You can't review your own listing.");
  if (await Review.exists({ provider: provider._id, author: user._id })) throw duplicateReview();
  try {
    const review = await Review.create({
      provider: provider._id,
      author: user._id,
      authorName: publicAuthorName(user),
      authorRole: input.role ?? "",
      rating: input.rating,
      title: input.title,
      body: input.body,
      status: "pending",
    });
    return toOwnReviewDTO({ ...review.toObject(), provider });
  } catch (err) {
    // Race between the exists() check and the insert — the unique index is the source of truth.
    if (isDuplicateKeyError(err)) throw duplicateReview();
    throw err;
  }
}

export async function listOwnReviews(user: UserDoc, page: number, pageSize: number) {
  const filter = { author: user._id };
  const [items, total] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skipFor(page, pageSize)).limit(pageSize).populate("provider", "slug name").lean<ReviewLike[]>(),
    Review.countDocuments(filter),
  ]);
  return paginated(items.map(toOwnReviewDTO), total, page, pageSize);
}

/** Deletes the review matching `filter` and keeps provider aggregates exact. */
async function deleteWhere(filter: { _id: string; author?: Types.ObjectId }): Promise<void> {
  await withTransaction(async (session) => {
    const review = await Review.findOneAndDelete(filter, { session });
    if (!review) throw notFound("Review");
    if (review.status === "approved") await recomputeProviderAggregates(review.provider, session);
  });
}

export async function deleteOwnReview(user: UserDoc, id: string): Promise<void> {
  await deleteWhere({ _id: id, author: user._id });
}

export async function deleteAnyReview(id: string): Promise<void> {
  await deleteWhere({ _id: id });
}

/** Resolves a provider filter given as an id or a slug. */
async function providerIdsFor(ref: string): Promise<Types.ObjectId[]> {
  const found = await Provider.find(isObjectId(ref) ? { _id: ref } : { slug: ref.toLowerCase() }).select("_id").lean();
  return found.map((p) => p._id);
}

export async function adminListReviews(query: AdminListQuery) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.provider) filter.provider = { $in: await providerIdsFor(query.provider) };
  if (query.q) {
    const rx = containsRegex(query.q);
    filter.$or = [{ title: rx }, { body: rx }, { authorName: rx }];
  }
  const [items, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skipFor(query.page, query.pageSize))
      .limit(query.pageSize)
      .populate("provider", "slug name")
      .lean<ReviewLike[]>(),
    Review.countDocuments(filter),
  ]);
  return paginated(items.map(toAdminReviewDTO), total, query.page, query.pageSize);
}

/** Approves or rejects a review and recomputes the provider's aggregates in the same transaction. */
export async function moderateReview(id: string, moderator: UserDoc, status: "approved" | "rejected", note?: string) {
  await withTransaction(async (session) => {
    const review = await Review.findById(id).session(session);
    if (!review) throw notFound("Review");
    const affectsAggregates = review.status === "approved" || status === "approved";
    review.status = status;
    review.moderatedBy = moderator._id;
    review.moderatedAt = new Date();
    review.moderationNote = status === "rejected" ? (note ?? "") : undefined;
    await review.save({ session });
    if (affectsAggregates) await recomputeProviderAggregates(review.provider, session);
  });
  const saved = await Review.findById(id).populate("provider", "slug name").lean<ReviewLike>();
  if (!saved) throw notFound("Review");
  return toAdminReviewDTO(saved);
}
