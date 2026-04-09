import { existsSync, readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const defaultValidationNamespace = "phaseb-prod-validation";
const defaultValidationSourceSlug = "phaseb-prod-validation-google-sheet";
const envLinePattern = /\r?\n/u;
const envNamePattern = /^[A-Za-z_][A-Za-z0-9_]*$/u;

const normalizeEnvValue = (value) => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
};

const parseEnvAssignment = (rawLine) => {
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

const loadLocalEnvFiles = () => {
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

const getFirstDefinedEnvValue = (...names) => {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return undefined;
};

const requireEnv = (label, ...envNames) => {
  const value = getFirstDefinedEnvValue(...envNames);

  if (!value) {
    throw new Error(`${label} is required for Phase B production validation.`);
  }

  return value;
};

const getOptionalEnv = (...envNames) => {
  return getFirstDefinedEnvValue(...envNames);
};

const appUrl = requireEnv(
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_APP_URL",
  "PHASEB_APP_URL"
);
const supabaseUrl = requireEnv(
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL"
);
const supabaseAnonKey = requireEnv(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
);
const supabaseServiceRoleKey = requireEnv(
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
);
const validationNamespace =
  getOptionalEnv("PHASEB_VALIDATION_NAMESPACE") ?? defaultValidationNamespace;
const validationSourceSlug =
  getOptionalEnv("PHASEB_VALIDATION_SOURCE_SLUG") ??
  defaultValidationSourceSlug;

const adminCredentials = {
  email: requireEnv("PHASEB_ADMIN_EMAIL", "PHASEB_ADMIN_EMAIL"),
  password: requireEnv("PHASEB_ADMIN_PASSWORD", "PHASEB_ADMIN_PASSWORD"),
};
const nonAdminCredentials = {
  email: requireEnv("PHASEB_NON_ADMIN_EMAIL", "PHASEB_NON_ADMIN_EMAIL"),
  password: requireEnv(
    "PHASEB_NON_ADMIN_PASSWORD",
    "PHASEB_NON_ADMIN_PASSWORD"
  ),
};

const sourceName = `${validationNamespace}-source-create-attempt-${Date.now()}`;

const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const toBase64Url = (input) => {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const getPasswordSession = async (credentials) => {
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

const buildSessionCookieValue = (session) => {
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

const getSupabaseSessionCookieName = (url) => {
  const hostname = new URL(url).hostname;
  const storageKeySegment = hostname.split(".")[0];

  if (!storageKeySegment) {
    throw new Error("Could not derive the Supabase auth cookie name.");
  }

  return `sb-${storageKeySegment}-auth-token`;
};

const createBrowserContextForSession = async (browser, session) => {
  const context = await browser.newContext();

  await context.addCookies([
    {
      httpOnly: false,
      name: getSupabaseSessionCookieName(supabaseUrl),
      sameSite: "Lax",
      url: appUrl,
      value: buildSessionCookieValue(session),
    },
  ]);

  return context;
};

const isRecord = (value) => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const getConfigString = (value, key) => {
  if (!isRecord(value) || typeof value[key] !== "string") {
    return null;
  }

  const normalizedValue = value[key].trim();

  return normalizedValue || null;
};

const resolveValidationSourceValues = async () => {
  const { data, error } = await serviceClient
    .from("registered_sources")
    .select("id, slug, name, config")
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

  const spreadsheetId =
    getOptionalEnv("GOOGLE_WORKSPACE_SOURCE_SPREADSHEET_ID") ??
    getConfigString(data.config, "spreadsheetId");
  const sheetName =
    getOptionalEnv("GOOGLE_WORKSPACE_SOURCE_SHEET_NAME") ??
    getConfigString(data.config, "sheetName");
  const range =
    getOptionalEnv("GOOGLE_WORKSPACE_SOURCE_RANGE") ??
    getConfigString(data.config, "range");

  if (!(spreadsheetId && sheetName && range)) {
    throw new Error(
      "Validation spreadsheet id, sheet name, and range must come from .env.local or the registered source config."
    );
  }

  return {
    range,
    sheetName,
    sourceId: data.id,
    sourceSlug: data.slug,
    spreadsheetId,
  };
};

const extractCreateSourceActionPayload = async (
  adminPage,
  validationSourceValues
) => {
  await adminPage.goto(`${appUrl}/app/admin/ingestion-runs`, {
    waitUntil: "networkidle",
  });

  const actionForm = adminPage
    .locator("form")
    .filter({
      has: adminPage.locator(
        'input[name="connectorKind"][value="google_sheets"]'
      ),
    })
    .first();

  if ((await actionForm.count()) === 0) {
    throw new Error("Could not locate source creation form.");
  }

  return actionForm.evaluate(
    (form, values) => {
      const action = form.getAttribute("action") ?? window.location.pathname;
      const payload = new FormData(form);

      payload.set("name", values.sourceName);
      payload.set(
        "description",
        "Phase B production validation only. Non-admin mutation proof attempt."
      );
      payload.set("spreadsheetId", values.validationSpreadsheetId);
      payload.set("sheetName", values.validationSheetName);
      payload.set("range", values.validationRange);
      payload.set("isEnabled", "true");

      return {
        action,
        entries: Object.fromEntries(
          Array.from(payload.entries()).map(([key, value]) => [
            key,
            String(value),
          ])
        ),
      };
    },
    {
      sourceName,
      validationRange: validationSourceValues.range,
      validationSheetName: validationSourceValues.sheetName,
      validationSpreadsheetId: validationSourceValues.spreadsheetId,
    }
  );
};

const sourceExists = async () => {
  const { data, error } = await serviceClient
    .from("registered_sources")
    .select("id")
    .eq("name", sourceName)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to inspect registered_sources: ${error.message}`);
  }

  return Boolean(data);
};

const main = async () => {
  const browser = await chromium.launch({ headless: true });
  const adminSession = await getPasswordSession(adminCredentials);
  const nonAdminSession = await getPasswordSession(nonAdminCredentials);
  const adminContext = await createBrowserContextForSession(
    browser,
    adminSession
  );
  const nonAdminContext = await createBrowserContextForSession(
    browser,
    nonAdminSession
  );
  const adminPage = await adminContext.newPage();
  const validationSourceValues = await resolveValidationSourceValues();
  const payload = await extractCreateSourceActionPayload(
    adminPage,
    validationSourceValues
  );
  const mutationResponse = await nonAdminContext.request.post(
    `${appUrl}${payload.action}`,
    {
      failOnStatusCode: false,
      form: payload.entries,
    }
  );
  const blocked = !(await sourceExists());

  console.log(
    JSON.stringify(
      {
        attemptedSourceName: sourceName,
        mutationBlocked: blocked,
        mutationFinalUrl: mutationResponse.url(),
        mutationStatus: mutationResponse.status(),
        representativeMutation: "saveRegisteredSourceAction",
        validationNamespace,
        validationSourceId: validationSourceValues.sourceId,
        validationSourceSlug: validationSourceValues.sourceSlug,
      },
      null,
      2
    )
  );

  await adminContext.close();
  await nonAdminContext.close();
  await browser.close();

  if (!blocked) {
    throw new Error(
      "Non-admin source creation attempt inserted a registered source. Admin guard proof failed."
    );
  }
};

await main();
