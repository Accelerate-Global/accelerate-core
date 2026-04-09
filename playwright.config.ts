import { existsSync, readFileSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

const envLinePattern = /\r?\n/u;
const envNamePattern = /^[A-Za-z_][A-Za-z0-9_]*$/u;

const normalizeEnvValue = (value: string): string => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
};

const parseEnvAssignment = (
  rawLine: string
): { value: string; variableName: string } | null => {
  const trimmedLine = rawLine.trim();

  if (!trimmedLine || trimmedLine.startsWith("#")) {
    return null;
  }

  const separatorIndex = rawLine.indexOf("=");

  if (separatorIndex <= 0) {
    return null;
  }

  const variableName = rawLine.slice(0, separatorIndex).trim();

  if (!envNamePattern.test(variableName)) {
    return null;
  }

  return {
    value: normalizeEnvValue(rawLine.slice(separatorIndex + 1).trim()),
    variableName,
  };
};

const loadLocalEnvFiles = (): void => {
  for (const filename of [".env.local", ".env.test.local"]) {
    if (!existsSync(filename)) {
      continue;
    }

    const fileContents = readFileSync(filename, "utf8");

    for (const rawLine of fileContents.split(envLinePattern)) {
      const parsedAssignment = parseEnvAssignment(rawLine);

      if (!parsedAssignment) {
        continue;
      }

      if (process.env[parsedAssignment.variableName]?.trim()) {
        continue;
      }

      process.env[parsedAssignment.variableName] = parsedAssignment.value;
    }
  }
};

loadLocalEnvFiles();

const webServerPort = 3000;
const webServerHost = "127.0.0.1";
const webServerUrl = `http://${webServerHost}:${webServerPort}`;
const disableWebServer = process.env.PLAYWRIGHT_DISABLE_WEBSERVER === "true";
const googleSheetsFixture = JSON.stringify({
  values: [
    ["dataset_slug", "dataset_name", "workspace"],
    ["phase-a-alpha", "Phase A Alpha", "Workspace A"],
    ["phase-a-beta", "Phase A Beta", "Workspace B"],
    ["phase-a-gamma", "Phase A Gamma", "Workspace C"],
  ],
});

const getRequiredEnv = (name: string): string => {
  const value = process.env[name];

  if (value) {
    return value;
  }

  throw new Error(
    `${name} is required for Playwright local auth. Run \`supabase status\` to retrieve your local key and store it in a gitignored .env.test.local file.`
  );
};

const getLocalAuthEnv = () =>
  ({
    GOOGLE_SHEETS_TEST_FIXTURE_JSON:
      process.env.PLAYWRIGHT_GOOGLE_SHEETS_TEST_FIXTURE_JSON ??
      googleSheetsFixture,
    GOOGLE_SHEETS_TEST_MODE:
      process.env.PLAYWRIGHT_GOOGLE_SHEETS_TEST_MODE ?? "true",
    NEXT_PUBLIC_APP_URL:
      process.env.PLAYWRIGHT_NEXT_PUBLIC_APP_URL ?? webServerUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.PLAYWRIGHT_NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.PLAYWRIGHT_NEXT_PUBLIC_SUPABASE_URL ??
      "http://127.0.0.1:54321",
    SUPABASE_SERVICE_ROLE_KEY: getRequiredEnv(
      "PLAYWRIGHT_SUPABASE_SERVICE_ROLE_KEY"
    ),
  }) as const;

const hostedBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
const resolvedBaseUrl = disableWebServer
  ? (hostedBaseUrl ?? process.env.PLAYWRIGHT_BASE_URL ?? webServerUrl)
  : (process.env.PLAYWRIGHT_BASE_URL ?? webServerUrl);

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
    baseURL: resolvedBaseUrl,

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
  ...(disableWebServer
    ? {}
    : {
        webServer: {
          command: `npm run build && npm run start -- --hostname ${webServerHost} --port ${webServerPort}`,
          env: {
            ...process.env,
            ...getLocalAuthEnv(),
            NEXT_TELEMETRY_DISABLED: "1",
          },
          reuseExistingServer: !process.env.CI,
          url: resolvedBaseUrl,
        },
      }),
});
