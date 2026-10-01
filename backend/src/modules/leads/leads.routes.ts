import { Router } from "express";
import { currentUser, requirePermission } from "../../middleware/auth.js";
import { formRateLimit, otpRateLimit } from "../../middleware/security.js";
import { created, handler, ok } from "../../lib/http.js";
import {
  addNoteBody,
  advertisingBody,
  contactBody,
  contactOtpVerifyBody,
  dataLicenceBody,
  demoOtpVerifyBody,
  demoRequestBody,
  exportLeadsQuery,
  idParams,
  listLeadsQuery,
  otpRequestBody,
  updateLeadBody,
} from "./leads.schemas.js";
import * as leads from "./leads.service.js";

/** Same body for real and honeypot-filtered submissions. */
const RECEIVED = { received: true } as const;

/** Mounted at /contact */
export const contactRouter = Router();

contactRouter.post(
  "/",
  formRateLimit,
  handler({ body: contactBody }, async ({ body }, _req, res) => {
    await leads.submitContact(body);
    created(res, RECEIVED);
  }),
);

contactRouter.post(
  "/email-otp",
  otpRateLimit,
  handler({ body: otpRequestBody }, async ({ body }, _req, res) => {
    await leads.sendLeadOtp("contact", body.email);
    ok(res, { sent: true });
  }),
);

contactRouter.post(
  "/email-otp/verify",
  otpRateLimit,
  handler({ body: contactOtpVerifyBody }, async ({ body }, _req, res) => {
    await leads.verifyLeadOtp("contact", body.email, body.code);
    ok(res, { verified: true });
  }),
);

/** Mounted at /demo-requests */
export const demoRequestsRouter = Router();

demoRequestsRouter.post(
  "/",
  formRateLimit,
  handler({ body: demoRequestBody }, async ({ body }, _req, res) => {
    await leads.submitDemoRequest(body);
    created(res, RECEIVED);
  }),
);

demoRequestsRouter.post(
  "/email-otp",
  otpRateLimit,
  handler({ body: otpRequestBody }, async ({ body }, _req, res) => {
    await leads.sendLeadOtp("demo", body.email);
    ok(res, { sent: true });
  }),
);

demoRequestsRouter.post(
  "/email-otp/verify",
  otpRateLimit,
  handler({ body: demoOtpVerifyBody }, async ({ body }, _req, res) => {
    await leads.verifyLeadOtp("demo", body.email, body.code);
    ok(res, { verified: true });
  }),
);

/** Mounted at /data-licence */
export const dataLicenceRouter = Router();

dataLicenceRouter.post(
  "/requests",
  formRateLimit,
  handler({ body: dataLicenceBody }, async ({ body }, _req, res) => {
    await leads.submitDataLicence(body);
    created(res, RECEIVED);
  }),
);

dataLicenceRouter.post(
  "/email-otp",
  otpRateLimit,
  handler({ body: otpRequestBody }, async ({ body }, _req, res) => {
    await leads.sendLeadOtp("dataLicence", body.email);
    ok(res, { sent: true });
  }),
);

dataLicenceRouter.post(
  "/email-otp/verify",
  otpRateLimit,
  handler({ body: contactOtpVerifyBody }, async ({ body }, _req, res) => {
    await leads.verifyLeadOtp("dataLicence", body.email, body.code);
    ok(res, { verified: true });
  }),
);

/** Mounted at /advertising */
export const advertisingRouter = Router();

advertisingRouter.post(
  "/enquiries",
  formRateLimit,
  handler({ body: advertisingBody }, async ({ body }, _req, res) => {
    await leads.submitAdvertising(body);
    created(res, RECEIVED);
  }),
);

advertisingRouter.post(
  "/email-otp",
  otpRateLimit,
  handler({ body: otpRequestBody }, async ({ body }, _req, res) => {
    await leads.sendLeadOtp("advertising", body.email);
    ok(res, { sent: true });
  }),
);

advertisingRouter.post(
  "/email-otp/verify",
  otpRateLimit,
  handler({ body: contactOtpVerifyBody }, async ({ body }, _req, res) => {
    await leads.verifyLeadOtp("advertising", body.email, body.code);
    ok(res, { verified: true });
  }),
);

/** Admin: mounted at /admin/leads */
export const adminLeadsRouter = Router();

adminLeadsRouter.get(
  "/",
  requirePermission("leads:read"),
  handler({ query: listLeadsQuery }, async ({ query }, _req, res) => {
    ok(res, await leads.listLeads(query));
  }),
);

// Before "/:id" so the file name isn't parsed as an id.
adminLeadsRouter.get(
  "/export.csv",
  requirePermission("leads:read"),
  handler({ query: exportLeadsQuery }, async ({ query }, _req, res) => {
    await leads.exportLeadsCsv(query, res);
  }),
);

adminLeadsRouter.get(
  "/:id",
  requirePermission("leads:read"),
  handler({ params: idParams }, async ({ params }, _req, res) => {
    ok(res, await leads.getLead(params.id));
  }),
);

adminLeadsRouter.patch(
  "/:id",
  requirePermission("leads:manage"),
  handler({ params: idParams, body: updateLeadBody }, async ({ params, body }, _req, res) => {
    ok(res, await leads.updateLead(params.id, body));
  }),
);

adminLeadsRouter.post(
  "/:id/notes",
  requirePermission("leads:manage"),
  handler({ params: idParams, body: addNoteBody }, async ({ params, body }, req, res) => {
    created(res, await leads.addLeadNote(params.id, currentUser(req).id, body.text));
  }),
);
