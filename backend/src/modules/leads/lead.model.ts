import { type HydratedDocument, type InferSchemaType, Schema, type Types, model } from "mongoose";

export const LEAD_TYPES = ["contact", "demo", "data_licence", "advertising"] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

export const LEAD_STATUSES = ["new", "in_progress", "closed", "spam"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

const noteSchema = new Schema(
  {
    by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    at: { type: Date, required: true, default: () => new Date() },
  },
  { _id: true },
);

/**
 * One collection for every inbound sales/support lead; `type` says which form
 * it came from. Type-specific answers live under `details` (validated per type
 * at the API boundary, see leads.schemas.ts).
 */
const leadSchema = new Schema(
  {
    type: { type: String, enum: LEAD_TYPES, required: true },
    name: { type: String, required: true, trim: true, maxlength: 201 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 40 },
    company: { type: String, trim: true, maxlength: 120 },
    message: { type: String, trim: true, maxlength: 5000 },
    details: {
      // contact
      subject: { type: String, maxlength: 120 },
      // demo
      firstName: { type: String, maxlength: 100 },
      lastName: { type: String, maxlength: 100 },
      role: { type: String, maxlength: 120 },
      interest: { type: String, maxlength: 120 },
      preferredDate: { type: String, maxlength: 40 },
      // data_licence
      datasets: { type: [String], default: undefined },
      // advertising
      placement: { type: String, maxlength: 60 },
      budget: { type: String, maxlength: 60 },
    },
    status: { type: String, enum: LEAD_STATUSES, required: true, default: "new" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    notes: { type: [noteSchema], default: [] },
  },
  { timestamps: true },
);

leadSchema.index({ createdAt: -1 });
leadSchema.index({ type: 1, createdAt: -1 });
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ type: 1, status: 1, createdAt: -1 });
leadSchema.index({ email: 1, createdAt: -1 });
leadSchema.index({ assignedTo: 1, status: 1 });

export type LeadAttrs = InferSchemaType<typeof leadSchema>;
export type LeadDoc = HydratedDocument<LeadAttrs>;
export type LeadDetails = NonNullable<LeadAttrs["details"]>;
export const Lead = model("Lead", leadSchema);

export type LeadUserRef = { _id: Types.ObjectId; firstName: string; lastName: string; email: string };
