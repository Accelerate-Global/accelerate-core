import { z } from "zod";

const requiredString = (variableName: string) =>
  z.string().trim().min(1, `${variableName} is required.`);

const publicEnvShape = {
  NEXT_PUBLIC_SUPABASE_URL: requiredString("NEXT_PUBLIC_SUPABASE_URL").url(
    "NEXT_PUBLIC_SUPABASE_URL must be a valid URL."
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requiredString(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  ),
} as const;

export const clientEnvSchema = z.object(publicEnvShape);

export const serverEnvSchema = clientEnvSchema;

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

const appUrlSchema = requiredString("NEXT_PUBLIC_APP_URL").url(
  "NEXT_PUBLIC_APP_URL must be a valid URL."
);
const serviceRoleKeySchema = requiredString("SUPABASE_SERVICE_ROLE_KEY");
const googleServiceAccountJsonSchema = requiredString(
  "GOOGLE_SERVICE_ACCOUNT_JSON"
);

const formatEnvError = (
  runtime: "client" | "server",
  error: z.ZodError
): string => {
  const issues = error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "environment";

      return `- ${path}: ${issue.message}`;
    })
    .join("\n");

  return `Invalid ${runtime} environment variables:\n${issues}`;
};

const parseEnv = <TSchema extends z.ZodType>(
  schema: TSchema,
  values: unknown,
  runtime: "client" | "server"
): z.output<TSchema> => {
  const parsedEnv = schema.safeParse(values);

  if (parsedEnv.success) {
    return parsedEnv.data;
  }

  throw new Error(formatEnvError(runtime, parsedEnv.error));
};

const getFirstDefinedEnvValue = (...values: Array<string | undefined>) => {
  for (const value of values) {
    if (value?.trim()) {
      return value;
    }
  }

  return undefined;
};

const getClientEnvValues = () => {
  return {
    NEXT_PUBLIC_SUPABASE_URL: getFirstDefinedEnvValue(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_URL
    ),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: getFirstDefinedEnvValue(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      process.env.SUPABASE_PUBLISHABLE_KEY,
      process.env.SUPABASE_ANON_KEY
    ),
  };
};

let cachedClientEnv: ClientEnv | null = null;
let cachedServerEnv: ServerEnv | null = null;
let cachedAppUrl: string | null = null;

const getExplicitAppUrl = (): string | undefined => {
  return process.env.NEXT_PUBLIC_APP_URL?.trim();
};

const normalizeAppUrl = (value: string): string => {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
};

/**
 * Non-production convenience fallback only. In production, require
 * `NEXT_PUBLIC_APP_URL` explicitly so auth redirects and invite links stay on the
 * canonical public domain instead of drifting to preview or deployment hosts.
 */
const getNonProductionVercelAppUrl = (): string | null => {
  const vercelBranchUrl = process.env.VERCEL_BRANCH_URL?.trim();
  const vercelUrl = process.env.VERCEL_URL?.trim();

  if (vercelBranchUrl) {
    return normalizeAppUrl(vercelBranchUrl);
  }

  if (vercelUrl) {
    return normalizeAppUrl(vercelUrl);
  }

  return null;
};

const getRequiredProductionAppUrl = (): string => {
  const explicitAppUrl = getExplicitAppUrl();

  if (!explicitAppUrl) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL must be set to the canonical production origin when VERCEL_ENV=production."
    );
  }

  return appUrlSchema.parse(explicitAppUrl);
};

export const getClientEnv = (): ClientEnv => {
  cachedClientEnv ??= parseEnv(clientEnvSchema, getClientEnvValues(), "client");

  return cachedClientEnv;
};

export const getServerEnv = (): ServerEnv => {
  if (typeof window !== "undefined") {
    throw new Error("Server environment variables are not available here.");
  }

  cachedServerEnv ??= parseEnv(serverEnvSchema, getClientEnvValues(), "server");

  return cachedServerEnv;
};

export const getAppUrl = (): string => {
  if (process.env.VERCEL_ENV === "production") {
    cachedAppUrl ??= getRequiredProductionAppUrl();

    return cachedAppUrl;
  }

  cachedAppUrl ??= appUrlSchema.parse(
    getExplicitAppUrl() ||
      getNonProductionVercelAppUrl() ||
      "http://localhost:3000"
  );

  return cachedAppUrl;
};

export const getSupabaseServiceRoleKey = (): string => {
  return serviceRoleKeySchema.parse(process.env.SUPABASE_SERVICE_ROLE_KEY);
};

export const getGoogleServiceAccountJson = (): string => {
  return googleServiceAccountJsonSchema.parse(
    getFirstDefinedEnvValue(
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
      process.env.GOOGLE_WORKSPACE_SERVICE_ACCOUNT_JSON
    )
  );
};

export const validateEnv = (): void => {
  if (typeof window === "undefined") {
    getServerEnv();
    getAppUrl();

    return;
  }

  getClientEnv();
};
