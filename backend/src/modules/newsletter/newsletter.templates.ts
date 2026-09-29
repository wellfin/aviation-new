import type { MailMessage } from "../notifications/mailer.js";

const SIGNATURE = "\n\n— Global Aviation Services Directory";

export function newsletterConfirmEmail(to: string, confirmLink: string): MailMessage {
  return {
    to,
    subject: "Confirm your newsletter subscription",
    text: `Please confirm that you'd like to receive the Global Aviation newsletter:\n\n${confirmLink}\n\nThe link expires in 7 days. If you didn't sign up, ignore this email and you won't be subscribed.${SIGNATURE}`,
  };
}

export function newsletterWelcomeEmail(to: string, unsubscribeLink: string): MailMessage {
  return {
    to,
    subject: "You're subscribed to the Global Aviation newsletter",
    text: `Thanks for confirming — you'll now receive our aviation industry updates.\n\nYou can unsubscribe at any time:\n${unsubscribeLink}${SIGNATURE}`,
  };
}
