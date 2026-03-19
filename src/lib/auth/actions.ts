"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { clientEnv } from "@/lib/env";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export interface MagicLinkActionResult {
  message: string;
  status: "success" | "error";
}

const UNKNOWN_EMAIL_ERROR_FRAGMENTS = [
  "signups not allowed",
  "signup is disabled",
  "user not found",
  "email not found",
  "no user found",
] as const;

const DEFAULT_ERROR_MESSAGE =
  "We couldn’t send a magic link right now. Please try again.";
const INVALID_EMAIL_MESSAGE = "Enter a valid email address.";

const emailAddressSchema = z.string().trim().email(INVALID_EMAIL_MESSAGE);

const isUnknownEmailError = (message: string): boolean => {
  const normalizedMessage = message.toLowerCase();

  return UNKNOWN_EMAIL_ERROR_FRAGMENTS.some((fragment) => {
    return normalizedMessage.includes(fragment);
  });
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
    routes.login,
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

  if (!error || isUnknownEmailError(error.message)) {
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
