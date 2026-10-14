/**
 * One-off: replaces the reviews' "one per user per provider" index with partial versions so guest
 * testimonials (no account) are allowed, and adds "one per email per provider" for guests.
 *   npx tsx --env-file-if-exists=.env src/scripts/migrate-review-indexes.ts
 */
import { connectDatabase, disconnectDatabase } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { Review } from "../modules/reviews/review.model.js";

await connectDatabase();
try {
  const existing = await Review.collection.indexes();
  const old = existing.find((i) => i.name === "provider_1_author_1" && !i.partialFilterExpression);
  if (old) await Review.collection.dropIndex("provider_1_author_1");
  await Review.syncIndexes();
  logger.info({ indexes: (await Review.collection.indexes()).map((i) => i.name) }, "Review indexes updated");
} finally {
  await disconnectDatabase();
}
