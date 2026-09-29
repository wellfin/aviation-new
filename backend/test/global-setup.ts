import { existsSync } from "node:fs";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

// Reuse a locally installed mongod when present (no download); otherwise mongodb-memory-server fetches one.
const LOCAL_MONGOD = process.env.MONGOMS_SYSTEM_BINARY ?? "C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe";

let replSet: MongoMemoryReplSet | undefined;

export async function setup(project: TestProject): Promise<void> {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
    binary: existsSync(LOCAL_MONGOD) ? { systemBinary: LOCAL_MONGOD } : {},
  });
  project.provide("mongoUri", replSet.getUri());
}

export async function teardown(): Promise<void> {
  await replSet?.stop();
}
