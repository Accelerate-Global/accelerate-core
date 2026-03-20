do $$
declare
  development_admin_email constant text := 'admin@example.com';
  development_admin_full_name constant text := 'Development Admin';
  development_admin_user_id uuid;
begin
  select id
  into development_admin_user_id
  from auth.users
  where email = development_admin_email
  limit 1;

  if development_admin_user_id is null then
    development_admin_user_id := '11111111-1111-1111-1111-111111111111';

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
      development_admin_user_id,
      'authenticated',
      'authenticated',
      development_admin_email,
      crypt('dev-password', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', development_admin_full_name),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  end if;

  insert into auth.identities (
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    development_admin_user_id,
    jsonb_build_object(
      'sub',
      development_admin_user_id::text,
      'email',
      development_admin_email,
      'email_verified',
      true
    ),
    'email',
    development_admin_user_id::text,
    null,
    now(),
    now()
  )
  on conflict (provider_id, provider) do update
  set
    user_id = excluded.user_id,
    identity_data = auth.identities.identity_data || excluded.identity_data,
    updated_at = now();

  insert into public.profiles (id, email, full_name, app_role)
  values (
    development_admin_user_id,
    development_admin_email,
    development_admin_full_name,
    'admin'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    app_role = excluded.app_role,
    updated_at = now();
end;
$$;
