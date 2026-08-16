import { defineConfig } from "@playwright/test";

const baseURL = process.env.SIGNALDESK_BASE_URL;
if (baseURL === undefined || baseURL.length === 0) {
  throw new Error("SIGNALDESK_BASE_URL is required for Workflow tests.");
}

export default defineConfig({
  testDir: "./tests/workflow",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  outputDir: ".elder/runtime/playwright-results",
  use: {
    baseURL,
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "desktop-chrome",
      use: { viewport: { width: 1440, height: 900 } }
    },
    {
      name: "mobile-chrome",
      use: { viewport: { width: 390, height: 844 } }
    }
  ]
});
