/**
 * Re-applies the logo and contact details from DEMO_TIER_SEEDS to demo listings that already exist
 * (no owning provider account), e.g. after the seed gains a second phone or SITA address:
 *   npx tsx --env-file-if-exists=.env src/scripts/refresh-demo-contacts.ts [category]
 */
import { connectDatabase, disconnectDatabase } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { Provider } from "../modules/providers/provider.model.js";
import { DEMO_TIER_SEEDS } from "../modules/providers/providers.seed.js";

const category = process.argv[2];
await connectDatabase();
try {
  let updated = 0;
  for (const s of DEMO_TIER_SEEDS.filter((x) => !category || x.category === category)) {
    const set: Record<string, string> = {};
    if (s.logo) set.logo = s.logo;
    if (s.address) set["contact.address"] = s.address;
    if (s.phone2) set["contact.phone2"] = s.phone2;
    if (s.email) set["contact.email"] = s.email;
    if (s.email2) set["contact.email2"] = s.email2;
    if (s.sita) set["contact.sita"] = s.sita;
    if (Object.keys(set).length === 0) continue;
    const res = await Provider.updateOne({ slug: s.slug, owner: { $exists: false } }, { $set: set });
    updated += res.modifiedCount;
  }
  logger.info({ updated }, "Demo contacts refreshed");
} finally {
  await disconnectDatabase();
}
