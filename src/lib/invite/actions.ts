"use server";

import { z } from "zod";

import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { clientEnv } from "@/lib/env";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AcceptInviteResult,
  CreateInviteResult,
  Invite,
  ValidatedInvite,
} from "@/lib/invite/types";
import { hashToken } from "@/lib/invite/utils";
import { createClient } from "@/lib/supabase/server";

const INVALID_EMAIL_MESSAGE = "Enter a valid email address.";
const UNEXPECTED_ERROR_MESSAGE = "Something went wrong. Please try again.";
const EXISTING_USER_MESSAGE =
  "This user already has access. They can sign in normally.";
const PENDING_INVITE_MESSAGE =
  "A pending invite already exists for this email.";

type InviteLifecycleRecord = Pick<
  Invite,
  "id" | "accepted_at" | "revoked_at" | "expires_at" | "invite_token_hash"
>;

const createInviteSchema = z.object({
  email: z.string().trim().email(INVALID_EMAIL_MESSAGE),
  role: z.enum(["user", "admin"]),
});

const USER_ALREADY_REGISTERED_ERROR_FRAGMENT = "user already registered";
const INVALID_INVITE_MESSAGE = "This invite link is not valid.";
const USED_INVITE_MESSAGE = "This invite has already been used. Sign in instead.";
const REVOKED_INVITE_MESSAGE = "This invite has been revoked.";
const EXPIRED_INVITE_MESSAGE =
  "This invite has expired. Ask your administrator for a new one.";

const isInviteAccepted = (invite: InviteLifecycleRecord): boolean => {
  return invite.accepted_at !== null;
};

const isInvitePending = (invite: InviteLifecycleRecord, now: Date): boolean => {
  return (
    !isInviteAccepted(invite) &&
    invite.revoked_at === null &&
    new Date(invite.expires_at) > now
  );
};

const isInviteRecyclable = (
  invite: InviteLifecycleRecord,
  now: Date
): boolean => {
  return (
    !isInviteAccepted(invite) &&
    (invite.revoked_at !== null || new Date(invite.expires_at) <= now)
  );
};

const isUserAlreadyRegisteredError = (message: string): boolean => {
  return message.toLowerCase().includes(USER_ALREADY_REGISTERED_ERROR_FRAGMENT);
};

export const acceptInvite = async (
  token: string
): Promise<AcceptInviteResult> => {
  try {
    const inviteTokenHash = await hashToken(token);
    const adminClient = createAdminClient();
    const { data: invite, error: inviteError } = await adminClient
      .from("invites")
      .select("id, email, app_role, accepted_at, revoked_at, expires_at")
      .eq("invite_token_hash", inviteTokenHash)
      .maybeSingle();

    if (inviteError) {
      throw inviteError;
    }

    const validatedInvite = invite as ValidatedInvite | null;

    if (!validatedInvite) {
      return {
        status: "error",
        message: INVALID_INVITE_MESSAGE,
      };
    }

    if (validatedInvite.accepted_at !== null) {
      return {
        status: "error",
        message: USED_INVITE_MESSAGE,
      };
    }

    if (validatedInvite.revoked_at !== null) {
      return {
        status: "error",
        message: REVOKED_INVITE_MESSAGE,
      };
    }

    if (new Date(validatedInvite.expires_at) <= new Date()) {
      return {
        status: "error",
        message: EXPIRED_INVITE_MESSAGE,
      };
    }

    const { error: createUserError } = await adminClient.auth.admin.createUser({
      email: validatedInvite.email,
      email_confirm: true,
    });

    if (
      createUserError &&
      !isUserAlreadyRegisteredError(createUserError.message)
    ) {
      throw createUserError;
    }

    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: validatedInvite.email,
      options: {
        emailRedirectTo: `${clientEnv.NEXT_PUBLIC_APP_URL}${routes.authCallback}`,
        shouldCreateUser: false,
      },
    });

    if (signInError) {
      return {
        status: "error",
        message: signInError.message || UNEXPECTED_ERROR_MESSAGE,
      };
    }

    return {
      status: "success",
      email: validatedInvite.email,
    };
  } catch {
    return {
      status: "error",
      message: UNEXPECTED_ERROR_MESSAGE,
    };
  }
};

export const createInvite = async (
  formData: FormData
): Promise<CreateInviteResult> => {
  try {
    const adminProfile = await requireAdmin();

    if (!adminProfile) {
      return {
        status: "error",
        message: "Unauthorized.",
      };
    }

    const parsedInput = createInviteSchema.safeParse({
      email: formData.get("email"),
      role: formData.get("role"),
    });

    if (!parsedInput.success) {
      return {
        status: "error",
        message:
          parsedInput.error.issues[0]?.message ?? UNEXPECTED_ERROR_MESSAGE,
      };
    }

    const normalizedEmailAddress = parsedInput.data.email.toLowerCase();
    const now = new Date();
    const nowIso = now.toISOString();
    const supabase = await createClient();
    const { data: existingProfile, error: existingProfileError } =
      await supabase
        .from("profiles")
        .select("id")
        .eq("email", normalizedEmailAddress)
        .maybeSingle();

    if (existingProfileError) {
      throw existingProfileError;
    }

    const { data: inviteHistory, error: inviteHistoryError } = await supabase
      .from("invites")
      .select("id, accepted_at, revoked_at, expires_at, invite_token_hash")
      .eq("email", normalizedEmailAddress)
      .order("created_at", { ascending: false });

    if (inviteHistoryError) {
      throw inviteHistoryError;
    }

    const inviteRecords: InviteLifecycleRecord[] = inviteHistory ?? [];
    const hasInviteHistory = inviteRecords.length > 0;
    const hasAcceptedInvite = inviteRecords.some(isInviteAccepted);
    const hasPendingInvite = inviteRecords.some((invite) => {
      return isInvitePending(invite, now);
    });
    const recyclableInvite = inviteRecords.find((invite) => {
      return isInviteRecyclable(invite, now);
    });
    const hasCompletedAccess =
      existingProfile !== null && (hasAcceptedInvite || !hasInviteHistory);

    if (hasCompletedAccess) {
      return {
        status: "existing_user",
        message: EXISTING_USER_MESSAGE,
      };
    }

    if (hasPendingInvite) {
      return {
        status: "error",
        message: PENDING_INVITE_MESSAGE,
      };
    }

    const rawToken = crypto.randomUUID();
    const inviteTokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const currentUser = await getCurrentUser();
    const invitedBy = currentUser?.id ?? adminProfile.id;

    if (recyclableInvite) {
      const { data: updatedInvite, error: updateInviteError } = await supabase
        .from("invites")
        .update({
          invite_token_hash: inviteTokenHash,
          app_role: parsedInput.data.role,
          invited_by: invitedBy,
          expires_at: expiresAt,
          created_at: nowIso,
          revoked_at: null,
        })
        .eq("id", recyclableInvite.id)
        .eq("invite_token_hash", recyclableInvite.invite_token_hash)
        .select("id")
        .maybeSingle();

      if (updateInviteError) {
        throw updateInviteError;
      }

      if (updatedInvite === null) {
        return {
          status: "error",
          message: PENDING_INVITE_MESSAGE,
        };
      }
    } else {
      const { error: insertInviteError } = await supabase
        .from("invites")
        .insert({
          email: normalizedEmailAddress,
          invite_token_hash: inviteTokenHash,
          app_role: parsedInput.data.role,
          invited_by: invitedBy,
          expires_at: expiresAt,
        });

      if (insertInviteError) {
        if (insertInviteError.code === "23505") {
          return {
            status: "error",
            message: PENDING_INVITE_MESSAGE,
          };
        }

        throw insertInviteError;
      }
    }

    return {
      status: "success",
      inviteUrl: new URL(
        `/invite/${rawToken}`,
        clientEnv.NEXT_PUBLIC_APP_URL
      ).toString(),
    };
  } catch {
    return {
      status: "error",
      message: UNEXPECTED_ERROR_MESSAGE,
    };
  }
};
