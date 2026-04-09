import { existsSync, readFileSync } from "node:fs";

import { expect, type Page, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/database.types";

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

const defaultValidationSourceSlug = "phaseb-prod-validation-google-sheet";
const localAdminCredentials = {
  email: "admin@accelerate.test",
  password: "password123",
};
const runIdPattern = /runId=/;
const hostedValidationEnabled =
  process.env.PLAYWRIGHT_DISABLE_WEBSERVER === "true";

interface HostedValidationSource {
  id: string;
  name: string;
  range: string;
  slug: string;
}

interface HostedRunExpectations {
  expectedDataRowCount: number;
  expectedRange: string;
  expectedSampleText: string;
}

const getFirstDefinedEnvValue = (...names: string[]): string | undefined => {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return undefined;
};

const getRequiredHostedEnv = (label: string, ...envNames: string[]): string => {
  const value = getFirstDefinedEnvValue(...envNames);

  if (value) {
    return value;
  }

  throw new Error(`${label} is required for hosted Phase B validation.`);
};

const getOptionalEnv = (...envNames: string[]): string | undefined => {
  return getFirstDefinedEnvValue(...envNames);
};

const getHostedAppUrl = (): string => {
  return getRequiredHostedEnv(
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_APP_URL",
    "PLAYWRIGHT_BASE_URL"
  );
};

const getAdminCredentials = () => {
  if (!hostedValidationEnabled) {
    return localAdminCredentials;
  }

  return {
    email: getRequiredHostedEnv(
      "PHASEB_ADMIN_EMAIL",
      "PHASEB_ADMIN_EMAIL",
      "PLAYWRIGHT_PHASEB_ADMIN_EMAIL"
    ),
    password: getRequiredHostedEnv(
      "PHASEB_ADMIN_PASSWORD",
      "PHASEB_ADMIN_PASSWORD",
      "PLAYWRIGHT_PHASEB_ADMIN_PASSWORD"
    ),
  };
};

const getSupabaseUrl = (): string => {
  if (!hostedValidationEnabled) {
    return (
      process.env.PLAYWRIGHT_NEXT_PUBLIC_SUPABASE_URL ??
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      "http://127.0.0.1:54321"
    );
  }

  return getRequiredHostedEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "PLAYWRIGHT_NEXT_PUBLIC_SUPABASE_URL"
  );
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = hostedValidationEnabled
  ? getRequiredHostedEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "PLAYWRIGHT_NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )
  : (process.env.PLAYWRIGHT_NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH");

const toBase64Url = (input: string) => {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const getPasswordSession = async (credentials: {
  email: string;
  password: string;
}) => {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      body: JSON.stringify(credentials),
      headers: {
        apikey: supabaseAnonKey,
        "content-type": "application/json",
      },
      method: "POST",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Auth failed for ${credentials.email}: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
};

const getSupabaseSessionCookieName = (url: string): string => {
  const hostname = new URL(url).hostname;
  const storageKeySegment = hostname.split(".")[0];

  if (!storageKeySegment) {
    throw new Error("Could not derive the Supabase auth cookie name.");
  }

  return `sb-${storageKeySegment}-auth-token`;
};

const buildSessionCookieValue = (session: {
  access_token: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  token_type: string;
  user: unknown;
}) => {
  const payload = {
    access_token: session.access_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    refresh_token: session.refresh_token,
    token_type: session.token_type,
    user: session.user,
  };

  return `base64-${toBase64Url(JSON.stringify(payload))}`;
};

const createServiceClient = () => {
  return createClient<Database>(
    supabaseUrl,
    getRequiredHostedEnv(
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "PLAYWRIGHT_SUPABASE_SERVICE_ROLE_KEY"
    ),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

const isJsonRecord = (
  value: Json | null | undefined | unknown
): value is Record<string, Json | undefined> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const getJsonString = (
  value: Json | null | undefined | unknown,
  key: string
): string | null => {
  if (!isJsonRecord(value)) {
    return null;
  }

  const propertyValue = value[key];

  if (typeof propertyValue !== "string") {
    return null;
  }

  const normalizedValue = propertyValue.trim();

  return normalizedValue || null;
};

const getJsonNumber = (
  value: Json | null | undefined | unknown,
  key: string
): number | null => {
  if (!isJsonRecord(value)) {
    return null;
  }

  const propertyValue = value[key];

  if (typeof propertyValue !== "number" || !Number.isFinite(propertyValue)) {
    return null;
  }

  return propertyValue;
};

const deriveExpectedSampleText = (
  value: Json | null | undefined
): string | null => {
  if (!isJsonRecord(value)) {
    return null;
  }

  const sampleRows = value.sampleRows;

  if (!Array.isArray(sampleRows)) {
    return null;
  }

  for (const row of sampleRows) {
    if (!Array.isArray(row)) {
      continue;
    }

    for (const cell of row) {
      if (typeof cell !== "string") {
        continue;
      }

      const normalizedValue = cell.trim();

      if (normalizedValue) {
        return normalizedValue;
      }
    }
  }

  return null;
};

const parseSourceRange = (value: Json | null | undefined): string | null => {
  return getJsonString(value, "range");
};

const resolveHostedValidationSource =
  async (): Promise<HostedValidationSource> => {
    const validationSourceSlug =
      getOptionalEnv("PHASEB_VALIDATION_SOURCE_SLUG") ??
      defaultValidationSourceSlug;
    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from("registered_sources")
      .select("id, slug, name, config, is_enabled")
      .eq("slug", validationSourceSlug)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load validation source: ${error.message}`);
    }

    if (!data) {
      throw new Error(
        `Validation source slug "${validationSourceSlug}" was not found.`
      );
    }

    if (!data.is_enabled) {
      throw new Error(
        `Validation source slug "${validationSourceSlug}" is disabled.`
      );
    }

    const range =
      getOptionalEnv("GOOGLE_WORKSPACE_SOURCE_RANGE") ??
      parseSourceRange(data.config);

    if (!range) {
      throw new Error(
        "Validation range could not be derived from GOOGLE_WORKSPACE_SOURCE_RANGE or the registered source config."
      );
    }

    return {
      id: data.id,
      name: data.name,
      range,
      slug: data.slug,
    };
  };

const waitForDeferredPipelineRunId = async ({
  ingestionRunId,
  sourceId,
}: {
  ingestionRunId: string;
  sourceId: string;
}): Promise<string> => {
  const serviceClient = createServiceClient();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await serviceClient
      .from("pipeline_runs")
      .select("id")
      .eq("execution_mode", "deferred_scaffold")
      .eq("ingestion_run_id", ingestionRunId)
      .eq("pipeline_key", "source_ingestion_scaffold")
      .eq("source_id", sourceId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load linked pipeline run: ${error.message}`);
    }

    if (data?.id) {
      return data.id;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }

  throw new Error(
    "Timed out waiting for the deferred pipeline scaffold row to appear."
  );
};

const waitForHostedRunExpectations = async ({
  runId,
  source,
}: {
  runId: string;
  source: HostedValidationSource;
}): Promise<HostedRunExpectations> => {
  const serviceClient = createServiceClient();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await serviceClient
      .from("ingestion_runs")
      .select(
        "id, source_id, status, error_message, metadata, source_config_snapshot"
      )
      .eq("id", runId)
      .eq("source_id", source.id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load ingestion run details: ${error.message}`);
    }

    if (!data) {
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      continue;
    }

    if (data.status === "failed") {
      throw new Error(
        data.error_message || "Validation ingestion run failed unexpectedly."
      );
    }

    if (data.status !== "succeeded") {
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      continue;
    }

    const expectedDataRowCount = getJsonNumber(data.metadata, "dataRowCount");
    const expectedSampleText = deriveExpectedSampleText(data.metadata);
    const expectedRange =
      getOptionalEnv("GOOGLE_WORKSPACE_SOURCE_RANGE") ??
      parseSourceRange(data.source_config_snapshot) ??
      source.range;

    if (expectedDataRowCount === null) {
      throw new Error(
        "Validation run metadata did not include a usable data row count."
      );
    }

    if (!expectedSampleText) {
      throw new Error(
        "Validation run metadata did not include a usable sample text value."
      );
    }

    if (!expectedRange) {
      throw new Error(
        "Validation range could not be derived from the run metadata or source config."
      );
    }

    return {
      expectedDataRowCount,
      expectedRange,
      expectedSampleText,
    };
  }

  throw new Error(
    "Timed out waiting for the hosted ingestion run to complete successfully."
  );
};

const runLocalFixtureProof = async ({ page }: { page: Page }) => {
  const sourceName = `Phase A Google Sheet ${Date.now()}`;

  await page.goto("/app/admin/ingestion-runs");
  await expect(
    page.getByRole("heading", { exact: true, name: "Ingestion Runs" })
  ).toBeVisible();

  await page.getByLabel("Source name").first().fill(sourceName);
  await page
    .getByLabel("Description")
    .first()
    .fill("Operational Phase B source registration test.");
  await page.getByLabel("Spreadsheet ID").first().fill("phase-a-sheet-001");
  await page.getByLabel("Sheet name").first().fill("PhaseA");
  await page.getByLabel("Bounded A1 range").first().fill("A1:C10");
  await page.getByRole("button", { name: "Create source" }).click();

  await expect(page.getByText("Edit selected source")).toBeVisible();
  await expect(page.getByText(sourceName)).toBeVisible();
  await expect(page.getByRole("button", { name: "Run read" })).toBeVisible();

  await page.getByRole("button", { name: "Run read" }).click();
  await page.waitForURL(runIdPattern);

  await expect(page.getByText("Run details")).toBeVisible();
  await expect(page.getByText("Playwright fixture")).toBeVisible();
  await expect(page.getByText("Data rows after header: 3")).toBeVisible();
  await expect(page.getByText("Stored sample rows")).toBeVisible();
  await expect(page.getByText("Phase A Alpha")).toBeVisible();
  await expect(page.getByText("Succeeded")).toBeVisible();

  await page.goto("/app/admin/pipeline-runs");
  await expect(
    page.getByRole("heading", { exact: true, name: "Pipeline Runs" })
  ).toBeVisible();
  await expect(page.getByText("Deferred scaffold only")).toBeVisible();
  await expect(page.getByText(sourceName)).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Deferred" }).first()
  ).toBeVisible();
};

const runHostedProductionProof = async ({
  page,
  validationSource,
}: {
  page: Page;
  validationSource: HostedValidationSource;
}) => {
  await page.goto(`/app/admin/ingestion-runs?sourceId=${validationSource.id}`);
  await expect(
    page.getByRole("heading", { exact: true, name: "Ingestion Runs" })
  ).toBeVisible();
  await expect(page.getByText(validationSource.name)).toBeVisible();

  const runReadForm = page
    .locator("form")
    .filter({
      has: page.locator(
        `input[name="sourceId"][value="${validationSource.id}"]`
      ),
    })
    .filter({
      has: page.getByRole("button", { name: "Run read" }),
    })
    .first();
  const runReadButton = runReadForm.getByRole("button", { name: "Run read" });

  await expect(runReadButton).toBeEnabled();
  await runReadButton.click();
  await page.waitForURL(runIdPattern);

  const runId = new URL(page.url()).searchParams.get("runId");

  if (!runId) {
    throw new Error("Could not determine the ingestion run id from the URL.");
  }

  const runExpectations = await waitForHostedRunExpectations({
    runId,
    source: validationSource,
  });

  await expect(page.getByText("Run details")).toBeVisible();
  await expect(
    page.getByText("Read mode: Live Google Sheets API")
  ).toBeVisible();
  await expect(
    page.getByText(
      `Data rows after header: ${runExpectations.expectedDataRowCount}`
    )
  ).toBeVisible();
  await expect(
    page.getByText(runExpectations.expectedSampleText)
  ).toBeVisible();
  await expect(
    page.getByText(`Range: ${runExpectations.expectedRange}`)
  ).toBeVisible();
  await expect(page.getByText("Succeeded")).toBeVisible();

  const pipelineRunId = await waitForDeferredPipelineRunId({
    ingestionRunId: runId,
    sourceId: validationSource.id,
  });

  await page.goto(
    `/app/admin/pipeline-runs?sourceId=${validationSource.id}&runId=${pipelineRunId}`
  );
  await expect(
    page.getByRole("heading", { exact: true, name: "Pipeline Runs" })
  ).toBeVisible();
  await expect(page.getByText("Deferred scaffold only")).toBeVisible();
  await expect(
    page.getByText("Execution mode: deferred_scaffold")
  ).toBeVisible();
  await expect(page.getByText("Deferred scaffold only: Yes")).toBeVisible();
};

test("admin can register a source, trigger a read, and inspect deferred pipeline scaffolding", async ({
  page,
  baseURL,
  context,
}) => {
  const session = await getPasswordSession(getAdminCredentials());
  const appUrl =
    baseURL ??
    (hostedValidationEnabled ? getHostedAppUrl() : "http://127.0.0.1:3000");

  await context.addCookies([
    {
      httpOnly: false,
      name: getSupabaseSessionCookieName(supabaseUrl),
      sameSite: "Lax",
      url: appUrl,
      value: buildSessionCookieValue(session),
    },
  ]);

  if (hostedValidationEnabled) {
    const validationSource = await resolveHostedValidationSource();

    await runHostedProductionProof({
      page,
      validationSource,
    });

    return;
  }

  await runLocalFixtureProof({
    page,
  });
});
