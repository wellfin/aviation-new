import { type HydratedDocument, type InferSchemaType, Schema, model } from "mongoose";

export const ENQUIRY_STATUSES = ["new", "read", "replied", "closed", "spam"] as const;

/** A lead sent from a provider profile ("Send Enquiry" or aircraft-fleet enquiry). */
const enquirySchema = new Schema(
  {
    provider: { type: Schema.Types.ObjectId, ref: "Provider", required: true },
    /** Set when the sender was signed in. */
    user: { type: Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: ["general", "fleet"], required: true, default: "general" },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    /** Dial code + number as entered, e.g. "+44 7700 900123". */
    phone: { type: String, trim: true, maxlength: 40, default: "" },
    company: { type: String, trim: true, maxlength: 120, default: "" },
    service: { type: String, trim: true, maxlength: 120, default: "" },
    /** Optional for fleet enquiries (the trip details carry the request). */
    message: { type: String, trim: true, maxlength: 5000, default: "" },
    trip: {
      tripType: { type: String, enum: ["one-way", "round-trip", "multi-leg"] },
      from: { type: String, trim: true, maxlength: 80 },
      to: { type: String, trim: true, maxlength: 80 },
      departAt: { type: String, trim: true, maxlength: 40 },
      passengers: { type: Number, min: 1, max: 600 },
      aircraft: { type: String, trim: true, maxlength: 120 },
    },
    status: { type: String, enum: ENQUIRY_STATUSES, required: true, default: "new" },
  },
  { timestamps: true },
);

enquirySchema.index({ provider: 1, status: 1, createdAt: -1 });
enquirySchema.index({ createdAt: -1 });
enquirySchema.index({ status: 1, createdAt: -1 });

export type EnquiryAttrs = InferSchemaType<typeof enquirySchema>;
export type EnquiryDoc = HydratedDocument<EnquiryAttrs>;
export const Enquiry = model("Enquiry", enquirySchema);
