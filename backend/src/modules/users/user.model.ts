import { type HydratedDocument, type InferSchemaType, Schema, model } from "mongoose";
import { ROLES } from "../rbac/permissions.js";

export const ACCOUNT_SERVICES = ["pilot", "business", "charter", "airport"] as const;

const userSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    passwordHash: { type: String, select: false },
    firstName: { type: String, required: true, trim: true, maxlength: 100 },
    lastName: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 30 },
    company: { type: String, trim: true, maxlength: 120 },
    country: { type: String, trim: true, maxlength: 2 },
    service: { type: String, enum: ACCOUNT_SERVICES },
    /** Plan the user picked on the pricing page before registering. */
    intendedPlan: { type: String, maxlength: 40 },
    role: { type: String, enum: ROLES, required: true, default: "USER" },
    status: { type: String, enum: ["active", "suspended"], required: true, default: "active" },
    emailVerifiedAt: { type: Date },
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, select: false },
    /** Incremented to invalidate every issued access token (password change, suspension). */
    tokenVersion: { type: Number, default: 0 },
    oauth: {
      googleId: { type: String },
      linkedinId: { type: String },
    },
    favorites: [{ type: Schema.Types.ObjectId, ref: "Provider" }],
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ "oauth.googleId": 1 }, { unique: true, sparse: true });
userSchema.index({ "oauth.linkedinId": 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ firstName: "text", lastName: "text", email: "text", company: "text" });

export type UserAttrs = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<UserAttrs>;
export const User = model("User", userSchema);

export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserAttrs["role"];
  emailVerified: boolean;
  phone: string | null;
  company: string | null;
  service: string | null;
  createdAt: string;
}

/** The only user shape ever returned by the API (never includes secrets). */
export function toPublicUser(u: UserDoc): PublicUser {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.role,
    emailVerified: Boolean(u.emailVerifiedAt),
    phone: u.phone ?? null,
    company: u.company ?? null,
    service: u.service ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}
