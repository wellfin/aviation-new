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
    await smtp().sendMail({ from: env.MAIL_FROM, ...message });
    logger.info({ subject: message.subject }, "Email sent");
    return;
  }
  await mkdir(OUTBOX_DIR, { recursive: true });
  const safeTo = message.to.replace(/[^a-z0-9@._-]/gi, "_");
  const file = path.join(OUTBOX_DIR, `${new Date().toISOString().replace(/[:.]/g, "-")}_${safeTo}.txt`);
  await writeFile(file, `To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`, "utf8");
  logger.info({ subject: message.subject }, `Email written to local outbox (${OUTBOX_DIR}/)`);
}

/** Fire-and-forget variant for notifications that must not fail the request. */
export function sendMailInBackground(message: MailMessage): void {
  sendMail(message).catch((err: unknown) => logger.error({ err, subject: message.subject }, "Failed to send email"));
}
