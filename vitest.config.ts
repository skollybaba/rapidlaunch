import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(
        __dirname,
        "node_modules/server-only/empty.js"
      ),
    },
  },
  test: {
    environment: "node",
    env: {
      NODE_ENV: "test",
      MONGODB_URI: "mongodb://127.0.0.1:27017/quicklaunch_test",
      PAYSTACK_SECRET_KEY: "sk_test_unit_dummy",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      REMINDER_CRON_SECRET: "unit-test-reminder-secret",
    },
  },
});