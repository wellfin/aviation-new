/**
 * Fills the alternate phone, alternate email and SITA address on demo Ultra Pro / Pro listings that have
 * none (the airport listing shows every contact line for those plans):
 *   npx tsx --env-file-if-exists=.env src/scripts/fill-demo-contacts.ts
 * Listings owned by a provider account and values already set are never changed.
 */
import { connectDatabase, disconnectDatabase } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { Provider } from "../modules/providers/provider.model.js";
import { demoExtraContacts } from "../modules/providers/providers.seed.js";

await connectDatabase();
try {
  const listings = await Provider.find({ tier: { $in: ["ultra_pro", "pro"] }, owner: { $exists: false } }, { name: 1, contact: 1, airportCodes: 1 }).lean();
  let updated = 0;
  for (const p of listings) {
    const extra = demoExtraContacts(p.name, p.contact?.phone ?? "", p.contact?.email ?? "", p.airportCodes?.[0]);
    const set: Record<string, string> = {};
    if (!p.contact?.phone2 || p.contact.phone2.endsWith(" ext. 2")) set["contact.phone2"] = extra.phone2;
    if (!p.contact?.email2) set["contact.email2"] = extra.email2;
    if (!p.contact?.sita) set["contact.sita"] = extra.sita;
    if (Object.keys(set).length === 0) continue;
    await Provider.updateOne({ _id: p._id }, { $set: set });
    updated++;
  }
  logger.info({ listings: listings.length, updated }, "Demo contact lines filled");
} finally {
  await disconnectDatabase();
}
