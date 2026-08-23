import { defineConfig } from "@playwright/test";

const baseURL = process.env.SIGNALDESK_BASE_URL;
if (baseURL === undefined || baseURL.length === 0) {
  throw new Error("SIGNALDESK_BASE_URL is required for Workflow tests.");
}
const authorization = process.env.SIGNALDESK_AUTHORIZATION;

export default defineConfig({
  testDir: "./tests/workflow",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  outputDir: ".elder/runtime/playwright-results",
  use: {
    baseURL,
    ...(authorization === undefined
      ? {}
      : { extraHTTPHeaders: { authorization } }),
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    screenshot: "only-on-failure",
    trace: authorization === undefined ? "retain-on-failure" : "off"
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
