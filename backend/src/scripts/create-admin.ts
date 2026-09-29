/**
 * Creates (or promotes) an administrator.
 *   ADMIN_EMAIL=you@company.com ADMIN_PASSWORD='...' npm run create-admin
 * Credentials come from the environment only — nothing is hard-coded.
 */
import { z } from "zod";
import { hashPassword } from "../lib/crypto.js";
import { connectDatabase, disconnectDatabase } from "../lib/db.js";
import { password } from "../modules/auth/auth.schemas.js";
import { User } from "../modules/users/user.model.js";

const input = z
  .object({
    ADMIN_EMAIL: z.string().trim().toLowerCase().email(),
    ADMIN_PASSWORD: password,
    ADMIN_FIRST_NAME: z.string().trim().min(1).default("Site"),
    ADMIN_LAST_NAME: z.string().trim().min(1).default("Administrator"),
  })
  .parse(process.env);

await connectDatabase();
const passwordHash = await hashPassword(input.ADMIN_PASSWORD);
const user = await User.findOneAndUpdate(
  { email: input.ADMIN_EMAIL },
  {
    $set: { role: "ADMIN", status: "active", passwordHash, emailVerifiedAt: new Date() },
    $setOnInsert: { firstName: input.ADMIN_FIRST_NAME, lastName: input.ADMIN_LAST_NAME },
    $inc: { tokenVersion: 1 },
  },
  { upsert: true, returnDocument: "after" },
);
console.error(`Administrator ready: ${user.email}`);
await disconnectDatabase();
