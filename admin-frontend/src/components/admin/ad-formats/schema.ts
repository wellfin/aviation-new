import { z } from "zod";

/** `GET /admin/ad-formats` item; `id` is the format's key. */
export interface AdFormat {
  id: string;
  icon: string;
  title: string;
  description: string;
  priceLabel: string;
  order: number;
  active: boolean;
}

export const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Mirrors the backend create/update bodies (ad-format.routes.ts). */
export const adFormatFormSchema = z.object({
  key: z.string().trim().toLowerCase().min(1, "Id is required").max(60, "Use at most 60 characters").regex(KEY_PATTERN, "Use lowercase letters, numbers and dashes"),
  icon: z.string().trim().max(8, "Use a single emoji or a short symbol"),
  title: z.string().trim().min(2, "Use at least 2 characters").max(80, "Use at most 80 characters"),
  description: z.string().trim().min(5, "Use at least 5 characters").max(300, "Use at most 300 characters"),
  priceLabel: z.string().trim().max(60, "Use at most 60 characters"),
  active: z.boolean(),
});
export type AdFormatFormValues = z.input<typeof adFormatFormSchema>;
