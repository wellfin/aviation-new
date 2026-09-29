import { env } from "../../config/env.js";
import type { MailMessage } from "../notifications/mailer.js";
import type { LeadType } from "./lead.model.js";

const SIGNATURE = "\n\n— Global Aviation Services Directory";

export const LEAD_LABELS: Record<LeadType, string> = {
  contact: "Contact message",
  demo: "Demo request",
  data_licence: "Data licence request",
  advertising: "Advertising enquiry",
};

const CONFIRMATIONS: Record<LeadType, { subject: string; text: string }> = {
  contact: { subject: "We've received your message", text: "Thanks for getting in touch. Our team will reply within one business day." },
  demo: {
    subject: "Your demo request is confirmed",
    text: "Thanks for requesting a demo. An aviation specialist will contact you within one business day to schedule your session.",
  },
  data_licence: {
    subject: "We've received your data licence request",
    text: "Thanks for your interest in licensing our data. Our data team will send licence options and sample files within one business day.",
  },
  advertising: {
    subject: "We've received your advertising enquiry",
    text: "Thanks for your interest in advertising with us. Our media team will send your advertising package within one business day.",
  },
};

/**
 * Acknowledgement to the submitter. Deliberately does not echo anything they
 * typed, so the form can't be used to relay arbitrary content to third parties.
 */
export function leadConfirmationEmail(to: string, type: LeadType, name: string): MailMessage {
  const c = CONFIRMATIONS[type];
  const firstName = name.split(/\s+/)[0] ?? "";
  return {
    to,
    subject: c.subject,
    text: `Hi ${firstName},\n\n${c.text}\n\nIf you didn't submit this request, you can ignore this email.${SIGNATURE}`,
  };
}

export function staffLeadEmail(
  to: string,
  lead: { id: string; type: LeadType; name: string; email: string },
  lines: Array<[string, string | undefined | null]>,
): MailMessage {
  const body = lines
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return {
    to,
    replyTo: lead.email,
    subject: `New ${LEAD_LABELS[lead.type].toLowerCase()} from ${lead.name}`.replace(/[\r\n]+/g, " ").slice(0, 200),
    text: `${body}\n\nOpen in admin: ${env.FRONTEND_URL}/admin/leads/${lead.id}${SIGNATURE}`,
  };
}
