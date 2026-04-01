create or replace function public.ensure_invited_auth_user(target_email text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_email text;
  existing_user_id uuid;
  created_user_id uuid;
begin
  normalized_email := lower(trim(target_email));

  if normalized_email is null or normalized_email = '' then
    raise exception 'target_email is required';
  end if;

  select users.id
  into existing_user_id
  from auth.users as users
  where lower(users.email) = normalized_email
  limit 1;

  if existing_user_id is not null then
    return existing_user_id;
  end if;

  created_user_id := gen_random_uuid();

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
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
    created_user_id,
    'authenticated',
    'authenticated',
    normalized_email,
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'name',
      split_part(normalized_email, '@', 1)
    ),
    timezone('utc', now()),
    timezone('utc', now()),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    normalized_email,
    created_user_id,
    jsonb_build_object(
      'sub',
      created_user_id::text,
      'email',
      normalized_email
    ),
    'email',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  );

  return created_user_id;
end;
$$;

revoke all on function public.ensure_invited_auth_user(text) from public;
grant execute on function public.ensure_invited_auth_user(text) to service_role;
