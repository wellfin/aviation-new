import { type HydratedDocument, type InferSchemaType, Schema, model } from "mongoose";

/** Advertising products shown on the public "Advertise" page (admin-managed). */
const adFormatSchema = new Schema(
  {
    key: { type: String, required: true, lowercase: true, trim: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, maxlength: 60 },
    icon: { type: String, trim: true, maxlength: 8, default: "📣" },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, required: true, trim: true, maxlength: 300 },
    /** Optional display price, e.g. "From ₹25,000 / month". */
    priceLabel: { type: String, trim: true, maxlength: 60, default: "" },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

adFormatSchema.index({ key: 1 }, { unique: true });
adFormatSchema.index({ active: 1, order: 1 });

export type AdFormatAttrs = InferSchemaType<typeof adFormatSchema>;
export type AdFormatDoc = HydratedDocument<AdFormatAttrs>;
export const AdFormat = model("AdFormat", adFormatSchema);

export function toAdFormatDTO(f: AdFormatDoc | (AdFormatAttrs & { _id: unknown })) {
  return {
    id: f.key,
    icon: f.icon ?? "📣",
    title: f.title,
    description: f.description,
    priceLabel: f.priceLabel ?? "",
    order: f.order ?? 0,
    active: Boolean(f.active),
  };
}
export type AdFormatDTO = ReturnType<typeof toAdFormatDTO>;
