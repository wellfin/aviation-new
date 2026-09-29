import { type HydratedDocument, type InferSchemaType, Schema, model } from "mongoose";

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;

/** One review per user per provider; only approved reviews count towards the rating. */
const reviewSchema = new Schema(
  {
    provider: { type: Schema.Types.ObjectId, ref: "Provider", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true, trim: true, maxlength: 120 },
    authorRole: { type: String, trim: true, maxlength: 120, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 3000 },
    status: { type: String, enum: REVIEW_STATUSES, required: true, default: "pending" },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    moderatedAt: { type: Date },
    moderationNote: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

reviewSchema.index({ provider: 1, author: 1 }, { unique: true });
reviewSchema.index({ provider: 1, status: 1, createdAt: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ author: 1, createdAt: -1 });
reviewSchema.index({ createdAt: -1 });

export type ReviewAttrs = InferSchemaType<typeof reviewSchema>;
export type ReviewDoc = HydratedDocument<ReviewAttrs>;
export const Review = model("Review", reviewSchema);
