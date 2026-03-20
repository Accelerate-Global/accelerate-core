import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERS_PAGE_SIZE = 200;
const USAGE_MESSAGE =
  "Usage: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/bootstrap-admin.mjs <email>";

const getRequiredEnv = (variableName, value) => {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new Error(`${variableName} is required.`);
  }

  return normalizedValue;
};

const normalizeEmailAddress = (value) => {
  const normalizedEmailAddress = value.trim().toLowerCase();

  if (!EMAIL_PATTERN.test(normalizedEmailAddress)) {
    throw new Error("Provide a valid email address.");
  }

  return normalizedEmailAddress;
};

const createAdminSupabaseClient = () => {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  const serviceRoleKey = getRequiredEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    SUPABASE_SERVICE_ROLE_KEY
  );

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const findUserByEmail = async (supabase, email) => {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: USERS_PAGE_SIZE,
    });

    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const existingUser = data.users.find((user) => {
      return user.email?.toLowerCase() === email;
    });

    if (existingUser) {
      return existingUser;
    }

    if (data.users.length < USERS_PAGE_SIZE) {
      return null;
    }

    page += 1;
  }
};

const ensureAuthUser = async (supabase, email) => {
  const existingUser = await findUserByEmail(supabase, email);

  if (existingUser) {
    return {
      status: "existing",
      user: existingUser,
    };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Failed to create auth user: ${error.message}`);
  }

  if (!data.user) {
    throw new Error("Supabase did not return the created auth user.");
  }

  return {
    status: "created",
    user: data.user,
  };
};

const promoteProfileToAdmin = async (supabase, userId, email) => {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        app_role: "admin",
      },
      {
        onConflict: "id",
      }
    )
    .select("id, email, app_role")
    .single();

  if (error) {
    throw new Error(`Failed to promote profile to admin: ${error.message}`);
  }

  return data;
};

const main = async () => {
  const targetEmail = process.argv[2];

  if (!targetEmail) {
    throw new Error(USAGE_MESSAGE);
  }

  const normalizedEmailAddress = normalizeEmailAddress(targetEmail);
  const supabase = createAdminSupabaseClient();
  const authUserResult = await ensureAuthUser(supabase, normalizedEmailAddress);
  const adminProfile = await promoteProfileToAdmin(
    supabase,
    authUserResult.user.id,
    normalizedEmailAddress
  );

  const statusMessage =
    authUserResult.status === "created"
      ? "Created the auth user and promoted the profile to admin."
      : "Auth user already existed; promoted the profile to admin.";

  process.stdout.write(
    `${statusMessage}\nUser ID: ${adminProfile.id}\nEmail: ${adminProfile.email}\nRole: ${adminProfile.app_role}\n`
  );
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error.";

  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
