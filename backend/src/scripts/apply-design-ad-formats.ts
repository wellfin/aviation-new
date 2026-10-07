/**
 * One-off: makes the Advertise page show the six cards from the design.
 *   npx tsx --env-file-if-exists=.env src/scripts/apply-design-ad-formats.ts
 * Sets the six design formats' text and order (creating missing ones) and hides every other
 * format (e.g. Sticky Footer) without deleting it, so it can be re-enabled in the admin panel.
 */
import { connectDatabase, disconnectDatabase } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { AdFormat } from "../modules/ad-formats/ad-format.model.js";
import { FORMATS } from "../modules/ad-formats/ad-format.seed.js";

await connectDatabase();
try {
  const keys = FORMATS.map((f) => f.key);
  await AdFormat.bulkWrite(
    FORMATS.map((f, i) => ({ updateOne: { filter: { key: f.key }, update: { $set: { ...f, order: (i + 1) * 10, active: true } }, upsert: true } })),
  );
  const hidden = await AdFormat.updateMany({ key: { $nin: keys } }, { $set: { active: false } });
  logger.info({ shown: keys, hidden: hidden.modifiedCount }, "Advertise page formats set to the design");
} finally {
  await disconnectDatabase();
}
