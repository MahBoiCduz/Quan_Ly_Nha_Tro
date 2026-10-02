import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000", channel: process.env.PLAYWRIGHT_CHANNEL },
  webServer: {
    command: "node node_modules/next/dist/bin/next dev",
    url: `${process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"}/login`,
    reuseExistingServer: !process.env.CI,
  },
});
