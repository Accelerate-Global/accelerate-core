import { defineConfig, devices } from "@playwright/test";

const webServerPort = 3000;
const webServerHost = "127.0.0.1";
const webServerUrl = `http://${webServerHost}:${webServerPort}`;

const localAuthEnv = {
  NEXT_PUBLIC_APP_URL:
    process.env.PLAYWRIGHT_NEXT_PUBLIC_APP_URL ?? webServerUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.PLAYWRIGHT_NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.PLAYWRIGHT_NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.PLAYWRIGHT_SUPABASE_SERVICE_ROLE_KEY ??
    "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz",
} as const;

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? webServerUrl,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: `npm run build && npm run start -- --hostname ${webServerHost} --port ${webServerPort}`,
    env: {
      ...process.env,
      ...localAuthEnv,
      NEXT_TELEMETRY_DISABLED: "1",
    },
    reuseExistingServer: !process.env.CI,
    url: process.env.PLAYWRIGHT_BASE_URL ?? webServerUrl,
  },
});
