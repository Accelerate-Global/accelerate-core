"use server";

import { createHash, randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  type AdminActionState,
  createInitialAdminActionState,
  defaultInviteDurationDays,
  getEffectiveInviteStatus,
} from "@/features/admin/shared";
import { requireCurrentUserAdmin } from "@/lib/auth/server";
import { getAppUrl } from "@/lib/env";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";

const emailSchema = z.string().trim().email();

const toErrorMessage = (message: string, cause?: string): string => {
  if (!cause) {
    return message;
  }

  return `${message}: ${cause}`;
};

const buildInviteToken = (): string => {
  return randomBytes(24).toString("hex");
};

const hashInviteToken = (token: string): string => {
  return createHash("sha256").update(token).digest("hex");
};

const buildInviteLink = (token: string): string => {
  const invitePath = routes.invite.replace("[token]", token);

  return new URL(invitePath, getAppUrl()).toString();
};

const buildInviteExpiry = (): string => {
  return new Date(
    Date.now() + defaultInviteDurationDays * 24 * 60 * 60 * 1000
  ).toISOString();
};

const createInviteRecord = async (
  email: string,
  createdBy: string,
  metadata: Record<string, string | null>
): Promise<{ inviteId: string; inviteLink: string }> => {
  const supabase = createAdminClient();
  const token = buildInviteToken();
  const tokenHash = hashInviteToken(token);
  const { data, error } = await supabase
    .from("invites")
    .insert({
      created_by: createdBy,
      email,
      expires_at: buildInviteExpiry(),
      metadata,
      token_hash: tokenHash,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(
      toErrorMessage("Failed to create the invite record", error.message)
    );
  }

  return {
    inviteId: data.id,
    inviteLink: buildInviteLink(token),
  };
};

const findActionableInviteByEmail = async (
  email: string
): Promise<Tables<"invites"> | null> => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("invites")
    .select(
      "id, email, status, expires_at, accepted_at, created_by, created_at, updated_at, token_hash, metadata"
    )
    .eq("email", email)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      toErrorMessage("Failed to inspect existing invites", error.message)
    );
  }

  return (
    (data as Tables<"invites">[]).find((invite) => {
      return (
        getEffectiveInviteStatus(invite.status, invite.expires_at) === "pending"
      );
    }) ?? null
  );
};

export const createInviteAction = async (
  _previousState: AdminActionState<{ inviteId: string; inviteLink: string }>,
  formData: FormData
): Promise<AdminActionState<{ inviteId: string; inviteLink: string }>> => {
  const initialState = createInitialAdminActionState<{
    inviteId: string;
    inviteLink: string;
  }>();
  const actingUser = await requireCurrentUserAdmin();
  const emailValue = formData.get("email");

  if (typeof emailValue !== "string") {
    return {
      ...initialState,
      message: "An invite email address is required.",
      status: "error",
    };
  }

  const parsedEmail = emailSchema.safeParse(emailValue.toLowerCase());

  if (!parsedEmail.success) {
    return {
      ...initialState,
      message: "Enter a valid email address.",
      status: "error",
    };
  }

  const existingInvite = await findActionableInviteByEmail(parsedEmail.data);

  if (existingInvite) {
    return {
      ...initialState,
      message:
        "A pending invite already exists for this email. Revoke or regenerate that invite instead.",
      status: "error",
    };
  }

  const invite = await createInviteRecord(parsedEmail.data, actingUser.id, {
    delivery: "manual-link",
  });

  revalidatePath(routes.adminInvites);
  revalidatePath(routes.adminHome);

  return {
    data: invite,
    message:
      "Invite created. Copy the raw link now because it cannot be recovered later.",
    status: "success",
  };
};

export const regenerateInviteAction = async (
  _previousState: AdminActionState<{ inviteId: string; inviteLink: string }>,
  formData: FormData
): Promise<AdminActionState<{ inviteId: string; inviteLink: string }>> => {
  const initialState = createInitialAdminActionState<{
    inviteId: string;
    inviteLink: string;
  }>();
  const actingUser = await requireCurrentUserAdmin();
  const inviteId = formData.get("inviteId");

  if (typeof inviteId !== "string" || !inviteId) {
    return {
      ...initialState,
      message: "An invite id is required.",
      status: "error",
    };
  }

  const supabase = createAdminClient();
  const { data: invite, error: inviteError } = await supabase
    .from("invites")
    .select("id, email, status, expires_at")
    .eq("id", inviteId)
    .maybeSingle();

  if (inviteError) {
    return {
      ...initialState,
      message: toErrorMessage("Failed to load the invite", inviteError.message),
      status: "error",
    };
  }

  if (!invite) {
    return {
      ...initialState,
      message: "The selected invite could not be found.",
      status: "error",
    };
  }

  if (invite.status === "accepted") {
    return {
      ...initialState,
      message: "Accepted invites cannot be regenerated.",
      status: "error",
    };
  }

  const { error: revokeError } = await supabase
    .from("invites")
    .update({
      status: "revoked",
    })
    .eq("id", invite.id);

  if (revokeError) {
    return {
      ...initialState,
      message: toErrorMessage(
        "Failed to revoke the previous invite",
        revokeError.message
      ),
      status: "error",
    };
  }

  const nextInvite = await createInviteRecord(invite.email, actingUser.id, {
    delivery: "manual-link",
    regenerated_from_invite_id: invite.id,
  });

  revalidatePath(routes.adminInvites);
  revalidatePath(routes.adminHome);

  return {
    data: nextInvite,
    message: "A replacement invite was created. Copy the new raw link now.",
    status: "success",
  };
};

export const revokeInviteAction = async (formData: FormData): Promise<void> => {
  await requireCurrentUserAdmin();
  const inviteId = formData.get("inviteId");

  if (typeof inviteId !== "string" || !inviteId) {
    throw new Error("An invite id is required.");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("invites")
    .update({
      status: "revoked",
    })
    .eq("id", inviteId);

  if (error) {
    throw new Error(
      toErrorMessage("Failed to revoke the invite", error.message)
    );
  }

  revalidatePath(routes.adminInvites);
  revalidatePath(routes.adminHome);
};
