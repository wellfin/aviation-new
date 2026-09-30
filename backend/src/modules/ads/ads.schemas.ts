import { z } from "zod";
import { isObjectId } from "../../lib/db.js";
import { paginationQuery } from "../../lib/pagination.js";
import { imageRef } from "../news/news.schemas.js";
import { AD_PLACEMENTS, isSafeAdHref } from "./ad.model.js";

export const idParams = z.object({ id: z.string().refine(isObjectId, "Invalid id") });

export const serveQuery = z.object({ placement: z.enum(AD_PLACEMENTS) });

export const trafficQuery = z.object({ placement: z.enum(AD_PLACEMENTS).optional() });

export const adminAdsQuery = paginationQuery.extend({
  placement: z.enum(AD_PLACEMENTS).optional(),
  active: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  q: z.string().trim().max(100).optional(),
});

const href = z.string().trim().min(1).max(1000).refine(isSafeAdHref, "Use an http(s) URL or a site path starting with /");
const optionalText = (max: number) => z.string().trim().max(max).nullable();
const date = z.iso.datetime({ offset: true }).nullable();

const adFields = {
  placement: z.enum(AD_PLACEMENTS),
  advertiser: z.string().trim().min(2).max(120),
  headline: optionalText(160),
  body: optionalText(500),
  image: imageRef,
  href,
  cta: optionalText(60),
  active: z.boolean(),
  startsAt: date,
  endsAt: date,
  weight: z.number().int().min(1).max(100),
};

const windowIsValid = (v: { startsAt?: string | null; endsAt?: string | null }) =>
  !v.startsAt || !v.endsAt || new Date(v.startsAt) < new Date(v.endsAt);
const windowError = { message: "End must be after start", path: ["endsAt"] };

export const createAdBody = z
  .object({
    ...adFields,
    headline: adFields.headline.optional(),
    body: adFields.body.optional(),
    cta: adFields.cta.optional(),
    active: adFields.active.default(true),
    startsAt: date.optional(),
    endsAt: date.optional(),
    weight: adFields.weight.default(50),
  })
  .refine(windowIsValid, windowError);

export const updateAdBody = z
  .object(adFields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update")
  .refine(windowIsValid, windowError);

export type CreateAdInput = z.infer<typeof createAdBody>;
export type UpdateAdInput = z.infer<typeof updateAdBody>;
export type AdminAdsQuery = z.infer<typeof adminAdsQuery>;
