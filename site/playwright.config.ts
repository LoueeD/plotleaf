import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  workers: 2,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:8791",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: {
    command:
      "node node_modules/wrangler/bin/wrangler.js dev --ip 127.0.0.1 --port 8791",
    url: "http://127.0.0.1:8791",
    timeout: 30_000,
    reuseExistingServer: false,
    env: {
      WRANGLER_SEND_METRICS: "false",
      WRANGLER_LOG_PATH: ".wrangler/playwright.log",
    },
  },
});
