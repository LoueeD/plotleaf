import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 25_000,
  expect: { timeout: 6000 },
  fullyParallel: false,
  workers: 2,
  reporter: "list",
  use: {
    headless: true,
    viewport: { width: 1440, height: 1100 },
    colorScheme: "light",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
