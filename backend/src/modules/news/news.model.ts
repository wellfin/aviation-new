import { type HydratedDocument, type InferSchemaType, Schema, model } from "mongoose";

/** Mirrors `NewsCategory` in the frontend's types.ts. */
export const NEWS_CATEGORIES = ["Industry News", "FBO Network", "Regulatory", "Fuel", "Technology", "Business Aviation"] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export const NEWS_STATUSES = ["draft", "published"] as const;

const WORDS_PER_MINUTE = 200;

/** Reading time is derived from the body so editors can't let it drift out of sync. */
export function computeReadMinutes(body: readonly string[]): number {
  const words = body.reduce((n, p) => n + (p.trim() ? p.trim().split(/\s+/).length : 0), 0);
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

const newsSchema = new Schema(
  {
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    excerpt: { type: String, required: true, trim: true, maxlength: 500 },
    category: { type: String, enum: NEWS_CATEGORIES, required: true },
    image: { type: String, required: true, trim: true, maxlength: 500 },
    body: { type: [String], default: [] },
    author: { type: String, required: true, trim: true, maxlength: 120 },
    authorRole: { type: String, trim: true, maxlength: 120, default: "" },
    readMinutes: { type: Number, required: true, default: 1, min: 1 },
    featured: { type: Boolean, default: false },
    status: { type: String, enum: NEWS_STATUSES, required: true, default: "draft" },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

newsSchema.pre("validate", function () {
  this.readMinutes = computeReadMinutes(this.body);
});

newsSchema.index({ slug: 1 }, { unique: true });
// Public listing: published, optionally by category, newest first.
newsSchema.index({ status: 1, publishedAt: -1 });
newsSchema.index({ status: 1, category: 1, publishedAt: -1 });
// Admin listing sorts by last update.
newsSchema.index({ updatedAt: -1 });

export type NewsAttrs = InferSchemaType<typeof newsSchema>;
export type NewsDoc = HydratedDocument<NewsAttrs>;
export const News = model("News", newsSchema);

/** Public shape — exactly the frontend's `NewsArticle`. */
export interface NewsArticleDTO {
  slug: string;
  title: string;
  excerpt: string;
  category: NewsCategory;
  image: string;
  publishedAt: string;
  author: string;
  authorRole: string;
  readMinutes: number;
  featured: boolean;
  body: string[];
}

export function toNewsDTO(n: NewsDoc): NewsArticleDTO {
  return {
    slug: n.slug,
    title: n.title,
    excerpt: n.excerpt,
    category: n.category,
    image: n.image,
    publishedAt: (n.publishedAt ?? n.createdAt).toISOString(),
    author: n.author,
    authorRole: n.authorRole ?? "",
    readMinutes: n.readMinutes,
    featured: n.featured ?? false,
    body: [...n.body],
  };
}

export interface AdminNewsDTO extends Omit<NewsArticleDTO, "publishedAt"> {
  id: string;
  status: (typeof NEWS_STATUSES)[number];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toAdminNewsDTO(n: NewsDoc): AdminNewsDTO {
  return {
    ...toNewsDTO(n),
    id: n.id,
    status: n.status,
    publishedAt: n.publishedAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}
