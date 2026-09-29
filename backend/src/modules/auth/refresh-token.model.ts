import { type InferSchemaType, Schema, model } from "mongoose";

/**
 * Rotating refresh tokens. Only a SHA-256 hash of each token is stored.
 * Tokens issued from the same login share a `family`; presenting a token that
 * was already rotated revokes the whole family (theft detection).
 */
const refreshTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    family: { type: String, required: true },
    /** "web" (public site) or "admin" (staff console) — tokens only work in their own scope. */
    scope: { type: String, enum: ["web", "admin"], required: true, default: "web" },
    tokenHash: { type: String, required: true },
    persistent: { type: Boolean, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    replacedAt: { type: Date },
    userAgent: { type: String, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

refreshTokenSchema.index({ tokenHash: 1 }, { unique: true });
refreshTokenSchema.index({ family: 1 });
refreshTokenSchema.index({ user: 1 });
// MongoDB deletes expired tokens automatically.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefreshTokenAttrs = InferSchemaType<typeof refreshTokenSchema>;
export const RefreshToken = model("RefreshToken", refreshTokenSchema);
