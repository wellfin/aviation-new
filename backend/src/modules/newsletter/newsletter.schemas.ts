import { z } from "zod";
import { paginationQuery } from "../../lib/pagination.js";
import { emailField } from "../leads/leads.schemas.js";
import { SUBSCRIBER_STATUSES } from "./subscriber.model.js";

export const subscribeBody = z.object({
  email: emailField,
  source: z
    .string()
    .trim()
    .max(60)
    .regex(/^[a-z0-9_-]*$/i, "Invalid source")
    .optional(),
  /** Honeypot. */
  website: z.string().max(500).optional(),
});

/** Tokens are 32 random bytes, base64url encoded (43 chars). */
export const tokenQuery = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/) });

export const listSubscribersQuery = paginationQuery.extend({
  status: z.enum(SUBSCRIBER_STATUSES).optional(),
  q: z.string().trim().max(100).optional(),
});

export const exportSubscribersQuery = z.object({ status: z.enum(SUBSCRIBER_STATUSES).optional() });

export type SubscribeInput = z.infer<typeof subscribeBody>;
export type ListSubscribersQuery = z.infer<typeof listSubscribersQuery>;
