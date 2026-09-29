import { env } from "../../config/env.js";
import type { MailMessage } from "../notifications/mailer.js";
import type { EnquiryInput } from "./enquiry.schemas.js";

const SIGNATURE = "\n\n— Global Aviation Services Directory";

/** Lead notification for the provider. Reply-To is the enquirer so the provider can answer directly. */
export function providerEnquiryEmail(to: string, providerName: string, enquiry: EnquiryInput, aircraft?: string): MailMessage {
  const lines: Array<[string, string]> = [
    ["Name", enquiry.name],
    ["Email", enquiry.email],
    ["Phone", enquiry.phone],
    ["Company", enquiry.company],
    ["Service", enquiry.service],
  ];
  if (enquiry.trip) {
    const t = enquiry.trip;
    lines.push(["Aircraft", aircraft ?? ""], ["Trip", `${t.tripType}: ${t.from} → ${t.to}`], ["Departure", t.departAt], ["Passengers", String(t.passengers)]);
  }
  const details = lines
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  const kind = enquiry.type === "fleet" ? "aircraft charter enquiry" : "enquiry";
  return {
    to,
    replyTo: enquiry.email,
    subject: `New ${kind} for ${providerName}`,
    text: `You have a new ${kind} via your Global Aviation listing.\n\n${details}${enquiry.message ? `\n\nMessage:\n${enquiry.message}` : ""}\n\nReply to this email to respond directly. Your enquiries inbox is available after signing in at ${env.FRONTEND_URL}.${SIGNATURE}`,
  };
}

/**
 * Confirmation for the enquirer. Deliberately echoes no user-supplied text (name or message)
 * so the form can't be used to relay arbitrary content to third-party inboxes.
 */
export function enquiryConfirmationEmail(to: string, providerName: string): MailMessage {
  return {
    to,
    subject: `Your enquiry to ${providerName}`,
    text: `Hello,\n\nThanks — your enquiry has been sent to ${providerName}. They usually reply within one business day, directly to this email address.\n\nIf you didn't send this enquiry, you can ignore this email.${SIGNATURE}`,
  };
}
