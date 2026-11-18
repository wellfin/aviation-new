import { logger } from "../../lib/logger.js";
import { User } from "./user.model.js";

/**
 * Makes sure there is a Super Admin: if none is marked yet, the first Admin account ever
 * created (the site's original administrator) becomes it.
 */
export async function ensureSuperAdmin(): Promise<void> {
  if (await User.exists({ superAdmin: true })) return;
  const first = await User.findOneAndUpdate({ role: "ADMIN", status: "active" }, { $set: { superAdmin: true } }, { sort: { createdAt: 1 }, returnDocument: "after" });
  if (first) logger.info({ userId: first.id }, "Super Admin set to the first Admin account");
}
