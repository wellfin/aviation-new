import { z } from "zod";
import { isObjectId } from "../../lib/db.js";
import { FAQ_CATEGORIES } from "./faq.model.js";

export const idParams = z.object({ id: z.string().refine(isObjectId, "Invalid id") });

/** Unknown categories simply match nothing: the frontend passes the raw ?category URL param through. */
export const publicFaqQuery = z.object({ category: z.string().trim().max(100).optional() });

export const adminFaqQuery = z.object({
  category: z.enum(FAQ_CATEGORIES).optional(),
  published: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});

export const createFaqBody = z.object({
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(5).max(5000),
  category: z.enum(FAQ_CATEGORIES),
  published: z.boolean().default(true),
  order: z.number().int().min(0).max(100_000).optional(),
});

export const updateFaqBody = z
  .object({
    question: z.string().trim().min(5).max(300),
    answer: z.string().trim().min(5).max(5000),
    category: z.enum(FAQ_CATEGORIES),
    published: z.boolean(),
    order: z.number().int().min(0).max(100_000),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export const reorderBody = z.object({
  ids: z
    .array(z.string().refine(isObjectId, "Invalid id"))
    .min(1)
    .max(1000)
    .refine((ids) => new Set(ids).size === ids.length, "Duplicate ids"),
});

export type CreateFaqInput = z.infer<typeof createFaqBody>;
export type UpdateFaqInput = z.infer<typeof updateFaqBody>;
export type AdminFaqQuery = z.infer<typeof adminFaqQuery>;
