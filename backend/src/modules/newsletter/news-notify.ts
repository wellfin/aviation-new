import { env, isTest } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { News } from "../news/news.model.js";
import { sendMail } from "../notifications/mailer.js";
import { signedUnsubscribeUrl } from "./newsletter.service.js";
import { newArticleEmail } from "./newsletter.templates.js";
import { Subscriber } from "./subscriber.model.js";

/** How often scheduled articles (publishedAt in the future) are checked. */
const SWEEP_MS = 5 * 60_000;

let running: Promise<void> | null = null;

/**
 * Emails every confirmed subscriber about each newly published article whose publish time has come.
 * Each article is claimed atomically (notifyPending → notifiedAt) so it's never sent twice, even
 * with several API processes.
 */
export async function sendDueNewsNotifications(): Promise<void> {
  for (;;) {
    const now = new Date();
    const article = await News.findOneAndUpdate(
      { notifyPending: true, status: "published", publishedAt: { $lte: now } },
      { $set: { notifyPending: false, notifiedAt: now } },
      { returnDocument: "after", sort: { publishedAt: 1 } },
    );
    if (!article) return;

    const link = `${env.FRONTEND_URL.replace(/\/+$/, "")}/news/${article.slug}`;
    let sent = 0;
    let failed = 0;
    const cursor = Subscriber.find({ status: "subscribed" }, { email: 1 }).cursor();
    for await (const sub of cursor) {
      try {
        await sendMail(newArticleEmail(sub.email, { title: article.title, excerpt: article.excerpt, link }, signedUnsubscribeUrl(sub.id)));
        sent++;
      } catch (err) {
        failed++;
        logger.error({ err, subscriberId: sub.id }, "Failed to send new-article email");
      }
    }
    logger.info({ articleId: article.id, sent, failed }, "Subscribers emailed about a new article");
  }
}

let again = false;

/** Runs a send now without blocking the request; a call during a run queues one more pass. */
export function notifySubscribersInBackground(): void {
  if (running) {
    again = true;
    return;
  }
  running = sendDueNewsNotifications()
    .catch((err: unknown) => logger.error({ err }, "New-article notifications failed"))
    .finally(() => {
      running = null;
      if (again) {
        again = false;
        notifySubscribersInBackground();
      }
    });
}

/** Test hook: waits for the current background run. */
export async function newsNotificationsSettled(): Promise<void> {
  while (running) await running;
}

/** Picks up articles scheduled for later once their time arrives. */
export function startNewsNotifier(): void {
  if (isTest) return;
  notifySubscribersInBackground();
  setInterval(notifySubscribersInBackground, SWEEP_MS).unref();
}
