import { z } from "zod";
import { isObjectId } from "../../lib/db.js";

export const providerParams = z.object({ providerId: z.string().refine(isObjectId, "Invalid provider id") });
