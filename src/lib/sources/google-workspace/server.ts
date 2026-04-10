import "server-only";

import { createSign } from "node:crypto";
import { appendFileSync } from "node:fs";

import { z } from "zod";

import type {
  SourceConnectorStatus,
  SourcePreviewColumn,
  SourcePreviewRow,
} from "@/lib/sources/types";

export const GOOGLE_WORKSPACE_PREVIEW_ROW_LIMIT = 10;
export const GOOGLE_WORKSPACE_PREVIEW_COLUMN_LIMIT = 10;
export const GOOGLE_WORKSPACE_REQUEST_TIMEOUT_MS = 10_000;

const GOOGLE_WORKSPACE_CONNECTOR_KEY = "google-workspace" as const;
const GOOGLE_WORKSPACE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_WORKSPACE_DRIVE_API_URL = "https://www.googleapis.com/drive/v3";
const GOOGLE_WORKSPACE_SHEETS_API_URL =
  "https://sheets.googleapis.com/v4/spreadsheets";
const GOOGLE_WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
] as const;
const GOOGLE_WORKSPACE_DEFAULT_DETAIL =
  "Google Workspace connector is ready for read-only validation.";
const A1_RANGE_PATTERN = /^([A-Za-z]+)?(\d+)?(?::([A-Za-z]+)?(\d+)?)?$/;

const AGENT_DEBUG_LOG_PATH =
  "/Users/blake/Documents/accelerate-global/accelerate-core/.cursor/debug-15f9c0.log";

const agentDebugIngest = (entry: {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  hypothesisId: string;
}): void => {
  const payload = {
    sessionId: "15f9c0",
    timestamp: Date.now(),
    ...entry,
  };
  try {
    appendFileSync(AGENT_DEBUG_LOG_PATH, `${JSON.stringify(payload)}\n`);
  } catch {
    // ignore
  }
  fetch("http://127.0.0.1:7415/ingest/07b71db7-16df-4bc6-97e9-ca1555981d7e", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "15f9c0",
    },
    body: JSON.stringify(payload),
  }).catch(() => {
    /* debug ingest is best-effort */
  });
};

const googleWorkspaceEnvSchema = z.object({
  range: z.string().trim().min(1).optional(),
  serviceAccountJson: z.string().trim().min(1).optional(),
  sheetName: z.string().trim().min(1).optional(),
  spreadsheetId: z.string().trim().min(1).optional(),
});

const serviceAccountSchema = z.object({
  client_email: z.string().trim().email(),
  private_key: z.string().trim().min(1),
  project_id: z.string().trim().min(1).nullable().optional(),
});

const tokenResponseSchema = z.object({
  access_token: z.string().trim().min(1),
});

const spreadsheetMetadataSchema = z.object({
  properties: z.object({
    title: z.string().trim().min(1),
  }),
  sheets: z
    .array(
      z.object({
        properties: z.object({
          gridProperties: z
            .object({
              columnCount: z.number().int().nonnegative().optional(),
              rowCount: z.number().int().nonnegative().optional(),
            })
            .optional(),
          title: z.string().trim().min(1),
        }),
      })
    )
    .default([]),
});

const valuesResponseSchema = z.object({
  values: z.array(z.array(z.string())).optional(),
});

const driveFileMetadataSchema = z.object({
  modifiedTime: z.string().trim().min(1).nullable().optional(),
  name: z.string().trim().min(1).nullable().optional(),
});

type GoogleWorkspaceSourceStatusHealth = SourceConnectorStatus["health"];

interface GoogleWorkspaceConfig {
  range: string | null;
  serviceAccount: GoogleWorkspaceServiceAccount;
  sheetName: string | null;
  spreadsheetId: string;
}

interface GoogleWorkspaceServiceAccount {
  clientEmail: string;
  privateKey: string;
  projectId: string | null;
}

interface GoogleWorkspaceSheetMetadata {
  columnCount: number | null;
  rowCount: number | null;
  title: string;
}

interface GoogleWorkspacePreviewRow extends SourcePreviewRow {}

export interface GoogleWorkspaceSourceStatus
  extends SourceConnectorStatus<typeof GOOGLE_WORKSPACE_CONNECTOR_KEY> {
  driveFileName: string | null;
  driveModifiedTime: string | null;
  effectiveRange: string | null;
  previewColumns: SourcePreviewColumn[];
  previewRows: GoogleWorkspacePreviewRow[];
  sheetName: string | null;
  spreadsheetId: string | null;
  spreadsheetTitle: string | null;
  tabCount: number | null;
}

class GoogleWorkspaceOperatorError extends Error {
  details: string[];
  health: Exclude<GoogleWorkspaceSourceStatusHealth, "ready">;
  isConfigured: boolean;
  missingPrerequisites: string[];
  partialStatus: Partial<GoogleWorkspaceSourceStatus>;

  constructor({
    details,
    health,
    isConfigured,
    missingPrerequisites,
    partialStatus = {},
  }: {
    details: string[];
    health: Exclude<GoogleWorkspaceSourceStatusHealth, "ready">;
    isConfigured: boolean;
    missingPrerequisites: string[];
    partialStatus?: Partial<GoogleWorkspaceSourceStatus>;
  }) {
    super(details[0] ?? "Google Workspace validation failed.");
    this.name = "GoogleWorkspaceOperatorError";
    this.details = details;
    this.health = health;
    this.isConfigured = isConfigured;
    this.missingPrerequisites = missingPrerequisites;
    this.partialStatus = partialStatus;
  }
}

class GoogleWorkspaceRequestTimeoutError extends Error {
  constructor() {
    super("Google Workspace request timed out.");
    this.name = "GoogleWorkspaceRequestTimeoutError";
  }
}

const createBaseGoogleWorkspaceSourceStatus =
  (): GoogleWorkspaceSourceStatus => {
    return {
      details: [],
      driveFileName: null,
      driveModifiedTime: null,
      effectiveRange: null,
      health: "not-configured",
      isConfigured: false,
      key: GOOGLE_WORKSPACE_CONNECTOR_KEY,
      missingPrerequisites: [],
      previewColumns: [],
      previewRows: [],
      sheetName: null,
      spreadsheetId: null,
      spreadsheetTitle: null,
      tabCount: null,
    };
  };

const createGoogleWorkspaceSourceStatus = (
  overrides: Partial<GoogleWorkspaceSourceStatus>
): GoogleWorkspaceSourceStatus => {
  return {
    ...createBaseGoogleWorkspaceSourceStatus(),
    ...overrides,
  };
};

const getOptionalEnvValue = (value: string | undefined): string | undefined => {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : undefined;
};

const readGoogleWorkspaceEnv = () => {
  return googleWorkspaceEnvSchema.parse({
    range: getOptionalEnvValue(process.env.GOOGLE_WORKSPACE_SOURCE_RANGE),
    serviceAccountJson: getOptionalEnvValue(
      process.env.GOOGLE_WORKSPACE_SERVICE_ACCOUNT_JSON
    ),
    sheetName: getOptionalEnvValue(
      process.env.GOOGLE_WORKSPACE_SOURCE_SHEET_NAME
    ),
    spreadsheetId: getOptionalEnvValue(
      process.env.GOOGLE_WORKSPACE_SOURCE_SPREADSHEET_ID
    ),
  });
};

const createNotConfiguredError = (
  details: string[],
  missingPrerequisites: string[],
  partialStatus: Partial<GoogleWorkspaceSourceStatus> = {}
): GoogleWorkspaceOperatorError => {
  return new GoogleWorkspaceOperatorError({
    details,
    health: "not-configured",
    isConfigured: false,
    missingPrerequisites,
    partialStatus,
  });
};

const createValidationError = (
  details: string[],
  missingPrerequisites: string[],
  partialStatus: Partial<GoogleWorkspaceSourceStatus> = {},
  isConfigured = true
): GoogleWorkspaceOperatorError => {
  return new GoogleWorkspaceOperatorError({
    details,
    health: "validation-failed",
    isConfigured,
    missingPrerequisites,
    partialStatus,
  });
};

const getGoogleWorkspaceConfig = (): GoogleWorkspaceConfig => {
  const env = readGoogleWorkspaceEnv();
  const missingPrerequisites: string[] = [];
  const serviceAccountJson = env.serviceAccountJson;
  const spreadsheetId = env.spreadsheetId;

  if (!serviceAccountJson) {
    missingPrerequisites.push(
      "Set GOOGLE_WORKSPACE_SERVICE_ACCOUNT_JSON with the full service account JSON."
    );
  }

  if (!spreadsheetId) {
    missingPrerequisites.push(
      "Set GOOGLE_WORKSPACE_SOURCE_SPREADSHEET_ID to the target spreadsheet id."
    );
  }

  if (missingPrerequisites.length > 0) {
    throw createNotConfiguredError(
      ["Google Workspace connector is not configured yet."],
      missingPrerequisites,
      {
        sheetName: env.sheetName ?? null,
        spreadsheetId: env.spreadsheetId ?? null,
      }
    );
  }

  if (!(serviceAccountJson && spreadsheetId)) {
    throw new Error("Expected Google Workspace configuration to be present.");
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(serviceAccountJson);
  } catch {
    throw createValidationError(
      ["The configured Google service account JSON could not be parsed."],
      [
        "Store the exact downloaded Google service account JSON in GOOGLE_WORKSPACE_SERVICE_ACCOUNT_JSON.",
      ],
      {
        sheetName: env.sheetName ?? null,
        spreadsheetId: env.spreadsheetId ?? null,
      }
    );
  }

  const parsedServiceAccount = serviceAccountSchema.safeParse(parsedJson);

  if (!parsedServiceAccount.success) {
    throw createValidationError(
      [
        "The configured Google service account JSON is missing required fields.",
      ],
      [
        "Verify the service account JSON includes client_email and private_key before setting GOOGLE_WORKSPACE_SERVICE_ACCOUNT_JSON.",
      ],
      {
        sheetName: env.sheetName ?? null,
        spreadsheetId: env.spreadsheetId ?? null,
      }
    );
  }

  return {
    range: env.range ?? null,
    serviceAccount: {
      clientEmail: parsedServiceAccount.data.client_email,
      privateKey: parsedServiceAccount.data.private_key.replace(/\\n/g, "\n"),
      projectId: parsedServiceAccount.data.project_id ?? null,
    },
    sheetName: env.sheetName ?? null,
    spreadsheetId,
  };
};

const encodeBase64Url = (value: string): string => {
  return Buffer.from(value).toString("base64url");
};

const createGoogleWorkspaceJwt = (
  serviceAccount: GoogleWorkspaceServiceAccount
): string => {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(
    JSON.stringify({
      alg: "RS256",
      typ: "JWT",
    })
  );
  const payload = encodeBase64Url(
    JSON.stringify({
      aud: GOOGLE_WORKSPACE_TOKEN_URL,
      exp: nowInSeconds + 3600,
      iat: nowInSeconds,
      iss: serviceAccount.clientEmail,
      scope: GOOGLE_WORKSPACE_SCOPES.join(" "),
    })
  );
  const unsignedToken = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");

  signer.update(unsignedToken);
  signer.end();

  return `${unsignedToken}.${signer
    .sign(serviceAccount.privateKey)
    .toString("base64url")}`;
};

const fetchWithTimeout = async (
  input: string,
  init: RequestInit
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    GOOGLE_WORKSPACE_REQUEST_TIMEOUT_MS
  );

  try {
    return await fetch(input, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new GoogleWorkspaceRequestTimeoutError();
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const readJsonResponse = (response: Response): Promise<unknown> => {
  return response.json().catch(() => null);
};

const getGoogleErrorSummary = (
  payload: unknown
): { message: string; reasons: string[] } => {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return {
      message: "",
      reasons: [],
    };
  }

  const errorValue = payload.error;

  if (!errorValue || typeof errorValue !== "object") {
    return {
      message: typeof errorValue === "string" ? errorValue.toLowerCase() : "",
      reasons: [],
    };
  }

  const errorObject = errorValue as {
    errors?: unknown;
    message?: unknown;
  };
  const message =
    typeof errorObject.message === "string"
      ? errorObject.message.toLowerCase()
      : "";
  const errors = Array.isArray(errorObject.errors) ? errorObject.errors : [];
  const reasons = errors
    .flatMap((entry: unknown) => {
      if (!entry || typeof entry !== "object" || !("reason" in entry)) {
        return [];
      }

      const reason = (entry as { reason?: unknown }).reason;

      return typeof reason === "string" ? [reason.toLowerCase()] : [];
    })
    .filter(Boolean);

  return {
    message,
    reasons,
  };
};

const isApiDisabledError = (payload: unknown): boolean => {
  const errorSummary = getGoogleErrorSummary(payload);

  return (
    errorSummary.reasons.includes("accessnotconfigured") ||
    errorSummary.reasons.includes("servicedisabled") ||
    errorSummary.message.includes("api has not been used") ||
    errorSummary.message.includes("api is disabled")
  );
};

const getServiceAccountGuidance = (): string[] => {
  return [
    "Verify the service account JSON is current and belongs to the intended Google Cloud project.",
  ];
};

const createAuthFailureError = (
  partialStatus: Partial<GoogleWorkspaceSourceStatus>
): GoogleWorkspaceOperatorError => {
  return createValidationError(
    ["Google authentication failed for the configured service account."],
    getServiceAccountGuidance(),
    partialStatus
  );
};

const requestGoogleAccessToken = async (
  serviceAccount: GoogleWorkspaceServiceAccount,
  partialStatus: Partial<GoogleWorkspaceSourceStatus>
): Promise<string> => {
  const assertion = createGoogleWorkspaceJwt(serviceAccount);

  let response: Response;

  try {
    response = await fetchWithTimeout(GOOGLE_WORKSPACE_TOKEN_URL, {
      body: new URLSearchParams({
        assertion,
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });
    // #region agent log
    agentDebugIngest({
      location: "google-workspace/server.ts:requestGoogleAccessToken",
      message: "Google OAuth token HTTP response",
      data: { status: response.status, ok: response.ok },
      hypothesisId: "A",
    });
    // #endregion
  } catch (error) {
    if (error instanceof GoogleWorkspaceRequestTimeoutError) {
      throw createValidationError(
        ["Google authentication timed out before a token was issued."],
        [
          "Retry the request. If timeouts continue, verify outbound network access from the deployment environment.",
        ],
        partialStatus
      );
    }

    throw error;
  }

  if (!response.ok) {
    throw createAuthFailureError(partialStatus);
  }

  const parsedResponse = tokenResponseSchema.safeParse(
    await readJsonResponse(response)
  );

  if (!parsedResponse.success) {
    throw createAuthFailureError(partialStatus);
  }

  return parsedResponse.data.access_token;
};

const buildGoogleWorkspaceHeaders = (
  accessToken: string
): Record<string, string> => {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
};

const fetchGoogleSpreadsheetMetadata = async (
  accessToken: string,
  spreadsheetId: string,
  partialStatus: Partial<GoogleWorkspaceSourceStatus>
): Promise<{
  sheets: GoogleWorkspaceSheetMetadata[];
  spreadsheetTitle: string;
}> => {
  const url = new URL(
    `${GOOGLE_WORKSPACE_SHEETS_API_URL}/${encodeURIComponent(spreadsheetId)}`
  );

  url.searchParams.set("includeGridData", "false");
  url.searchParams.set(
    "fields",
    [
      "properties(title)",
      "sheets(properties(title,gridProperties(rowCount,columnCount)))",
    ].join(",")
  );

  let response: Response;

  try {
    response = await fetchWithTimeout(url.toString(), {
      headers: buildGoogleWorkspaceHeaders(accessToken),
      method: "GET",
    });
  } catch (error) {
    if (error instanceof GoogleWorkspaceRequestTimeoutError) {
      throw createValidationError(
        ["Google Sheets metadata request timed out."],
        [
          "Retry the request. If timeouts continue, verify Google Sheets access from the deployment environment.",
        ],
        partialStatus
      );
    }

    throw error;
  }

  if (!response.ok) {
    const payload = await readJsonResponse(response);
    // #region agent log
    agentDebugIngest({
      location: "google-workspace/server.ts:fetchGoogleSpreadsheetMetadata",
      message: "Google Sheets metadata non-OK",
      data: { status: response.status, hasPayload: payload != null },
      hypothesisId: "B",
    });
    // #endregion

    if (response.status === 404) {
      throw createValidationError(
        ["The configured spreadsheet could not be found."],
        [
          "Verify GOOGLE_WORKSPACE_SOURCE_SPREADSHEET_ID and share the spreadsheet with the service account as a Viewer.",
        ],
        partialStatus
      );
    }

    if (response.status === 403 && isApiDisabledError(payload)) {
      throw createValidationError(
        ["Google Sheets API access is unavailable for the configured project."],
        ["Enable the Google Sheets API in the Google Cloud project."],
        partialStatus
      );
    }

    if (response.status === 403) {
      throw createValidationError(
        ["The service account could not read the configured spreadsheet."],
        [
          "Share the spreadsheet with the service account as a Viewer and confirm the service account has Google Sheets access.",
        ],
        partialStatus
      );
    }

    if (response.status >= 500) {
      throw createValidationError(
        ["Google Sheets is temporarily unavailable."],
        ["Retry the request after Google Sheets recovers."],
        partialStatus
      );
    }

    throw createValidationError(
      ["Google Sheets metadata validation failed."],
      ["Verify the spreadsheet id and Google Sheets API configuration."],
      partialStatus
    );
  }

  const parsedResponse = spreadsheetMetadataSchema.safeParse(
    await readJsonResponse(response)
  );

  if (!parsedResponse.success) {
    throw createValidationError(
      ["Google Sheets metadata returned an unexpected response."],
      [
        "Retry the request. If the problem persists, verify the spreadsheet is still available.",
      ],
      partialStatus
    );
  }

  return {
    sheets: parsedResponse.data.sheets.map((sheet) => ({
      columnCount: sheet.properties.gridProperties?.columnCount ?? null,
      rowCount: sheet.properties.gridProperties?.rowCount ?? null,
      title: sheet.properties.title,
    })),
    spreadsheetTitle: parsedResponse.data.properties.title,
  };
};

const fetchGoogleDriveMetadata = async (
  accessToken: string,
  spreadsheetId: string,
  partialStatus: Partial<GoogleWorkspaceSourceStatus>
): Promise<{
  driveFileName: string | null;
  driveModifiedTime: string | null;
}> => {
  const url = new URL(
    `${GOOGLE_WORKSPACE_DRIVE_API_URL}/files/${encodeURIComponent(
      spreadsheetId
    )}`
  );

  url.searchParams.set("fields", "id,name,modifiedTime");

  let response: Response;

  try {
    response = await fetchWithTimeout(url.toString(), {
      headers: buildGoogleWorkspaceHeaders(accessToken),
      method: "GET",
    });
  } catch (error) {
    if (error instanceof GoogleWorkspaceRequestTimeoutError) {
      throw createValidationError(
        ["Google Drive metadata request timed out."],
        [
          "Retry the request. If timeouts continue, verify Google Drive access from the deployment environment.",
        ],
        partialStatus
      );
    }

    throw error;
  }

  if (!response.ok) {
    const payload = await readJsonResponse(response);
    // #region agent log
    agentDebugIngest({
      location: "google-workspace/server.ts:fetchGoogleDriveMetadata",
      message: "Google Drive metadata non-OK",
      data: { status: response.status, hasPayload: payload != null },
      hypothesisId: "D",
    });
    // #endregion

    if (response.status === 404) {
      throw createValidationError(
        ["Google Drive could not find the configured spreadsheet file."],
        [
          "Verify GOOGLE_WORKSPACE_SOURCE_SPREADSHEET_ID and share the spreadsheet with the service account as a Viewer.",
        ],
        partialStatus
      );
    }

    if (response.status === 403 && isApiDisabledError(payload)) {
      throw createValidationError(
        ["Google Drive API access is unavailable for the configured project."],
        ["Enable the Google Drive API in the Google Cloud project."],
        partialStatus
      );
    }

    if (response.status === 403) {
      throw createValidationError(
        [
          "The service account could not validate the spreadsheet through Google Drive.",
        ],
        [
          "Share the spreadsheet with the service account as a Viewer and confirm the Google Drive API is enabled.",
        ],
        partialStatus
      );
    }

    if (response.status >= 500) {
      throw createValidationError(
        ["Google Drive is temporarily unavailable."],
        ["Retry the request after Google Drive recovers."],
        partialStatus
      );
    }

    throw createValidationError(
      ["Google Drive metadata validation failed."],
      ["Verify the spreadsheet id and Google Drive API configuration."],
      partialStatus
    );
  }

  const parsedResponse = driveFileMetadataSchema.safeParse(
    await readJsonResponse(response)
  );

  if (!parsedResponse.success) {
    throw createValidationError(
      ["Google Drive metadata returned an unexpected response."],
      [
        "Retry the request. If the problem persists, verify the spreadsheet is still available in Google Drive.",
      ],
      partialStatus
    );
  }

  return {
    driveFileName: parsedResponse.data.name ?? null,
    driveModifiedTime: parsedResponse.data.modifiedTime ?? null,
  };
};

const escapeSheetNameForA1Notation = (sheetName: string): string => {
  const escapedSheetName = sheetName.replace(/'/g, "''");

  return `'${escapedSheetName}'`;
};

const getResolvedSheetMetadata = (
  configuredSheetName: string | null,
  sheets: GoogleWorkspaceSheetMetadata[],
  partialStatus: Partial<GoogleWorkspaceSourceStatus>
): GoogleWorkspaceSheetMetadata => {
  if (configuredSheetName) {
    const selectedSheet = sheets.find(
      (sheet) => sheet.title === configuredSheetName
    );

    if (!selectedSheet) {
      throw createValidationError(
        ["The configured sheet/tab name could not be found."],
        ["Verify the configured sheet/tab name exists in the spreadsheet."],
        partialStatus
      );
    }

    return selectedSheet;
  }

  const firstSheet = sheets[0];

  if (!firstSheet) {
    throw createValidationError(
      ["The configured spreadsheet does not contain any sheets."],
      [
        "Add at least one sheet/tab to the spreadsheet before validating it in the app.",
      ],
      partialStatus
    );
  }

  return firstSheet;
};

const buildDefaultPreviewRange = (sheetName: string): string => {
  return `${escapeSheetNameForA1Notation(
    sheetName
  )}!A1:${getColumnLabelFromIndex(GOOGLE_WORKSPACE_PREVIEW_COLUMN_LIMIT)}${GOOGLE_WORKSPACE_PREVIEW_ROW_LIMIT}`;
};

const resolveGoogleWorkspaceRange = ({
  configuredRange,
  sheetName,
}: {
  configuredRange: string | null;
  sheetName: string;
}): string => {
  if (!configuredRange) {
    return buildDefaultPreviewRange(sheetName);
  }

  if (configuredRange.includes("!")) {
    return configuredRange;
  }

  return `${escapeSheetNameForA1Notation(sheetName)}!${configuredRange}`;
};

const getRangeA1Notation = (value: string): string => {
  const rangeValue = value.split("!").at(-1) ?? value;

  return rangeValue.replace(/\$/g, "");
};

const getColumnIndexFromLabel = (value: string): number => {
  return value
    .toUpperCase()
    .split("")
    .reduce((total, character) => {
      return total * 26 + (character.charCodeAt(0) - 64);
    }, 0);
};

const getColumnLabelFromIndex = (value: number): string => {
  let remaining = value;
  let label = "";

  while (remaining > 0) {
    const nextValue = (remaining - 1) % 26;

    label = String.fromCharCode(65 + nextValue) + label;
    remaining = Math.floor((remaining - 1) / 26);
  }

  return label;
};

const getA1RangeBounds = (
  range: string
): {
  columnCount: number | null;
  startColumnIndex: number;
  startRowIndex: number;
} | null => {
  const match = A1_RANGE_PATTERN.exec(getRangeA1Notation(range));

  if (!match?.[1]) {
    return null;
  }

  const startColumnIndex = getColumnIndexFromLabel(match[1]);
  const endColumnIndex = match[3]
    ? getColumnIndexFromLabel(match[3])
    : startColumnIndex;

  return {
    columnCount:
      endColumnIndex >= startColumnIndex
        ? endColumnIndex - startColumnIndex + 1
        : null,
    startColumnIndex,
    startRowIndex: match[2] ? Number.parseInt(match[2], 10) : 1,
  };
};

const getPreviewColumnCount = (
  effectiveRange: string,
  values: string[][]
): number => {
  const maxValueColumnCount = values.reduce((largest, row) => {
    return Math.max(largest, row.length);
  }, 0);
  const requestedColumnCount =
    getA1RangeBounds(effectiveRange)?.columnCount ?? maxValueColumnCount;

  return Math.min(
    requestedColumnCount || maxValueColumnCount,
    GOOGLE_WORKSPACE_PREVIEW_COLUMN_LIMIT
  );
};

const createPreviewColumns = (
  effectiveRange: string,
  columnCount: number
): SourcePreviewColumn[] => {
  const startColumnIndex =
    getA1RangeBounds(effectiveRange)?.startColumnIndex ?? 1;

  return Array.from({ length: columnCount }, (_, index) => {
    const label = getColumnLabelFromIndex(startColumnIndex + index);

    return {
      key: `column-${label.toLowerCase()}`,
      label,
    };
  });
};

const createPreviewRows = (
  effectiveRange: string,
  previewValues: string[][],
  columnCount: number
): GoogleWorkspacePreviewRow[] => {
  const startRowIndex = getA1RangeBounds(effectiveRange)?.startRowIndex ?? 1;

  return previewValues
    .slice(0, GOOGLE_WORKSPACE_PREVIEW_ROW_LIMIT)
    .map((row, index) => {
      const boundedCells = row.slice(0, columnCount);

      return {
        cells: Array.from({ length: columnCount }, (_, cellIndex) => {
          return boundedCells[cellIndex] ?? "";
        }),
        index: startRowIndex + index,
      };
    });
};

const normalizeGoogleValues = (payload: unknown): string[][] | null => {
  const parsedResponse = valuesResponseSchema.safeParse(payload);

  if (parsedResponse.success) {
    return parsedResponse.data.values ?? [];
  }

  if (
    payload &&
    typeof payload === "object" &&
    "values" in payload &&
    Array.isArray(payload.values)
  ) {
    return payload.values.map((row) => {
      if (!Array.isArray(row)) {
        return [];
      }

      return row.map((cell) => {
        return typeof cell === "string" ? cell : String(cell ?? "");
      });
    });
  }

  return null;
};

const fetchGooglePreviewValues = async ({
  accessToken,
  effectiveRange,
  partialStatus,
  spreadsheetId,
}: {
  accessToken: string;
  effectiveRange: string;
  partialStatus: Partial<GoogleWorkspaceSourceStatus>;
  spreadsheetId: string;
}): Promise<{
  previewColumns: SourcePreviewColumn[];
  previewRows: GoogleWorkspacePreviewRow[];
}> => {
  const url = new URL(
    `${GOOGLE_WORKSPACE_SHEETS_API_URL}/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(effectiveRange)}`
  );

  let response: Response;

  try {
    response = await fetchWithTimeout(url.toString(), {
      headers: buildGoogleWorkspaceHeaders(accessToken),
      method: "GET",
    });
  } catch (error) {
    if (error instanceof GoogleWorkspaceRequestTimeoutError) {
      throw createValidationError(
        ["Google Sheets preview request timed out."],
        [
          "Retry the request. If timeouts continue, narrow the configured range or verify Google Sheets access from the deployment environment.",
        ],
        partialStatus
      );
    }

    throw error;
  }

  if (!response.ok) {
    const payload = await readJsonResponse(response);
    // #region agent log
    agentDebugIngest({
      location: "google-workspace/server.ts:fetchGooglePreviewValues",
      message: "Google Sheets preview values non-OK",
      data: { status: response.status, hasPayload: payload != null },
      hypothesisId: "E",
    });
    // #endregion

    if (response.status === 400) {
      throw createValidationError(
        ["The configured preview range is invalid."],
        ["Verify the configured sheet/tab name and A1 range."],
        partialStatus
      );
    }

    if (response.status === 403 && isApiDisabledError(payload)) {
      throw createValidationError(
        ["Google Sheets API access is unavailable for preview reads."],
        ["Enable the Google Sheets API in the Google Cloud project."],
        partialStatus
      );
    }

    if (response.status >= 500) {
      throw createValidationError(
        ["Google Sheets preview data is temporarily unavailable."],
        ["Retry the request after Google Sheets recovers."],
        partialStatus
      );
    }

    throw createValidationError(
      ["Google Sheets preview validation failed."],
      ["Verify the configured sheet/tab name and range."],
      partialStatus
    );
  }

  const previewValues = normalizeGoogleValues(await readJsonResponse(response));

  if (!previewValues) {
    throw createValidationError(
      ["Google Sheets preview returned an unexpected response."],
      [
        "Retry the request. If the problem persists, verify the configured range.",
      ],
      partialStatus
    );
  }

  const columnCount = getPreviewColumnCount(effectiveRange, previewValues);

  if (columnCount === 0 || previewValues.length === 0) {
    return {
      previewColumns: [],
      previewRows: [],
    };
  }

  return {
    previewColumns: createPreviewColumns(effectiveRange, columnCount),
    previewRows: createPreviewRows(effectiveRange, previewValues, columnCount),
  };
};

const getStatusFromOperatorError = (
  error: GoogleWorkspaceOperatorError,
  partialStatus: Partial<GoogleWorkspaceSourceStatus> = {}
): GoogleWorkspaceSourceStatus => {
  return createGoogleWorkspaceSourceStatus({
    ...partialStatus,
    ...error.partialStatus,
    details: error.details,
    health: error.health,
    isConfigured: error.isConfigured,
    missingPrerequisites: error.missingPrerequisites,
  });
};

export const getGoogleWorkspaceSourceStatus =
  async (): Promise<GoogleWorkspaceSourceStatus> => {
    const config = getGoogleWorkspaceConfig();
    const basePartialStatus: Partial<GoogleWorkspaceSourceStatus> = {
      sheetName: config.sheetName,
      spreadsheetId: config.spreadsheetId,
    };
    const accessToken = await requestGoogleAccessToken(
      config.serviceAccount,
      basePartialStatus
    );
    const spreadsheetMetadata = await fetchGoogleSpreadsheetMetadata(
      accessToken,
      config.spreadsheetId,
      basePartialStatus
    );
    const selectedSheet = getResolvedSheetMetadata(
      config.sheetName,
      spreadsheetMetadata.sheets,
      {
        ...basePartialStatus,
        spreadsheetTitle: spreadsheetMetadata.spreadsheetTitle,
        tabCount: spreadsheetMetadata.sheets.length,
      }
    );
    const effectiveRange = resolveGoogleWorkspaceRange({
      configuredRange: config.range,
      sheetName: selectedSheet.title,
    });
    const previewStatus = await fetchGooglePreviewValues({
      accessToken,
      effectiveRange,
      partialStatus: {
        ...basePartialStatus,
        effectiveRange,
        sheetName: selectedSheet.title,
        spreadsheetTitle: spreadsheetMetadata.spreadsheetTitle,
        tabCount: spreadsheetMetadata.sheets.length,
      },
      spreadsheetId: config.spreadsheetId,
    });
    const previewPartialStatus: Partial<GoogleWorkspaceSourceStatus> = {
      ...basePartialStatus,
      effectiveRange,
      previewColumns: previewStatus.previewColumns,
      previewRows: previewStatus.previewRows,
      sheetName: selectedSheet.title,
      spreadsheetTitle: spreadsheetMetadata.spreadsheetTitle,
      tabCount: spreadsheetMetadata.sheets.length,
    };

    try {
      const driveMetadata = await fetchGoogleDriveMetadata(
        accessToken,
        config.spreadsheetId,
        previewPartialStatus
      );

      return createGoogleWorkspaceSourceStatus({
        ...previewPartialStatus,
        details:
          previewStatus.previewRows.length > 0
            ? [
                GOOGLE_WORKSPACE_DEFAULT_DETAIL,
                "Validated both Google Sheets and Google Drive access with the configured service account.",
              ]
            : [
                GOOGLE_WORKSPACE_DEFAULT_DETAIL,
                "Validated both Google Sheets and Google Drive access, but the selected range returned no preview values.",
              ],
        driveFileName: driveMetadata.driveFileName,
        driveModifiedTime: driveMetadata.driveModifiedTime,
        health: "ready",
        isConfigured: true,
        missingPrerequisites: [],
      });
    } catch (error) {
      if (error instanceof GoogleWorkspaceOperatorError) {
        return getStatusFromOperatorError(error, previewPartialStatus);
      }

      throw error;
    }
  };

export const getSafeGoogleWorkspaceSourceStatus =
  async (): Promise<GoogleWorkspaceSourceStatus> => {
    try {
      return await getGoogleWorkspaceSourceStatus();
    } catch (error) {
      if (error instanceof GoogleWorkspaceOperatorError) {
        return getStatusFromOperatorError(error);
      }

      // #region agent log
      {
        const err = error instanceof Error ? error : new Error(String(error));
        agentDebugIngest({
          location:
            "google-workspace/server.ts:getSafeGoogleWorkspaceSourceStatus",
          message: "Unexpected non-operator error",
          data: {
            name: err.name,
            message: err.message.slice(0, 400),
          },
          hypothesisId: "C",
        });
      }
      // #endregion

      return createGoogleWorkspaceSourceStatus({
        details: [
          "Google Workspace validation failed unexpectedly, but the admin page is still available.",
        ],
        health: "validation-failed",
        isConfigured: true,
        key: GOOGLE_WORKSPACE_CONNECTOR_KEY,
        missingPrerequisites: [
          "Retry the request. If the problem persists, inspect server logs for the unexpected Google Workspace failure.",
        ],
      });
    }
  };
