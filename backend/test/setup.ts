import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, inject } from "vitest";
import { seedCategories } from "../src/modules/categories/category.seed.js";
import { testOutbox } from "../src/modules/notifications/mailer.js";

// Each test file gets its own database so files can run in parallel.
beforeAll(async () => {
  const dbName = `test_${randomBytes(6).toString("hex")}`;
  await mongoose.connect(inject("mongoUri"), { dbName });
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
});

beforeEach(async () => {
  testOutbox.length = 0;
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
  // Reference data every test can rely on (service categories are validated on provider writes).
  await seedCategories();
});

afterAll(async () => {
  await mongoose.connection.db?.dropDatabase();
  await mongoose.disconnect();
});
