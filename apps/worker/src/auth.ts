import { parseAllowedAdminEmails } from "@accelerate-core/shared";

export type AuthContext = {
  uid: string;
  email: string;
};

export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly expose: boolean;

  constructor(statusCode: number, message: string, expose = true) {
    super(message);
    this.statusCode = statusCode;
    this.expose = expose;
  }
}

export function getAllowedAdminEmails(): Set<string> {
  return parseAllowedAdminEmails(process.env.ALLOWED_ADMIN_EMAILS);
}

export function assertIsAllowedAdmin(email: string) {
  const allowed = getAllowedAdminEmails();
  if (allowed.size === 0) {
    throw new HttpError(503, "Admin allowlist not configured");
  }
  if (!allowed.has(email.toLowerCase())) throw new HttpError(403, "Forbidden");
}

export async function verifyFirebaseIdToken(_idToken: string): Promise<AuthContext> {
  // TODO(V1): Implement Firebase ID token verification.
  throw new HttpError(501, "Auth not implemented");
}

export async function getAuthContextFromRequest(input: {
  authorizationHeader?: string;
}): Promise<AuthContext> {
  const authHeader = input.authorizationHeader;
  if (!authHeader) throw new HttpError(401, "Missing Authorization header");

  const prefix = "Bearer ";
  if (!authHeader.startsWith(prefix)) throw new HttpError(401, "Invalid Authorization header");

  const token = authHeader.slice(prefix.length).trim();
  if (!token) throw new HttpError(401, "Missing bearer token");

  if (process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_EMAIL) {
    return { uid: "dev", email: process.env.DEV_AUTH_EMAIL };
  }

  return verifyFirebaseIdToken(token);
}

