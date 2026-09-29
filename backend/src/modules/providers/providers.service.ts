import type { ClientSession, SortOrder, Types } from "mongoose";
import { validationError, notFound } from "../../lib/errors.js";
import { containsRegex, escapeRegex, paginated, skipFor, type Paginated } from "../../lib/pagination.js";
import { Airport } from "../airports/airport.model.js";
import { PROVIDER_TIERS, TIER_RANK, type ProviderTier } from "../catalog/categories.js";
import { Review } from "../reviews/review.model.js";
import { AIRPORT_REF_FIELDS, Provider, type ProviderDoc, type ProviderDTO, type ReviewDTO, toProviderDTO } from "./provider.model.js";
import type { ListProvidersQuery } from "./providers.schemas.js";

/**
 * Paid tiers rank first by sorting `tier` descending. That relies on the tier
 * names sorting lexicographically in rank order (ultra_pro > pro > basic);
 * fail fast at startup if someone adds a tier that breaks it.
 */
const lexicalTierOrder = [...PROVIDER_TIERS].sort().map((t) => TIER_RANK[t]);
if (lexicalTierOrder.some((rank, i) => i > 0 && rank <= lexicalTierOrder[i - 1]!)) {
  throw new Error("PROVIDER_TIERS no longer sort lexicographically by rank — update provider ranking.");
}

type SortSpec = Record<string, SortOrder>;

const PUBLIC_SORTS: Record<ListProvidersQuery["sort"], SortSpec> = {
  rating: { tier: -1, rating: -1, reviewCount: -1, _id: 1 },
  reviews: { tier: -1, reviewCount: -1, rating: -1, _id: 1 },
  name: { tier: -1, name: 1, _id: 1 },
  newest: { tier: -1, publishedAt: -1, _id: -1 },
};

/** Case-insensitive name ordering (matches the UI's localeCompare). */
const NAME_COLLATION = { locale: "en", strength: 2 } as const;

const MAX_SEARCH_TERMS = 6;

/**
 * Every word of `q` must match somewhere: name, summary, city, country, category,
 * an airport code, or the name/city of a served airport (resolved in one query).
 */
async function searchClauses(q: string): Promise<Array<Record<string, unknown>>> {
  const terms = [...new Set(q.split(/\s+/).filter(Boolean))].slice(0, MAX_SEARCH_TERMS);
  if (terms.length === 0) return [];
  const anyTerm = new RegExp(terms.map((t) => escapeRegex(t.slice(0, 100))).join("|"), "i");
  const airports = await Airport.find({ $or: [{ shortName: anyTerm }, { name: anyTerm }, { city: anyTerm }] }, { name: 1, shortName: 1, city: 1 })
    .limit(500)
    .lean();
  return terms.map((term) => {
    const rx = containsRegex(term);
    const airportIds = airports.filter((a) => rx.test(a.name) || rx.test(a.shortName) || rx.test(a.city)).map((a) => a._id);
    return {
      $or: [
        { name: rx },
        { summary: rx },
        { city: rx },
        { country: rx },
        { category: rx },
        { airportCodes: rx },
        ...(airportIds.length ? [{ airports: { $in: airportIds } }] : []),
      ],
    };
  });
}

export async function listPublishedProviders(query: ListProvidersQuery): Promise<Paginated<ProviderDTO>> {
  const filter: Record<string, unknown> = { status: "published" };
  if (query.category !== "all") filter.category = query.category;
  if (query.tier !== "all") filter.tier = query.tier;
  if (query.country) filter.countryCode = query.country;
  if (query.airport) filter.airportCodes = query.airport;
  if (query.q) {
    const clauses = await searchClauses(query.q);
    if (clauses.length) filter.$and = clauses;
  }
  const find = Provider.find(filter)
    .sort(PUBLIC_SORTS[query.sort])
    .skip(skipFor(query.page, query.pageSize))
    .limit(query.pageSize)
    .populate("airports", AIRPORT_REF_FIELDS);
  if (query.sort === "name") find.collation(NAME_COLLATION);
  const [items, total] = await Promise.all([find, Provider.countDocuments(filter)]);
  return paginated(
    items.map((p) => toProviderDTO(p)),
    total,
    query.page,
    query.pageSize,
  );
}

const MAX_PROFILE_REVIEWS = 20;

export async function latestApprovedReviews(providerId: Types.ObjectId, limit = MAX_PROFILE_REVIEWS): Promise<ReviewDTO[]> {
  const reviews = await Review.find({ provider: providerId, status: "approved" }).sort({ createdAt: -1 }).limit(limit).lean();
  return reviews.map((r) => ({
    id: String(r._id),
    author: r.authorName,
    role: r.authorRole ?? "",
    rating: r.rating,
    date: r.createdAt.toISOString().slice(0, 10),
    title: r.title,
    body: r.body,
  }));
}

async function publishedBySlug(slug: string): Promise<ProviderDoc> {
  const provider = await Provider.findOne({ slug, status: "published" }).populate("airports", AIRPORT_REF_FIELDS);
  if (!provider) throw notFound("Provider");
  return provider;
}

export async function getPublishedProvider(slug: string): Promise<ProviderDTO> {
  const provider = await publishedBySlug(slug);
  return toProviderDTO(provider, { reviews: await latestApprovedReviews(provider._id) });
}

export async function relatedProviders(slug: string, limit: number): Promise<ProviderDTO[]> {
  const provider = await Provider.findOne({ slug, status: "published" }, { category: 1, countryCode: 1 });
  if (!provider) throw notFound("Provider");
  const related = await Provider.find({
    status: "published",
    _id: { $ne: provider._id },
    $or: [{ category: provider.category }, { countryCode: provider.countryCode }],
  })
    .sort(PUBLIC_SORTS.rating)
    .limit(limit)
    .populate("airports", AIRPORT_REF_FIELDS);
  return related.map((p) => toProviderDTO(p));
}

/* ------------------------------------------------------ shared helpers -- */

/**
 * Resolves ICAO codes to airport ids plus the denormalised ICAO+IATA codes used
 * for filtering. Unknown codes are a validation error, never silently dropped.
 */
export async function resolveAirports(icaos: string[], session?: ClientSession): Promise<{ ids: Types.ObjectId[]; codes: string[] }> {
  const unique = [...new Set(icaos)];
  const found = await Airport.find({ icao: { $in: unique } }, { icao: 1, iata: 1 })
    .session(session ?? null)
    .lean();
  const byIcao = new Map(found.map((a) => [a.icao, a]));
  const missing = unique.filter((c) => !byIcao.has(c));
  if (missing.length) throw validationError({ airports: `Unknown airport code${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}` });
  const ordered = unique.map((c) => byIcao.get(c)!);
  return { ids: ordered.map((a) => a._id), codes: ordered.flatMap((a) => (a.iata ? [a.icao, a.iata] : [a.icao])) };
}

/** ICAO codes (only) among a provider's denormalised airport codes. */
export function icaosOf(codes: readonly string[] | undefined | null): string[] {
  return (codes ?? []).filter((c) => c.length === 4);
}

export function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/, "");
  return base || "provider";
}

/** First free slug of the form `base`, `base-2`, `base-3`… (the unique index is the final guard). */
export async function uniqueSlug(name: string, session?: ClientSession, excludeId?: Types.ObjectId): Promise<string> {
  const base = slugify(name);
  const taken = await Provider.find(
    { slug: new RegExp(`^${escapeRegex(base)}(-\\d+)?$`), ...(excludeId ? { _id: { $ne: excludeId } } : {}) },
    { slug: 1 },
  )
    .session(session ?? null)
    .lean();
  const used = new Set(taken.map((p) => p.slug));
  if (!used.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

/** What each subscription tier may show on its profile. */
export const TIER_LIMITS: Record<ProviderTier, { galleryImages: number; video: boolean; socials: boolean }> = {
  basic: { galleryImages: 4, video: false, socials: false },
  pro: { galleryImages: 12, video: false, socials: true },
  ultra_pro: { galleryImages: 30, video: true, socials: true },
};

const TIER_LABEL: Record<ProviderTier, string> = { basic: "Basic", pro: "Pro", ultra_pro: "Ultra Pro" };

/** Enforces plan limits on the fields being written (422 with a per-field explanation). */
export function assertTierLimits(
  tier: ProviderTier,
  input: { gallery?: string[] | undefined; videoUrl?: string | undefined; socials?: Record<string, string | undefined> | undefined },
): void {
  const limits = TIER_LIMITS[tier];
  const errors: Record<string, string> = {};
  if (input.gallery && input.gallery.length > limits.galleryImages) {
    errors.gallery = `The ${TIER_LABEL[tier]} plan allows up to ${limits.galleryImages} gallery images. Upgrade to add more.`;
  }
  if (input.videoUrl && !limits.video) {
    errors.videoUrl = `Profile videos are available on the Ultra Pro plan.`;
  }
  if (input.socials && !limits.socials && Object.values(input.socials).some(Boolean)) {
    errors.socials = `Social media links are available on the Pro and Ultra Pro plans.`;
  }
  if (Object.keys(errors).length) throw validationError(errors);
}

/** Listing view for its owner and staff: the public DTO plus workflow state. */
export function toListingDTO(p: ProviderDoc) {
  return {
    ...toProviderDTO(p),
    status: p.status,
    rejectionReason: p.rejectionReason ?? null,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    limits: TIER_LIMITS[p.tier],
  };
}
