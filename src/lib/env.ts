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
  NEXT_PUBLIC_APP_URL: requiredString("NEXT_PUBLIC_APP_URL").url(
    "NEXT_PUBLIC_APP_URL must be a valid URL."
  ),
} as const;

export const clientEnvSchema = z.object(publicEnvShape);

export const serverEnvSchema = clientEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: requiredString("SUPABASE_SERVICE_ROLE_KEY"),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

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

const clientEnvValues = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};

export const clientEnv = parseEnv(clientEnvSchema, clientEnvValues, "client");

export const serverEnv =
  typeof window === "undefined"
    ? parseEnv(
        serverEnvSchema,
        {
          ...clientEnvValues,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
        "server"
      )
    : (undefined as unknown as ServerEnv);
