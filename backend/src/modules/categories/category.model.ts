import { type HydratedDocument, type InferSchemaType, Schema, model } from "mongoose";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Admin-managed catalogue of service types (FBO, Fuel, Catering…). */
const categorySchema = new Schema(
  {
    /** Stable identifier stored on providers; immutable once created. */
    slug: { type: String, required: true, lowercase: true, trim: true, match: SLUG_PATTERN, maxlength: 60 },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    longName: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    /** lucide-react icon name used by the UI, e.g. "fuel". */
    icon: { type: String, trim: true, maxlength: 40, default: "plane" },
    emoji: { type: String, trim: true, maxlength: 8, default: "✈️" },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    /** Shown in the header "Services" menu and directory filter pills. */
    showInMenu: { type: Boolean, default: true },
  },
  { timestamps: true },
);

categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ active: 1, order: 1 });

export type CategoryAttrs = InferSchemaType<typeof categorySchema>;
export type CategoryDoc = HydratedDocument<CategoryAttrs>;
export const ServiceCategory = model("ServiceCategory", categorySchema);

export function toCategoryDTO(c: CategoryDoc | (CategoryAttrs & { _id: unknown })) {
  return {
    slug: c.slug,
    name: c.name,
    longName: c.longName,
    description: c.description ?? "",
    icon: c.icon ?? "plane",
    emoji: c.emoji ?? "✈️",
    order: c.order ?? 0,
    active: Boolean(c.active),
    showInMenu: Boolean(c.showInMenu),
  };
}
export type CategoryDTO = ReturnType<typeof toCategoryDTO>;
