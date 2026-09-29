import { Router } from "express";
import { created, handler, ok } from "../../lib/http.js";
import { currentUser, requirePermission } from "../../middleware/auth.js";
import { adminPaymentsQuery, adminSubscriptionsQuery, createSubscriptionBody, myPaymentsQuery, verifySubscriptionBody } from "./billing.schemas.js";
import {
  adminListPayments,
  adminListSubscriptions,
  cancelMySubscription,
  createSubscription,
  getMySubscription,
  listMyPayments,
  verifySubscriptionPayment,
} from "./billing.service.js";
import { handleRazorpayWebhook } from "./webhook.service.js";

/** Mounted at /billing. */
export const billingRouter = Router();

const own = requirePermission("billing:manage:own");

billingRouter.post(
  "/subscriptions",
  own,
  handler({ body: createSubscriptionBody }, async ({ body }, req, res) => {
    created(res, await createSubscription(currentUser(req), body));
  }),
);

billingRouter.post(
  "/subscriptions/verify",
  own,
  handler({ body: verifySubscriptionBody }, async ({ body }, req, res) => {
    ok(res, await verifySubscriptionPayment(currentUser(req), body));
  }),
);

billingRouter.get(
  "/subscription",
  own,
  handler({}, async (_input, req, res) => {
    ok(res, await getMySubscription(currentUser(req)));
  }),
);

billingRouter.post(
  "/subscription/cancel",
  own,
  handler({}, async (_input, req, res) => {
    ok(res, await cancelMySubscription(currentUser(req)));
  }),
);

billingRouter.get(
  "/payments",
  own,
  handler({ query: myPaymentsQuery }, async ({ query }, req, res) => {
    ok(res, await listMyPayments(currentUser(req), query));
  }),
);

/** Razorpay → us. Unauthenticated by design; trust comes from the HMAC over the raw body. */
billingRouter.post("/webhooks/razorpay", async (req, res) => {
  const header = (name: string) => {
    const v = req.headers[name];
    return typeof v === "string" ? v : undefined;
  };
  const outcome = await handleRazorpayWebhook({
    rawBody: req.rawBody,
    signature: header("x-razorpay-signature"),
    eventId: header("x-razorpay-event-id"),
  });
  ok(res, { received: true, outcome });
});

/** Mounted at /admin/billing. */
export const adminBillingRouter = Router();

adminBillingRouter.get(
  "/subscriptions",
  requirePermission("billing:read:any"),
  handler({ query: adminSubscriptionsQuery }, async ({ query }, _req, res) => {
    ok(res, await adminListSubscriptions(query));
  }),
);

adminBillingRouter.get(
  "/payments",
  requirePermission("billing:read:any"),
  handler({ query: adminPaymentsQuery }, async ({ query }, _req, res) => {
    ok(res, await adminListPayments(query));
  }),
);
