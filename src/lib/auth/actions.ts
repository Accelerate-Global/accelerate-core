"use server";

import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { z } from "zod";

import { clientEnv } from "@/lib/env";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export interface MagicLinkActionResult {
  message: string;
  status: "success" | "error";
}

const DEFAULT_ERROR_MESSAGE =
  "We couldn’t send a magic link right now. Please try again.";
const INVALID_EMAIL_MESSAGE = "Enter a valid email address.";
const MAGIC_LINK_OPERATIONAL_ERROR_CODES = new Set<string>([
  "email_provider_disabled",
  "hook_payload_invalid_content_type",
  "hook_payload_over_size_limit",
  "hook_timeout",
  "hook_timeout_after_retry",
  "otp_disabled",
  "over_email_send_rate_limit",
  "over_request_rate_limit",
  "request_timeout",
  "unexpected_failure",
]);
const MASKED_MAGIC_LINK_ERROR_CODES = new Set<string>([
  "signup_disabled",
  "user_not_found",
]);

const emailAddressSchema = z.string().trim().email(INVALID_EMAIL_MESSAGE);

const isOperationalMagicLinkError = (error: AuthError): boolean => {
  const { code, status } = error;

  if (status === undefined || status === 0 || status === 429 || status >= 500) {
    return true;
  }

  if (!code || MASKED_MAGIC_LINK_ERROR_CODES.has(code)) {
    return false;
  }

  return MAGIC_LINK_OPERATIONAL_ERROR_CODES.has(code);
};

const getSuccessMessage = (emailAddress: string): string => {
  return `If ${emailAddress} matches an Accelerate account, you’ll receive a secure sign-in link shortly.`;
};

export const signInWithMagicLink = async (
  formData: FormData
): Promise<MagicLinkActionResult> => {
  const parsedEmailAddress = emailAddressSchema.safeParse(
    formData.get("email")
  );

  if (!parsedEmailAddress.success) {
    return {
      status: "error",
      message: INVALID_EMAIL_MESSAGE,
    };
  }

  const emailAddress = parsedEmailAddress.data.toLowerCase();
  const redirectUrl = new URL(
    routes.authCallback,
    clientEnv.NEXT_PUBLIC_APP_URL
  ).toString();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: emailAddress,
    options: {
      emailRedirectTo: redirectUrl,
      shouldCreateUser: false,
    },
  });

  if (!error) {
    return {
      status: "success",
      message: getSuccessMessage(emailAddress),
    };
  }

  if (!isOperationalMagicLinkError(error)) {
    return {
      status: "success",
      message: getSuccessMessage(emailAddress),
    };
  }

  return {
    status: "error",
    message: error.message || DEFAULT_ERROR_MESSAGE,
  };
};

export const signOut = async (): Promise<never> => {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect(routes.login);
};
