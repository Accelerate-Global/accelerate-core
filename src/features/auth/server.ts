import "server-only";

import { createHash } from "node:crypto";

import type { User } from "@supabase/supabase-js";

import { getAppUrl } from "@/lib/env";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type InviteResolutionState =
  | "accepted"
  | "expired"
  | "invalid"
  | "pending"
  | "revoked";

type InviteRole = "admin" | "user";

interface InviteRecord {
  accepted_at: string | null;
  created_at: string;
  email: string;
  expires_at: string;
  id: string;
  metadata: Record<string, unknown> | null;
  status: "accepted" | "expired" | "pending" | "revoked";
}

export class AuthSendError extends Error {
  code?: string;
  status?: number;

  constructor(
    message: string,
    options?: {
      code?: string;
      status?: number;
    }
  ) {
    super(message);
    this.name = "AuthSendError";
    this.code = options?.code;
    this.status = options?.status;
  }
}

const INVITE_APP_EXPIRY_HOURS = 48;

const inviteSelect =
  "id, email, status, expires_at, accepted_at, created_at, metadata";

const normalizeEmail = (value: string): string => {
  return value.trim().toLowerCase();
};

const getInviteRole = (invite: Pick<InviteRecord, "metadata">): InviteRole => {
  return invite.metadata?.intended_app_role === "admin" ? "admin" : "user";
};

const isInviteExpired = (
  invite: Pick<InviteRecord, "created_at" | "expires_at">
): boolean => {
  const appExpiryMs =
    new Date(invite.created_at).getTime() +
    INVITE_APP_EXPIRY_HOURS * 60 * 60 * 1000;
  const dbExpiryMs = new Date(invite.expires_at).getTime();
  const now = Date.now();

  return now > appExpiryMs || now > dbExpiryMs;
};

const hashInviteToken = (token: string): string => {
  return createHash("sha256").update(token).digest("hex");
};

const upsertProfile = async (
  user: Pick<User, "email" | "id" | "user_metadata">,
  inviteRole?: InviteRole
): Promise<void> => {
  const adminClient = createAdminClient();
  const { data: existingProfile, error: loadError } = await adminClient
    .from("profiles")
    .select("app_role, display_name, user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (loadError) {
    throw new Error(`Failed to load profile: ${loadError.message}`);
  }

  let role: InviteRole = "user";

  if (existingProfile?.app_role === "admin" || inviteRole === "admin") {
    role = "admin";
  }

  let derivedDisplayName = user.email?.split("@")[0] ?? null;

  if (typeof user.user_metadata?.name === "string") {
    derivedDisplayName = user.user_metadata.name;
  }

  if (typeof user.user_metadata?.full_name === "string") {
    derivedDisplayName = user.user_metadata.full_name;
  }

  const displayName = existingProfile?.display_name ?? derivedDisplayName;
  const { error: upsertError } = await adminClient.from("profiles").upsert(
    {
      app_role: role,
      display_name: displayName,
      user_id: user.id,
    },
    {
      onConflict: "user_id",
    }
  );

  if (upsertError) {
    throw new Error(`Failed to upsert profile: ${upsertError.message}`);
  }
};

const markInviteAccepted = async (
  invite: Pick<InviteRecord, "id" | "metadata">,
  user: Pick<User, "id">
): Promise<void> => {
  const adminClient = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await adminClient
    .from("invites")
    .update({
      accepted_at: now,
      metadata: {
        ...(invite.metadata ?? {}),
        finalized_at: now,
        finalized_by_user_id: user.id,
      },
      status: "accepted",
    })
    .eq("id", invite.id)
    .eq("status", "pending");

  if (error) {
    throw new Error(`Failed to finalize invite: ${error.message}`);
  }
};

const ensureAuthUserForInviteEmail = async (email: string): Promise<void> => {
  const adminClient = createAdminClient();
  const { error } = await adminClient.rpc("ensure_invited_auth_user", {
    target_email: normalizeEmail(email),
  });

  if (error) {
    throw new Error(`Failed to ensure invited auth user: ${error.message}`);
  }
};

export const buildAuthCallbackUrl = (): string => {
  return new URL(routes.authCallback, getAppUrl()).toString();
};

export const getCurrentUser = async (): Promise<User | null> => {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();

  return data.user;
};

export const exchangeCodeForSession = async (code: string): Promise<void> => {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    throw new Error(`Failed to exchange auth code: ${error.message}`);
  }
};

export const signOutCurrentUser = async (): Promise<void> => {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
};

export const resolveInviteToken = async (
  rawToken: string
): Promise<{ invite: InviteRecord | null; state: InviteResolutionState }> => {
  const token = rawToken.trim();

  if (!token) {
    return {
      invite: null,
      state: "invalid",
    };
  }

  const adminClient = createAdminClient();
  const tokenHash = hashInviteToken(token);
  const { data, error } = await adminClient
    .from("invites")
    .select(inviteSelect)
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve invite token: ${error.message}`);
  }

  if (!data) {
    return {
      invite: null,
      state: "invalid",
    };
  }

  const invite = data as InviteRecord;

  if (invite.status === "accepted" || invite.accepted_at) {
    return {
      invite,
      state: "accepted",
    };
  }

  if (invite.status === "revoked") {
    return {
      invite,
      state: "revoked",
    };
  }

  if (invite.status === "expired" || isInviteExpired(invite)) {
    return {
      invite,
      state: "expired",
    };
  }

  return {
    invite,
    state: "pending",
  };
};

export const sendReturningUserMagicLink = async (
  email: string,
  shouldCreateUser = false
): Promise<void> => {
  const authClient = await createServerSupabaseClient();
  const { error } = await authClient.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: {
      emailRedirectTo: buildAuthCallbackUrl(),
      shouldCreateUser,
    },
  });

  if (error) {
    throw new AuthSendError(
      `Failed to send login magic link: ${error.message}`,
      {
        code: error.code,
        status: error.status,
      }
    );
  }
};

export const sendInviteMagicLink = async (
  invite: Pick<InviteRecord, "email" | "id" | "metadata">
): Promise<void> => {
  await ensureAuthUserForInviteEmail(invite.email);
  await sendReturningUserMagicLink(invite.email, false);

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("invites")
    .update({
      metadata: {
        ...(invite.metadata ?? {}),
        last_magic_link_sent_at: new Date().toISOString(),
      },
    })
    .eq("id", invite.id);

  if (error) {
    throw new Error(`Failed to update invite send metadata: ${error.message}`);
  }
};

export const finalizeInviteForCurrentUser = async (
  invite: InviteRecord,
  user: Pick<User, "email" | "id" | "user_metadata">
): Promise<void> => {
  if (normalizeEmail(user.email ?? "") !== normalizeEmail(invite.email)) {
    throw new Error("Signed-in email does not match this invite.");
  }

  await upsertProfile(user, getInviteRole(invite));
  await markInviteAccepted(invite, user);
};

export const finalizeSessionOnboarding = async (
  user: Pick<User, "email" | "id" | "user_metadata">
): Promise<void> => {
  const email = normalizeEmail(user.email ?? "");

  if (!email) {
    throw new Error("Authenticated session is missing email.");
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("invites")
    .select(inviteSelect)
    .eq("email", email)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to load pending invites for callback: ${error.message}`
    );
  }

  const pendingInvites = ((data ?? []) as InviteRecord[]).filter((invite) => {
    return !isInviteExpired(invite);
  });

  if (pendingInvites.length > 1) {
    throw new Error(
      "Multiple pending invites found for this email. Ask an admin to resolve duplicates."
    );
  }

  if (pendingInvites.length === 1) {
    await finalizeInviteForCurrentUser(pendingInvites[0], user);
    return;
  }

  await upsertProfile(user);
};

export const isSameEmailUser = (
  user: Pick<User, "email"> | null,
  invite: Pick<InviteRecord, "email">
): boolean => {
  if (!user?.email) {
    return false;
  }

  return normalizeEmail(user.email) === normalizeEmail(invite.email);
};
