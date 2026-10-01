import { type InferSchemaType, Schema, model } from "mongoose";

export const OTP_PURPOSES = ["email_verification", "password_reset", "contact_email", "demo_email", "advertising_email", "data_licence_email", "enquiry_email"] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

/** One active code per (purpose, email). Codes are stored as keyed hashes only. */
const otpSchema = new Schema(
  {
    purpose: { type: String, enum: OTP_PURPOSES, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    verifiedAt: { type: Date },
    consumedAt: { type: Date },
  },
  { timestamps: true },
);

otpSchema.index({ purpose: 1, email: 1 }, { unique: true });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 });

export type OtpAttrs = InferSchemaType<typeof otpSchema>;
export const Otp = model("Otp", otpSchema);
