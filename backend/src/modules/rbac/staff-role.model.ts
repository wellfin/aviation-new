import { type HydratedDocument, type InferSchemaType, Schema, model } from "mongoose";
import { GRANTABLE_PERMISSIONS } from "./permissions.js";

/**
 * A custom staff role made in the admin panel ("Content Editor", "Sales"…): a name and the
 * permissions it grants. Staff users (role MANAGER) that point at one get exactly these permissions.
 */
const staffRoleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    /** Lower-cased name, so "Sales" and "sales" can't both exist. */
    nameKey: { type: String, required: true, lowercase: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 200, default: "" },
    permissions: [{ type: String, enum: GRANTABLE_PERMISSIONS }],
  },
  { timestamps: true },
);

staffRoleSchema.index({ nameKey: 1 }, { unique: true });

export type StaffRoleAttrs = InferSchemaType<typeof staffRoleSchema>;
export type StaffRoleDoc = HydratedDocument<StaffRoleAttrs>;
export const StaffRole = model("StaffRole", staffRoleSchema);

export interface StaffRoleDTO {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export function toStaffRoleDTO(r: StaffRoleDoc, userCount = 0): StaffRoleDTO {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? "",
    permissions: [...(r.permissions ?? [])],
    userCount,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
