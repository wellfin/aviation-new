import mongoose, { type ClientSession } from "mongoose";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

// NoSQL injection: every request input is parsed by zod into primitives before it
// reaches a query (see lib/http `handler`), so user data can never inject `$` operators.
// Unknown filter paths are dropped rather than queried.
mongoose.set("strictQuery", true);

export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<void> {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000, autoIndex: true });
  logger.info({ db: mongoose.connection.name }, "MongoDB connected");
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Runs `fn` inside a multi-document transaction (requires a replica set).
 * Retries automatically on transient transaction errors.
 */
export async function withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}

export function isDuplicateKeyError(err: unknown): err is { code: 11000; keyPattern?: Record<string, unknown> } {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === 11000;
}

export const isObjectId = (id: string) => mongoose.isValidObjectId(id) && /^[a-f\d]{24}$/i.test(id);
