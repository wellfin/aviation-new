import { type HydratedDocument, type InferSchemaType, Schema, model } from "mongoose";

/** Mirrors FAQ_CATEGORIES in the frontend's mock/faq.ts. */
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

const faqSchema = new Schema(
  {
    question: { type: String, required: true, trim: true, maxlength: 300 },
    answer: { type: String, required: true, trim: true, maxlength: 5000 },
    category: { type: String, enum: FAQ_CATEGORIES, required: true },
    order: { type: Number, required: true, default: 0 },
    published: { type: Boolean, default: true },
  },
  { timestamps: true },
);

faqSchema.index({ published: 1, order: 1 });
faqSchema.index({ published: 1, category: 1, order: 1 });
faqSchema.index({ order: 1 });

export type FaqAttrs = InferSchemaType<typeof faqSchema>;
export type FaqDoc = HydratedDocument<FaqAttrs>;
export const Faq = model("Faq", faqSchema);

/** Public shape — exactly the frontend's `FaqItem`. */
export interface FaqItemDTO {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export function toFaqDTO(f: FaqDoc): FaqItemDTO {
  return { id: f.id, category: f.category, question: f.question, answer: f.answer };
}

export interface AdminFaqDTO extends FaqItemDTO {
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toAdminFaqDTO(f: FaqDoc): AdminFaqDTO {
  return {
    ...toFaqDTO(f),
    order: f.order,
    published: f.published ?? true,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}
