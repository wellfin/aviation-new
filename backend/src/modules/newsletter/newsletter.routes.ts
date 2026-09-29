import { Router } from "express";
import { requirePermission } from "../../middleware/auth.js";
import { formRateLimit } from "../../middleware/security.js";
import { handler, ok } from "../../lib/http.js";
import { exportSubscribersQuery, listSubscribersQuery, subscribeBody, tokenQuery } from "./newsletter.schemas.js";
import * as newsletter from "./newsletter.service.js";

const GENERIC_RESPONSE = { message: "Thanks! Please check your inbox to confirm your subscription." } as const;

/** Public: mounted at /newsletter */
export const newsletterRouter = Router();

newsletterRouter.post(
  "/subscriptions",
  formRateLimit,
  handler({ body: subscribeBody }, async ({ body }, _req, res) => {
    await newsletter.subscribe(body);
    ok(res, GENERIC_RESPONSE);
  }),
);

/*
 * Email links are opened in a browser, so these always redirect to the site
 * (malformed tokens included) instead of returning a JSON error.
 */
newsletterRouter.get("/confirm", async (req, res) => {
  const parsed = tokenQuery.safeParse(req.query);
  const confirmed = parsed.success && (await newsletter.confirmSubscription(parsed.data.token));
  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, newsletter.frontendResult(confirmed ? "confirmed" : "invalid"));
});

newsletterRouter.get("/unsubscribe", async (req, res) => {
  const parsed = tokenQuery.safeParse(req.query);
  const done = parsed.success && (await newsletter.unsubscribe(parsed.data.token));
  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, newsletter.frontendResult(done ? "unsubscribed" : "invalid"));
});

/** Admin: mounted at /admin/newsletter */
export const adminNewsletterRouter = Router();
adminNewsletterRouter.use(requirePermission("leads:read"));

adminNewsletterRouter.get(
  "/subscribers",
  handler({ query: listSubscribersQuery }, async ({ query }, _req, res) => {
    ok(res, await newsletter.listSubscribers(query));
  }),
);

adminNewsletterRouter.get(
  "/subscribers/export.csv",
  handler({ query: exportSubscribersQuery }, async ({ query }, _req, res) => {
    await newsletter.exportSubscribersCsv(query.status, res);
  }),
);
