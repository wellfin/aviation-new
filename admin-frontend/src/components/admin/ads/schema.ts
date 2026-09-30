import { z } from "zod";
import { imageRef } from "@/components/admin/news/schema";

export const AD_PLACEMENTS = ["header-banner", "sidebar", "sponsored-strip", "sticky-footer", "inline"] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

/**
 * Placements the website actually renders. "inline" is still accepted by the API but has
 * no slot on any page yet, so it isn't offered when creating ads or filtering.
 */
export const SELECTABLE_PLACEMENTS: readonly AdPlacement[] = AD_PLACEMENTS.filter((p) => p !== "inline");

export const PLACEMENT_LABEL: Record<AdPlacement, string> = {
  "header-banner": "Header banner",
  sidebar: "Sidebar card",
  "sponsored-strip": "Sponsored strip",
  "sticky-footer": "Sticky footer",
  inline: "Inline banner",
};

export const PLACEMENT_HINT: Record<AdPlacement, string> = {
  "header-banner": "Full-width banner on listing pages. Shows advertiser, headline, body (large screens) and CTA over the image. Image: 2700×900 px, no text.",
  sidebar: "Dark card on listing sidebars. Shows advertiser, headline, body and CTA over the dimmed image. Image: 2700×900 px, no text.",
  "sponsored-strip": "Strip between results and sponsor cards. Shows advertiser, headline, one line of body and a CTA. Image: 2700×900 px, no text.",
  "sticky-footer": "Collapsible bar pinned to the bottom of desktop screens. Shows advertiser, headline, body and CTA. Image: 2700×900 px, no text.",
  inline: "Not shown on the website yet.",
};

export interface AdminAd {
  id: string;
  placement: AdPlacement;
  advertiser: string;
  headline: string | null;
  body: string | null;
  image: string;
  href: string;
  cta: string | null;
  clickUrl: string;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  weight: number;
  impressions: number;
  clicks: number;
  ctr: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlacementStats {
  placement: AdPlacement;
  ads: number;
  activeAds: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

/** Same rule as the API's `isSafeAdHref`: a site path or an absolute http(s) URL — never javascript:/data:. */
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

const optionalText = (max: number) => z.string().trim().max(max, `Use at most ${max} characters`);

/** `datetime-local` value ("2026-10-01T09:30") or empty. */
const localDateTime = z.string().refine((v) => v === "" || !Number.isNaN(new Date(v).getTime()), "Enter a valid date and time");

/** Form-level mirror of the backend `createAdBody` / `updateAdBody`. */
export const adFormSchema = z
  .object({
    placement: z.enum(AD_PLACEMENTS, "Choose a placement"),
    advertiser: z.string().trim().min(2, "Use at least 2 characters").max(120, "Use at most 120 characters"),
    headline: optionalText(160),
    body: optionalText(500),
    image: imageRef,
    href: z.string().trim().min(1, "Link is required").max(1000, "Use at most 1000 characters").refine(isSafeAdHref, "Use an http(s) URL or a site path starting with /"),
    cta: optionalText(60),
    active: z.boolean(),
    startsAt: localDateTime,
    endsAt: localDateTime,
    weight: z.number("Enter a number").int("Use a whole number").min(1, "Minimum 1").max(100, "Maximum 100"),
  })
  .refine((v) => !v.startsAt || !v.endsAt || new Date(v.startsAt) < new Date(v.endsAt), { message: "End must be after start", path: ["endsAt"] });

export type AdFormValues = z.input<typeof adFormSchema>;

/** Current delivery state, from the active flag and the schedule window. */
export function adState(ad: Pick<AdminAd, "active" | "startsAt" | "endsAt">, now = Date.now()): "active" | "paused" | "scheduled" | "ended" {
  if (!ad.active) return "paused";
  if (ad.endsAt && new Date(ad.endsAt).getTime() <= now) return "ended";
  if (ad.startsAt && new Date(ad.startsAt).getTime() > now) return "scheduled";
  return "active";
}
