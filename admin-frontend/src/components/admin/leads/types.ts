import { z } from "zod";

export const LEAD_TYPES = ["contact", "demo", "data_licence", "advertising"] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

export const LEAD_STATUSES = ["new", "in_progress", "closed", "spam"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_TYPE_LABEL: Record<LeadType, string> = {
  contact: "Contact",
  demo: "Demo request",
  data_licence: "Data licence",
  advertising: "Advertising",
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  in_progress: "In progress",
  closed: "Closed",
  spam: "Spam",
};

export interface UserRef {
  id: string;
  name: string;
  email: string;
}

export interface LeadSummary {
  id: string;
  type: LeadType;
  status: LeadStatus;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  details: Record<string, string | string[]>;
  assignedTo: UserRef | null;
  notesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Lead extends LeadSummary {
  notes: Array<{ id: string; by: UserRef | null; text: string; at: string }>;
}

/** Staff account as returned by `GET /admin/users`. */
export interface StaffUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: "active" | "suspended";
}

/** Mirrors the backend `addNoteBody`. */
export const noteSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Note can't be empty")
    .max(2000, "Notes can be at most 2000 characters")
    .refine((v) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v), "Invalid characters"),
});
