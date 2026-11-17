import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import { env, isTest } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  /** Adds the List-Unsubscribe header (newsletter mail). */
  unsubscribeUrl?: string;
}

/** Messages captured in tests (NODE_ENV=test). */
export const testOutbox: MailMessage[] = [];

const OUTBOX_DIR = ".mail-outbox";

let transporter: Transporter | null = null;
function smtp(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE ?? false,
    // Google shows app passwords as "abcd efgh ijkl mnop"; the spaces are not part of the password.
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS?.replace(/\s+/g, "") } : undefined,
  });
  return transporter;
}

/**
 * Sends an email. In development (MAIL_TRANSPORT=log) the message is written to
 * .mail-outbox/ instead of being sent — message bodies (which may contain
 * one-time codes) are never written to the application log.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  if (isTest) {
    testOutbox.push(message);
    return;
  }
  if (env.MAIL_TRANSPORT === "smtp") {
    const { unsubscribeUrl, ...rest } = message;
    await smtp().sendMail({
      from: env.MAIL_FROM,
      ...rest,
      // Spam filters (Outlook in particular) trust a matching HTML part more than a bare text email.
      html: message.html ?? toHtml(message.text),
      headers: { "Auto-Submitted": "auto-generated", "X-Auto-Response-Suppress": "All" },
      ...(unsubscribeUrl ? { list: { unsubscribe: unsubscribeUrl } } : {}),
    });
    logger.info({ subject: message.subject }, "Email sent");
    return;
  }
  await mkdir(OUTBOX_DIR, { recursive: true });
  const safeTo = message.to.replace(/[^a-z0-9@._-]/gi, "_");
  const file = path.join(OUTBOX_DIR, `${new Date().toISOString().replace(/[:.]/g, "-")}_${safeTo}.txt`);
  await writeFile(file, `To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`, "utf8");
  logger.info({ subject: message.subject }, `Email written to local outbox (${OUTBOX_DIR}/)`);
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The plain-text body as a simple, branded HTML email: paragraphs, clickable links and a footer with the site. */
export function toHtml(text: string): string {
  const site = env.FRONTEND_URL.replace(/\/$/, "");
  const paragraphs = text
    .trim()
    .split(/\n{2,}/)
    .map((p) =>
      escapeHtml(p)
        .replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}" style="color:#1d4ed8">${url}</a>`)
        .replace(/\n/g, "<br>"),
    )
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1f2937">${p}</p>`)
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px">
<tr><td style="padding:20px 28px;border-bottom:1px solid #e5e7eb;font-size:17px;font-weight:bold;color:#0f2a5c">Global Aviation Services Directory</td></tr>
<tr><td style="padding:24px 28px 8px">${paragraphs}</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.5;color:#6b7280">This is an automatic message from <a href="${site}" style="color:#6b7280">${escapeHtml(site.replace(/^https?:\/\//, ""))}</a>, sent because of an action on our website.</td></tr>
</table></td></tr></table></body></html>`;
}

/** Fire-and-forget variant for notifications that must not fail the request. */
export function sendMailInBackground(message: MailMessage): void {
  sendMail(message).catch((err: unknown) => logger.error({ err, subject: message.subject }, "Failed to send email"));
}
