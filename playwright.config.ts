import { defineConfig } from "@playwright/test";
export default defineConfig({
  expect: { timeout: 15000 },
  testDir: "./tests/e2e",
  timeout: 120000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
    headless: true,
    trace: "retain-on-failure",
  },
  reporter: "list",
  webServer: {
    command: `"${process.execPath}" node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 3100`,
    url: "http://127.0.0.1:3100/api/health",
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: "",
      AUTH_MODE: "demo",
      DEMO_ACCESS_CODE: "local-zyvara-demo",
      STORAGE_MODE: "local",
      LOCAL_DATA_DIR: ".data/e2e",
      APP_ORIGIN: "http://127.0.0.1:3100",
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
