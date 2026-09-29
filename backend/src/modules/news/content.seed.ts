import { Ad } from "../ads/ad.model.js";
import { ADS_SEED } from "../ads/ads.seed-data.js";
import { Faq } from "../faqs/faq.model.js";
import { FAQ_SEED } from "../faqs/faqs.seed-data.js";
import { PricingPlan } from "../pricing/pricing-plan.model.js";
import { PRICING_SEED } from "../pricing/pricing.seed-data.js";
import { computeReadMinutes, News } from "./news.model.js";
import { NEWS_SEED } from "./news.seed-data.js";

export interface ContentSeedResult {
  news: number;
  faqs: number;
  ads: number;
  pricingPlans: number;
}

/**
 * Idempotently inserts the demo content (news, FAQs, ads, pricing plans).
 * Uses $setOnInsert so re-running never overwrites edits made in the admin.
 * Returns how many documents were newly inserted per collection.
 */
export async function seedContent(): Promise<ContentSeedResult> {
  const [news, faqs, ads, pricingPlans] = await Promise.all([
    News.bulkWrite(
      NEWS_SEED.map((n) => ({
        updateOne: {
          filter: { slug: n.slug },
          update: {
            $setOnInsert: {
              ...n,
              publishedAt: new Date(n.publishedAt),
              readMinutes: computeReadMinutes(n.body),
              status: "published" as const,
            },
          },
          upsert: true,
        },
      })),
    ),
    Faq.bulkWrite(
      FAQ_SEED.map((f, order) => ({
        updateOne: { filter: { question: f.question }, update: { $setOnInsert: { ...f, order, published: true } }, upsert: true },
      })),
    ),
    Ad.bulkWrite(
      ADS_SEED.map((a) => ({
        updateOne: {
          filter: { placement: a.placement, advertiser: a.advertiser },
          update: { $setOnInsert: { ...a, active: true, weight: 50, impressions: 0, clicks: 0 } },
          upsert: true,
        },
      })),
    ),
    PricingPlan.bulkWrite(
      PRICING_SEED.map(({ id, ...p }, order) => ({
        updateOne: { filter: { _id: id }, update: { $setOnInsert: { ...p, currency: "INR", active: true, order } }, upsert: true },
      })),
    ),
  ]);
  return { news: news.upsertedCount, faqs: faqs.upsertedCount, ads: ads.upsertedCount, pricingPlans: pricingPlans.upsertedCount };
}
