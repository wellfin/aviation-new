import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    globalSetup: ["test/global-setup.ts"],
    setupFiles: ["test/setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      JWT_ACCESS_SECRET: "test-only-access-secret-at-least-32-characters-long",
      CORS_ORIGINS: "http://localhost:3100",
      RAZORPAY_KEY_ID: "rzp_test_key",
      RAZORPAY_KEY_SECRET: "rzp_test_secret",
      RAZORPAY_WEBHOOK_SECRET: "rzp_test_webhook_secret",
      UPLOAD_DIR: ".test-uploads",
    },
  },
});
