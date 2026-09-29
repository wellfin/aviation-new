import { type HydratedDocument, type InferSchemaType, Schema, model } from "mongoose";
import { env } from "../../config/env.js";

/** Mirrors `Advertisement["placement"]` in the frontend's types.ts. */
export const AD_PLACEMENTS = ["header-banner", "sidebar", "sponsored-strip", "sticky-footer", "inline"] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

/** Accepts only absolute http(s) URLs or site-relative paths — never javascript:, data:, or protocol-relative URLs. */
export function isSafeAdHref(href: string): boolean {
  if (href.startsWith("/")) return !href.startsWith("//") && !href.includes("\\") && !/\s/.test(href);
  if (!/^https?:\/\/[^/\\]/i.test(href)) return false;
  try {
    const url = new URL(href);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname) && !/\s/.test(href);
  } catch {
    return false;
  }
}

const adSchema = new Schema(
  {
    placement: { type: String, enum: AD_PLACEMENTS, required: true },
    advertiser: { type: String, required: true, trim: true, maxlength: 120 },
    headline: { type: String, trim: true, maxlength: 160 },
    body: { type: String, trim: true, maxlength: 500 },
    image: { type: String, required: true, trim: true, maxlength: 500 },
    href: { type: String, required: true, trim: true, maxlength: 1000, validate: { validator: isSafeAdHref, message: "Invalid link" } },
    cta: { type: String, trim: true, maxlength: 60 },
    active: { type: Boolean, default: true },
    startsAt: { type: Date },
    endsAt: { type: Date },
    weight: { type: Number, default: 50, min: 1, max: 100 },
    impressions: { type: Number, default: 0, min: 0 },
    clicks: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// Serving: active ads for a placement, then filtered by schedule window.
adSchema.index({ placement: 1, active: 1, startsAt: 1, endsAt: 1 });
adSchema.index({ createdAt: -1 });

export type AdAttrs = InferSchemaType<typeof adSchema>;
export type AdDoc = HydratedDocument<AdAttrs>;
export const Ad = model("Ad", adSchema);

/** Tracking URL that counts a click and redirects to the stored href. */
export function adClickUrl(id: string): string {
  return `${env.PUBLIC_API_URL}/api/v1/ads/${id}/click`;
}

/**
 * Public shape: the frontend's `Advertisement` (href is the advertiser's link, unchanged)
 * plus `clickUrl`, which the frontend can use instead of href to record clicks.
 */
export interface AdvertisementDTO {
  id: string;
  placement: AdPlacement;
  advertiser: string;
  headline?: string;
  body?: string;
  image: string;
  href: string;
  cta?: string;
  clickUrl: string;
}

export function toAdDTO(a: AdDoc): AdvertisementDTO {
  const dto: AdvertisementDTO = { id: a.id, placement: a.placement, advertiser: a.advertiser, image: a.image, href: a.href, clickUrl: adClickUrl(a.id) };
  if (a.headline) dto.headline = a.headline;
  if (a.body) dto.body = a.body;
  if (a.cta) dto.cta = a.cta;
  return dto;
}

export interface AdminAdDTO extends Omit<AdvertisementDTO, "headline" | "body" | "cta"> {
  headline: string | null;
  body: string | null;
  cta: string | null;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  weight: number;
  impressions: number;
  clicks: number;
  /** Click-through rate as a percentage with two decimals. */
  ctr: number;
  createdAt: string;
  updatedAt: string;
}

export function ctrOf(impressions: number, clicks: number): number {
  return impressions > 0 ? Math.round((clicks / impressions) * 10_000) / 100 : 0;
}

export function toAdminAdDTO(a: AdDoc): AdminAdDTO {
  return {
    ...toAdDTO(a),
    headline: a.headline ?? null,
    body: a.body ?? null,
    cta: a.cta ?? null,
    active: a.active ?? true,
    startsAt: a.startsAt?.toISOString() ?? null,
    endsAt: a.endsAt?.toISOString() ?? null,
    weight: a.weight,
    impressions: a.impressions,
    clicks: a.clicks,
    ctr: ctrOf(a.impressions, a.clicks),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}
