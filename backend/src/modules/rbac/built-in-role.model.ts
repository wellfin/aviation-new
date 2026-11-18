import { Schema, model } from "mongoose";
import { PERMISSIONS } from "./permissions.js";

/**
 * Super Admin's changes to the built-in Admin and Manager (standard) roles: the console permissions
 * they grant. No document = the code defaults.
 */
const builtInRoleSchema = new Schema(
  {
    key: { type: String, enum: ["ADMIN", "MANAGER"], required: true },
    permissions: [{ type: String, enum: PERMISSIONS }],
  },
  { timestamps: true },
);

builtInRoleSchema.index({ key: 1 }, { unique: true });

export const BuiltInRole = model("BuiltInRole", builtInRoleSchema);
