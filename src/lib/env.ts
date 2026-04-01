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

const normalizeAppUrl = (value: string): string => {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
};

/**
 * Prefer setting `NEXT_PUBLIC_APP_URL` on Vercel. If it is unset, this falls back to
 * `VERCEL_BRANCH_URL` then `VERCEL_URL`. A per-deployment `VERCEL_URL` becomes the
 * `emailRedirectTo` host for magic links; that hostname can differ from your stable
 * preview URL and interact badly with Vercel Deployment Protection on the first
 * unauthenticated request to `/auth/callback`.
 */
const getVercelAppUrl = (): string | null => {
  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const vercelBranchUrl = process.env.VERCEL_BRANCH_URL?.trim();
  const vercelUrl = process.env.VERCEL_URL?.trim();

  if (process.env.VERCEL_ENV === "production" && vercelProductionUrl) {
    return normalizeAppUrl(vercelProductionUrl);
  }

  if (vercelBranchUrl) {
    return normalizeAppUrl(vercelBranchUrl);
  }

  if (vercelUrl) {
    return normalizeAppUrl(vercelUrl);
  }

  return null;
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
  cachedAppUrl ??= appUrlSchema.parse(
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      getVercelAppUrl() ||
      "http://localhost:3000"
  );

  return cachedAppUrl;
};

export const getSupabaseServiceRoleKey = (): string => {
  return serviceRoleKeySchema.parse(process.env.SUPABASE_SERVICE_ROLE_KEY);
};

export const validateEnv = (): void => {
  if (typeof window === "undefined") {
    getServerEnv();
    getAppUrl();

    return;
  }

  getClientEnv();
};
