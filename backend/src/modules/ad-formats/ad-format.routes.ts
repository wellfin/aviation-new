import { Router } from "express";
import { z } from "zod";
import { withTransaction } from "../../lib/db.js";
import { badRequest, conflict, notFound } from "../../lib/errors.js";
import { created, handler, noContent, ok } from "../../lib/http.js";
import { requirePermission } from "../../middleware/auth.js";
import { AdFormat, toAdFormatDTO } from "./ad-format.model.js";

const key = z.string().trim().toLowerCase().max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes");
const fields = {
  icon: z.string().trim().max(8),
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().min(5).max(300),
  priceLabel: z.string().trim().max(60),
  order: z.number().int().min(0).max(10_000),
  active: z.boolean(),
};
const createBody = z.object({ key, ...fields }).partial({ icon: true, priceLabel: true, order: true, active: true });
const updateBody = z
  .object(fields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");
const keyParams = z.object({ key });

/** Public: active advertising products for the Advertise page. */
export const adFormatsRouter = Router();
adFormatsRouter.get("/", async (_req, res) => {
  const rows = await AdFormat.find({ active: true }).sort({ order: 1, title: 1 }).lean();
  ok(res, rows.map(toAdFormatDTO));
});

/** Admin (ads:manage): manage the advertising products. */
export const adminAdFormatsRouter = Router();
adminAdFormatsRouter.use(requirePermission("ads:manage"));

adminAdFormatsRouter.get("/", async (_req, res) => {
  const rows = await AdFormat.find().sort({ order: 1, title: 1 }).lean();
  ok(res, rows.map(toAdFormatDTO));
});

adminAdFormatsRouter.post(
  "/",
  handler({ body: createBody }, async ({ body }, _req, res) => {
    if (await AdFormat.exists({ key: body.key })) throw conflict("A format with this id already exists.", { key: "Already exists" });
    const order = body.order ?? ((await AdFormat.findOne().sort({ order: -1 }).select("order").lean())?.order ?? 0) + 10;
    created(res, toAdFormatDTO(await AdFormat.create({ ...body, order })));
  }),
);

adminAdFormatsRouter.put(
  "/order",
  handler({ body: z.object({ keys: z.array(key).min(1).max(100) }) }, async ({ body }, _req, res) => {
    if (new Set(body.keys).size !== body.keys.length) throw badRequest("Duplicate formats in order list.");
    await withTransaction(async (session) => {
      if ((await AdFormat.countDocuments({ key: { $in: body.keys } }).session(session)) !== body.keys.length) throw badRequest("Unknown format in order list.");
      await AdFormat.bulkWrite(
        body.keys.map((k, i) => ({ updateOne: { filter: { key: k }, update: { $set: { order: (i + 1) * 10 } } } })),
        { session },
      );
    });
    const rows = await AdFormat.find().sort({ order: 1 }).lean();
    ok(res, rows.map(toAdFormatDTO));
  }),
);

adminAdFormatsRouter.patch(
  "/:key",
  handler({ params: keyParams, body: updateBody }, async ({ params, body }, _req, res) => {
    const doc = await AdFormat.findOneAndUpdate({ key: params.key }, { $set: body }, { returnDocument: "after", runValidators: true });
    if (!doc) throw notFound("Ad format");
    ok(res, toAdFormatDTO(doc));
  }),
);

adminAdFormatsRouter.delete(
  "/:key",
  handler({ params: keyParams }, async ({ params }, _req, res) => {
    const r = await AdFormat.deleteOne({ key: params.key });
    if (r.deletedCount === 0) throw notFound("Ad format");
    noContent(res);
  }),
);
