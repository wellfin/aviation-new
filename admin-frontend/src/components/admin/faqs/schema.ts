import { z } from "zod";

/** Mirrors FAQ_CATEGORIES in the API (faq.model.ts). */
export const FAQ_CATEGORIES = [
  "Account & Registration",
  "Membership",
  "Aviation Directory",
  "Airport Search",
  "Service Providers",
  "Subscriptions",
  "Data Licence",
  "Advertisements",
  "Aviation Tools",
] as const;
export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export interface AdminFaq {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors the backend `createFaqBody` / `updateFaqBody`. */
export const faqFormSchema = z.object({
  question: z.string().trim().min(5, "Use at least 5 characters").max(300, "Use at most 300 characters"),
  answer: z.string().trim().min(5, "Use at least 5 characters").max(5000, "Use at most 5000 characters"),
  category: z.enum(FAQ_CATEGORIES, "Choose a category"),
  published: z.boolean(),
});
export type FaqFormValues = z.input<typeof faqFormSchema>;
