import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // `server-only` throws outside the React Server Components runtime; tests run server code directly.
    alias: { "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    env: { DATA_SOURCE: "mock", WEATHER_PROVIDER: "mock", NOTAM_PROVIDER: "mock", AIRPORT_DATA_PROVIDER: "mock" },
  },
});
