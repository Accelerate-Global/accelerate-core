import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const APP_URL = process.env.PHASE6_APP_URL ?? "http://localhost:3010";
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

const ADMIN_CREDENTIALS = {
  email: "admin@accelerate.test",
  password: "password123",
};
const NON_ADMIN_CREDENTIALS = {
  email: "owner-b@accelerate.test",
  password: "password123",
};

const TARGET_DATASET_ID = "20000000-0000-4000-8000-000000000002";
const EXPECTED_INITIAL_VISIBILITY = "workspace";
const ATTEMPTED_VISIBILITY = "global";

const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
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
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      body: JSON.stringify(credentials),
      headers: {
        apikey: SUPABASE_ANON_KEY,
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

const createBrowserContextForSession = async (browser, session) => {
  const context = await browser.newContext();

  await context.addCookies([
    {
      httpOnly: false,
      name: "sb-127-auth-token",
      sameSite: "Lax",
      url: APP_URL,
      value: buildSessionCookieValue(session),
    },
  ]);

  return context;
};

const getDatasetVisibility = async () => {
  const { data, error } = await serviceClient
    .from("datasets")
    .select("visibility")
    .eq("id", TARGET_DATASET_ID)
    .single();

  if (error) {
    throw new Error(
      `Failed to read target dataset visibility: ${error.message}`
    );
  }

  return data.visibility;
};

const extractVisibilityActionPayload = async (adminPage) => {
  await adminPage.goto(`${APP_URL}/app/admin/datasets`, {
    waitUntil: "networkidle",
  });

  const actionForm = adminPage
    .locator("form")
    .filter({
      has: adminPage.locator(
        `input[name="datasetId"][value="${TARGET_DATASET_ID}"]`
      ),
    })
    .first();

  if ((await actionForm.count()) === 0) {
    throw new Error("Could not locate dataset visibility action form.");
  }

  return actionForm.evaluate((form) => {
    const action = form.getAttribute("action") ?? window.location.pathname;
    const formData = new FormData(form);
    formData.set("nextVisibility", "global");

    return {
      action,
      entries: Object.fromEntries(
        Array.from(formData.entries()).map(([key, value]) => [
          key,
          String(value),
        ])
      ),
    };
  });
};

const main = async () => {
  const visibilityBefore = await getDatasetVisibility();

  if (visibilityBefore !== EXPECTED_INITIAL_VISIBILITY) {
    throw new Error(
      `Expected initial visibility '${EXPECTED_INITIAL_VISIBILITY}', got '${visibilityBefore}'. Reset local DB seed state first.`
    );
  }

  const browser = await chromium.launch({ headless: true });
  const adminSession = await getPasswordSession(ADMIN_CREDENTIALS);
  const nonAdminSession = await getPasswordSession(NON_ADMIN_CREDENTIALS);
  const adminContext = await createBrowserContextForSession(
    browser,
    adminSession
  );
  const nonAdminContext = await createBrowserContextForSession(
    browser,
    nonAdminSession
  );
  const adminPage = await adminContext.newPage();
  const payload = await extractVisibilityActionPayload(adminPage);
  const mutationResponse = await nonAdminContext.request.post(
    `${APP_URL}${payload.action}`,
    {
      failOnStatusCode: false,
      form: payload.entries,
    }
  );
  const visibilityAfter = await getDatasetVisibility();
  const blocked = visibilityBefore === visibilityAfter;

  console.log(
    JSON.stringify(
      {
        attemptedVisibility: ATTEMPTED_VISIBILITY,
        mutationBlocked: blocked,
        mutationFinalUrl: mutationResponse.url(),
        mutationStatus: mutationResponse.status(),
        representativeMutation: "updateDatasetVisibilityAction",
        visibilityAfter,
        visibilityBefore,
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
      "Non-admin mutation attempt changed dataset visibility. Admin guard proof failed."
    );
  }
};

await main();
