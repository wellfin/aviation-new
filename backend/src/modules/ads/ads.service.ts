import { randomInt } from "node:crypto";
import { env } from "../../config/env.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { containsRegex, paginated, skipFor, type Paginated } from "../../lib/pagination.js";
import { Ad, type AdDoc, type AdPlacement, AD_PLACEMENTS, ctrOf, toAdDTO, toAdminAdDTO, type AdminAdDTO, type AdvertisementDTO } from "./ad.model.js";
import type { AdminAdsQuery, CreateAdInput, UpdateAdInput } from "./ads.schemas.js";

/** Upper bound on candidates considered per placement; far above any realistic rotation. */
const MAX_CANDIDATES = 100;

function inWindowFilter(placement: AdPlacement, now: Date) {
  return {
    placement,
    active: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] },
    ],
  };
}

/** Picks one item with probability proportional to its weight. */
export function pickWeighted<T extends { weight: number }>(items: readonly T[], rand: (maxExclusive: number) => number = randomInt): T | null {
  const total = items.reduce((sum, i) => sum + Math.max(1, i.weight), 0);
  if (items.length === 0 || total <= 0) return null;
  let roll = rand(total);
  for (const item of items) {
    roll -= Math.max(1, item.weight);
    if (roll < 0) return item;
  }
  return items[items.length - 1] ?? null;
}

/** Chooses an eligible ad for `placement` and records the impression atomically. */
export async function serveAd(placement: AdPlacement): Promise<AdvertisementDTO | null> {
  const candidates = await Ad.find(inWindowFilter(placement, new Date())).limit(MAX_CANDIDATES);
  const chosen = pickWeighted(candidates);
  if (!chosen) return null;
  await Ad.updateOne({ _id: chosen._id }, { $inc: { impressions: 1 } });
  return toAdDTO(chosen);
}

/**
 * Records a click and returns the absolute redirect target. The target is only
 * ever the ad's stored (validated) href; site-relative hrefs resolve against the frontend.
 */
export async function registerClick(id: string): Promise<string> {
  const ad = await Ad.findOneAndUpdate({ _id: id }, { $inc: { clicks: 1 } }, { returnDocument: "after", projection: { href: 1 } });
  if (!ad) throw notFound("Advertisement");
  return ad.href.startsWith("/") ? `${env.FRONTEND_URL.replace(/\/+$/, "")}${ad.href}` : ad.href;
}

export async function listAdminAds(query: AdminAdsQuery): Promise<Paginated<AdminAdDTO>> {
  const filter: Record<string, unknown> = {};
  if (query.placement) filter.placement = query.placement;
  if (query.active !== undefined) filter.active = query.active;
  if (query.q) {
    const rx = containsRegex(query.q);
    filter.$or = [{ advertiser: rx }, { headline: rx }];
  }
  const [items, total] = await Promise.all([
    Ad.find(filter).sort({ createdAt: -1 }).skip(skipFor(query.page, query.pageSize)).limit(query.pageSize),
    Ad.countDocuments(filter),
  ]);
  return paginated(items.map(toAdminAdDTO), total, query.page, query.pageSize);
}

export interface PlacementStats {
  placement: AdPlacement;
  ads: number;
  activeAds: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

/** Totals per placement (every placement is listed, including empty ones). */
export async function adStats(): Promise<PlacementStats[]> {
  const rows = await Ad.aggregate<{ _id: AdPlacement; ads: number; activeAds: number; impressions: number; clicks: number }>([
    {
      $group: {
        _id: "$placement",
        ads: { $sum: 1 },
        activeAds: { $sum: { $cond: ["$active", 1, 0] } },
        impressions: { $sum: "$impressions" },
        clicks: { $sum: "$clicks" },
      },
    },
  ]);
  const byPlacement = new Map(rows.map((r) => [r._id, r]));
  return AD_PLACEMENTS.map((placement) => {
    const r = byPlacement.get(placement);
    const impressions = r?.impressions ?? 0;
    const clicks = r?.clicks ?? 0;
    return { placement, ads: r?.ads ?? 0, activeAds: r?.activeAds ?? 0, impressions, clicks, ctr: ctrOf(impressions, clicks) };
  });
}

async function findAd(id: string): Promise<AdDoc> {
  const ad = await Ad.findById(id);
  if (!ad) throw notFound("Advertisement");
  return ad;
}

export async function getAdminAd(id: string): Promise<AdminAdDTO> {
  return toAdminAdDTO(await findAd(id));
}

const toDate = (v: string | null | undefined) => (v ? new Date(v) : undefined);
const orUndefined = (v: string | null | undefined) => (v ? v : undefined);

export async function createAd(input: CreateAdInput): Promise<AdminAdDTO> {
  const ad = await Ad.create({
    placement: input.placement,
    advertiser: input.advertiser,
    headline: orUndefined(input.headline),
    body: orUndefined(input.body),
    image: input.image,
    href: input.href,
    cta: orUndefined(input.cta),
    active: input.active,
    startsAt: toDate(input.startsAt),
    endsAt: toDate(input.endsAt),
    weight: input.weight,
  });
  return toAdminAdDTO(ad);
}

export async function updateAd(id: string, input: UpdateAdInput): Promise<AdminAdDTO> {
  const ad = await findAd(id);
  if (input.placement !== undefined) ad.placement = input.placement;
  if (input.advertiser !== undefined) ad.advertiser = input.advertiser;
  if (input.headline !== undefined) ad.headline = orUndefined(input.headline);
  if (input.body !== undefined) ad.body = orUndefined(input.body);
  if (input.image !== undefined) ad.image = input.image;
  if (input.href !== undefined) ad.href = input.href;
  if (input.cta !== undefined) ad.cta = orUndefined(input.cta);
  if (input.active !== undefined) ad.active = input.active;
  if (input.startsAt !== undefined) ad.startsAt = toDate(input.startsAt);
  if (input.endsAt !== undefined) ad.endsAt = toDate(input.endsAt);
  if (input.weight !== undefined) ad.weight = input.weight;
  // A partial update may move only one end of the window, so re-check against stored values.
  if (ad.startsAt && ad.endsAt && ad.startsAt >= ad.endsAt) throw badRequest("End must be after start.", { endsAt: "End must be after start" });
  await ad.save();
  return toAdminAdDTO(ad);
}

export async function deleteAd(id: string): Promise<void> {
  const res = await Ad.deleteOne({ _id: id });
  if (res.deletedCount === 0) throw notFound("Advertisement");
}
