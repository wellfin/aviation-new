import { env } from "../../config/env.js";
import type { MailMessage } from "../notifications/mailer.js";

const SIGNATURE = "\n\n— Global Aviation Services Directory";

export function listingApprovedEmail(to: string, firstName: string, listingName: string, slug: string): MailMessage {
  return {
    to,
    subject: `Your listing "${listingName}" is live`,
    text: `Hi ${firstName},\n\nGood news — your listing "${listingName}" has been approved and is now visible in the directory:\n${env.FRONTEND_URL}/providers/${slug}\n\nYou can keep it up to date from your account at any time.${SIGNATURE}`,
  };
}

export function listingRejectedEmail(to: string, firstName: string, listingName: string, reason: string): MailMessage {
  return {
    to,
    subject: `Your listing "${listingName}" needs changes`,
    text: `Hi ${firstName},\n\nWe reviewed your listing "${listingName}" and can't publish it yet.\n\nReason: ${reason}\n\nPlease update your listing from your account (${env.FRONTEND_URL}/account) and submit it again.${SIGNATURE}`,
  };
}
