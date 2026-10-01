import { Router } from "express";
import { AppError, validationError } from "../../lib/errors.js";
import { created, handler, ok, parse, zodFieldErrors } from "../../lib/http.js";
import { currentUser, requirePermission } from "../../middleware/auth.js";
import { formRateLimit, otpRateLimit } from "../../middleware/security.js";
import { sendLeadOtp, verifyLeadOtp } from "../leads/leads.service.js";
import {
  adminListQuery,
  adminUpdateBody,
  enquiryOtpRequestBody,
  enquiryOtpVerifyBody,
  idParams,
  ownerListQuery,
  ownerUpdateBody,
  parseEnquiryBody,
  providerSlugBody,
  slugParams,
} from "./enquiry.schemas.js";
import {
  adminGetEnquiry,
  adminListEnquiries,
  adminUpdateEnquiryStatus,
  getOwnEnquiry,
  listOwnEnquiries,
  submitEnquiry,
  updateOwnEnquiryStatus,
} from "./enquiry.service.js";

/** The response never reveals whether the honeypot tripped. */
const RECEIVED = { received: true } as const;

/** Mounted at /providers — owns only the /:slug/enquiries path. Sign-in is optional. */
export const providerEnquiriesRouter = Router();

providerEnquiriesRouter.post(
  "/:slug/enquiries",
  formRateLimit,
  handler({ params: slugParams }, async ({ params }, req, res) => {
    // The body has three accepted shapes (general / fleet / UI flat fleet); parseEnquiryBody picks one.
    await submitEnquiry(params.slug, parseEnquiryBody(req.body), req.user);
    created(res, RECEIVED);
  }),
);

/** Mounted at /enquiries — the frontend's form endpoint, with `providerSlug` in the body. */
export const enquiriesRouter = Router();

enquiriesRouter.post(
  "/",
  formRateLimit,
  handler({}, async (_input, req, res) => {
    // Validate the slug and the form together so the UI gets every field error at once.
    const slug = providerSlugBody.safeParse(req.body ?? {});
    let input;
    try {
      input = parseEnquiryBody(req.body);
    } catch (err) {
      if (!slug.success && err instanceof AppError && err.fieldErrors) {
        throw validationError({ ...zodFieldErrors(slug.error), ...err.fieldErrors });
      }
      throw err;
    }
    const { providerSlug } = parse(providerSlugBody, req.body ?? {});
    await submitEnquiry(providerSlug, input, req.user);
    created(res, RECEIVED);
  }),
);

// Email ownership check required before an enquiry is accepted (see submitEnquiry).
enquiriesRouter.post(
  "/email-otp",
  otpRateLimit,
  handler({ body: enquiryOtpRequestBody }, async ({ body }, _req, res) => {
    await sendLeadOtp("enquiry", body.email);
    ok(res, { sent: true });
  }),
);

enquiriesRouter.post(
  "/email-otp/verify",
  otpRateLimit,
  handler({ body: enquiryOtpVerifyBody }, async ({ body }, _req, res) => {
    await verifyLeadOtp("enquiry", body.email, body.code);
    ok(res, { verified: true });
  }),
);

/** Mounted at /me/enquiries — the provider's inbox for listings they own. */
export const myEnquiriesRouter = Router();

myEnquiriesRouter.get(
  "/",
  requirePermission("enquiries:read:own"),
  handler({ query: ownerListQuery }, async ({ query }, req, res) => {
    ok(res, await listOwnEnquiries(currentUser(req), query));
  }),
);

myEnquiriesRouter.get(
  "/:id",
  requirePermission("enquiries:read:own"),
  handler({ params: idParams }, async ({ params }, req, res) => {
    ok(res, await getOwnEnquiry(currentUser(req), params.id));
  }),
);

myEnquiriesRouter.patch(
  "/:id",
  requirePermission("enquiries:read:own"),
  handler({ params: idParams, body: ownerUpdateBody }, async ({ params, body }, req, res) => {
    ok(res, await updateOwnEnquiryStatus(currentUser(req), params.id, body.status));
  }),
);

/** Mounted at /admin/enquiries. */
export const adminEnquiriesRouter = Router();

adminEnquiriesRouter.get(
  "/",
  requirePermission("enquiries:read:any"),
  handler({ query: adminListQuery }, async ({ query }, _req, res) => {
    ok(res, await adminListEnquiries(query));
  }),
);

adminEnquiriesRouter.get(
  "/:id",
  requirePermission("enquiries:read:any"),
  handler({ params: idParams }, async ({ params }, _req, res) => {
    ok(res, await adminGetEnquiry(params.id));
  }),
);

adminEnquiriesRouter.patch(
  "/:id",
  requirePermission("enquiries:read:any"),
  handler({ params: idParams, body: adminUpdateBody }, async ({ params, body }, _req, res) => {
    ok(res, await adminUpdateEnquiryStatus(params.id, body.status));
  }),
);
