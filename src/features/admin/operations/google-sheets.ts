import "server-only";

import { createSign } from "node:crypto";

import { z } from "zod";

import { getGoogleServiceAccountJson } from "@/lib/env";

import type { GoogleSheetsSourceConfig } from "./source-config";
import { buildGoogleSheetsValueRange } from "./source-config";

const googleSheetsScope =
  "https://www.googleapis.com/auth/spreadsheets.readonly";
const defaultGoogleTokenUri = "https://oauth2.googleapis.com/token";

const googleServiceAccountSchema = z.object({
  client_email: z.string().trim().email(),
  private_key: z.string().trim().min(1),
  token_uri: z.string().trim().url().default(defaultGoogleTokenUri),
});

const googleSheetsFixtureSchema = z.object({
  values: z.array(z.array(z.string())).default([]),
});

interface GoogleServiceAccount {
  clientEmail: string;
  privateKey: string;
  tokenUri: string;
}

export interface GoogleSheetsReadResult {
  durationMs: number;
  values: string[][];
  valuesSource: "google_api" | "test_fixture";
}

const toBase64Url = (value: Buffer | string): string => {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const getGoogleServiceAccount = (): GoogleServiceAccount => {
  const rawValue = getGoogleServiceAccountJson();
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawValue);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON must be valid JSON.");
  }

  const parsedAccount = googleServiceAccountSchema.safeParse(parsedJson);

  if (!parsedAccount.success) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is missing required fields.");
  }

  return {
    clientEmail: parsedAccount.data.client_email,
    privateKey: parsedAccount.data.private_key,
    tokenUri: parsedAccount.data.token_uri,
  };
};

const getTestFixtureValues = (): string[][] | null => {
  if (process.env.GOOGLE_SHEETS_TEST_MODE !== "true") {
    return null;
  }

  const rawFixture = process.env.GOOGLE_SHEETS_TEST_FIXTURE_JSON?.trim();

  if (!rawFixture) {
    throw new Error(
      "GOOGLE_SHEETS_TEST_FIXTURE_JSON is required when GOOGLE_SHEETS_TEST_MODE=true."
    );
  }

  let parsedFixture: unknown;

  try {
    parsedFixture = JSON.parse(rawFixture);
  } catch {
    throw new Error("GOOGLE_SHEETS_TEST_FIXTURE_JSON must be valid JSON.");
  }

  const fixture = googleSheetsFixtureSchema.safeParse(parsedFixture);

  if (!fixture.success) {
    throw new Error(
      "GOOGLE_SHEETS_TEST_FIXTURE_JSON must match the expected values shape."
    );
  }

  return fixture.data.values;
};

const buildSignedJwt = (serviceAccount: GoogleServiceAccount): string => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const claims = {
    aud: serviceAccount.tokenUri,
    exp: issuedAt + 3600,
    iat: issuedAt,
    iss: serviceAccount.clientEmail,
    scope: googleSheetsScope,
  };
  const unsignedToken = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(claims))}`;
  const signer = createSign("RSA-SHA256");

  signer.update(unsignedToken);
  signer.end();

  return `${unsignedToken}.${toBase64Url(signer.sign(serviceAccount.privateKey))}`;
};

const getGoogleAccessToken = async (
  serviceAccount: GoogleServiceAccount
): Promise<string> => {
  const tokenResponse = await fetch(serviceAccount.tokenUri, {
    body: new URLSearchParams({
      assertion: buildSignedJwt(serviceAccount),
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    }),
    cache: "no-store",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!tokenResponse.ok) {
    throw new Error(
      `Google token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`
    );
  }

  const body = (await tokenResponse.json()) as { access_token?: string };

  if (!body.access_token) {
    throw new Error("Google token exchange did not return an access token.");
  }

  return body.access_token;
};

export const readGoogleSheetValues = async (
  config: GoogleSheetsSourceConfig
): Promise<GoogleSheetsReadResult> => {
  const fixtureValues = getTestFixtureValues();
  const startedAt = Date.now();

  if (fixtureValues) {
    return {
      durationMs: Date.now() - startedAt,
      values: fixtureValues,
      valuesSource: "test_fixture",
    };
  }

  const serviceAccount = getGoogleServiceAccount();
  const accessToken = await getGoogleAccessToken(serviceAccount);
  const valueRange = buildGoogleSheetsValueRange(config);
  const sheetsResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}/values/${encodeURIComponent(valueRange)}`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: "GET",
    }
  );

  if (!sheetsResponse.ok) {
    throw new Error(
      `Google Sheets read failed: ${sheetsResponse.status} ${sheetsResponse.statusText}`
    );
  }

  const body = (await sheetsResponse.json()) as {
    values?: unknown;
  };
  const parsedValues = z.array(z.array(z.string())).safeParse(body.values);

  return {
    durationMs: Date.now() - startedAt,
    values: parsedValues.success ? parsedValues.data : [],
    valuesSource: "google_api",
  };
};
