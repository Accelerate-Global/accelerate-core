"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { routes } from "@/lib/routes";

import {
  finalizeInviteForCurrentUser,
  getCurrentUser,
  resolveInviteToken,
  sendInviteMagicLink,
  sendReturningUserMagicLink,
  signOutCurrentUser,
} from "./server";

const emailSchema = z.string().trim().email();

const getInviteRedirect = (
  token: string,
  status: "error" | "sent" | "signed-out"
): string => {
  const params = new URLSearchParams({
    status,
  });

  return `${routes.invite.replace("[token]", token)}?${params.toString()}`;
};

const getLoginRedirect = (status: "error" | "sent"): string => {
  const params = new URLSearchParams({
    status,
  });

  return `${routes.login}?${params.toString()}`;
};

export const requestMagicLinkLoginAction = async (
  formData: FormData
): Promise<void> => {
  const emailValue = formData.get("email");
  const parsedEmail = emailSchema.safeParse(emailValue);

  if (!parsedEmail.success) {
    redirect(getLoginRedirect("error"));
  }

  try {
    await sendReturningUserMagicLink(parsedEmail.data);
  } catch {
    redirect(getLoginRedirect("error"));
  }

  redirect(getLoginRedirect("sent"));
};

export const startInviteMagicLinkAction = async (
  formData: FormData
): Promise<void> => {
  const tokenValue = formData.get("token");

  if (typeof tokenValue !== "string" || !tokenValue.trim()) {
    redirect(routes.login);
  }

  const token = tokenValue.trim();

  try {
    const resolvedInvite = await resolveInviteToken(token);

    if (!(resolvedInvite.invite && resolvedInvite.state === "pending")) {
      redirect(getInviteRedirect(token, "error"));
    }

    await sendInviteMagicLink(resolvedInvite.invite);
  } catch {
    redirect(getInviteRedirect(token, "error"));
  }

  redirect(getInviteRedirect(token, "sent"));
};

export const acceptInviteWithCurrentSessionAction = async (
  formData: FormData
): Promise<void> => {
  const tokenValue = formData.get("token");

  if (typeof tokenValue !== "string" || !tokenValue.trim()) {
    redirect(routes.login);
  }

  const token = tokenValue.trim();

  try {
    const [currentUser, resolvedInvite] = await Promise.all([
      getCurrentUser(),
      resolveInviteToken(token),
    ]);

    if (
      !(
        currentUser &&
        resolvedInvite.invite &&
        resolvedInvite.state === "pending"
      )
    ) {
      redirect(getInviteRedirect(token, "error"));
    }

    await finalizeInviteForCurrentUser(resolvedInvite.invite, currentUser);
  } catch {
    redirect(getInviteRedirect(token, "error"));
  }

  redirect(routes.appHome);
};

export const signOutFromInviteConflictAction = async (
  formData: FormData
): Promise<void> => {
  const tokenValue = formData.get("token");

  if (typeof tokenValue !== "string" || !tokenValue.trim()) {
    redirect(routes.login);
  }

  await signOutCurrentUser();
  redirect(getInviteRedirect(tokenValue.trim(), "signed-out"));
};

export const signOutFromSetupIncompleteAction = async (): Promise<void> => {
  await signOutCurrentUser();
  redirect(routes.login);
};
