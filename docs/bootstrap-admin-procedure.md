# First Admin Bootstrap Procedure (Invite-Only Auth Model)

This repository uses an invite-first auth model. In a fresh environment, the
first admin must still be established out-of-band before normal in-app invite
issuance can operate.

Current local/product posture keeps signup disabled in Supabase auth config:

- `[auth].enable_signup = false`
- `[auth.email].enable_signup = false`

## Current Bootstrap Model

- Public auth entry points are in-app (`/login`, `/invite/[token]`, `/auth/callback`).
- Profiles are auto-created by DB trigger (`handle_new_user` on `auth.users`).
- Admin authority is controlled by `public.profiles.app_role = 'admin'`.
- First-admin bootstrap still cannot rely on in-app issuance because there is no
  existing admin yet.

## Local Bootstrap (Proven)

Warning: this procedure writes directly to local auth/profile tables.

1. Start local Supabase and reset local data:

```sh
supabase status
supabase db reset
```

2. Create the first auth principal directly in local Postgres:

```sql
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '66666666-6666-4666-8666-666666666666',
  'authenticated',
  'authenticated',
  'bootstrap-admin@accelerate.test',
  crypt('password123', gen_salt('bf')),
  timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Bootstrap Admin"}'::jsonb,
  timezone('utc', now()),
  timezone('utc', now()),
  '',
  '',
  '',
  ''
);
```

3. Confirm profile trigger created the profile row and then promote:

```sql
select user_id, app_role, display_name
from public.profiles
where user_id = '66666666-6666-4666-8666-666666666666';

update public.profiles
set app_role = 'admin'
where user_id = '66666666-6666-4666-8666-666666666666';

select user_id, app_role, display_name
from public.profiles
where user_id = '66666666-6666-4666-8666-666666666666';
```

Expected: first query shows `app_role = user`, second query shows
`app_role = admin`.

## Production Bootstrap (Required Procedure)

Use a privileged operator path outside app routes:

1. Create the bootstrap user in Supabase Auth (Dashboard or equivalent admin
   API/service-role workflow).
2. Confirm the `public.profiles` row exists for that user ID (trigger-backed).
3. Promote `public.profiles.app_role` to `admin` for that user.
4. Verify admin access by checking admin-gated routes and admin-only actions.
5. Immediately issue normal invites from admin surfaces for subsequent users.

## Assumptions and Limitations

- This procedure is deadlock-free for first-admin creation because it does not
  depend on prior in-app auth onboarding.
- It requires privileged infrastructure access (DB SQL/editor or Auth admin API).
- This procedure is for operator bootstrap only; end-user onboarding continues
  through invite/login/callback routes.
