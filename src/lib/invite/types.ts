export type InviteRole = "user" | "admin";

type JsonPrimitive = string | number | boolean | null;
type JsonValue =
  | JsonPrimitive
  | { [key: string]: JsonValue }
  | JsonValue[];

export type InviteMetadata = JsonValue;

export type Invite = {
  id: string;
  email: string;
  invite_token_hash: string;
  app_role: InviteRole;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  metadata: InviteMetadata;
};

export type CreateInviteResult =
  | {
      status: "success";
      inviteUrl: string;
    }
  | {
      status: "existing_user";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

export type AcceptInviteResult =
  | {
      status: "success";
      email: string;
    }
  | {
      status: "error";
      message: string;
    };

export type ValidatedInvite = Pick<
  Invite,
  "id" | "email" | "app_role" | "accepted_at" | "revoked_at" | "expires_at"
>;

export type InviteStatus = "Pending" | "Accepted" | "Expired" | "Revoked";

export const deriveInviteStatus = (invite: Invite): InviteStatus => {
  if (invite.accepted_at) {
    return "Accepted";
  }

  if (invite.revoked_at) {
    return "Revoked";
  }

  if (new Date(invite.expires_at) <= new Date()) {
    return "Expired";
  }

  return "Pending";
};
