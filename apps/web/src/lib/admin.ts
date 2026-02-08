import { parseAllowedAdminEmails } from "@accelerate-core/shared";

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = parseAllowedAdminEmails(process.env.NEXT_PUBLIC_ALLOWED_ADMIN_EMAILS);
  if (allowed.size === 0) return false;
  return allowed.has(email.toLowerCase());
}

