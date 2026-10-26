import { type InferSchemaType, Schema, model } from "mongoose";

/** The categories a new installation starts with (editable in the admin panel). */
export const DEFAULT_NEWS_CATEGORIES = ["Industry News", "FBO Network", "Regulatory", "Fuel", "Technology", "Business Aviation"];

const newsCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    order: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

newsCategorySchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });
newsCategorySchema.index({ order: 1 });

export type NewsCategoryAttrs = InferSchemaType<typeof newsCategorySchema>;
export const NewsCategoryModel = model("NewsCategory", newsCategorySchema);

export interface NewsCategoryDTO {
  id: string;
  name: string;
  order: number;
  /** Articles filed under it (admin only). */
  articles?: number;
}
