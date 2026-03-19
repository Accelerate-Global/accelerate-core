create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  app_role text not null default 'user' check (app_role in ('user', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  invite_token_hash text not null unique,
  app_role text not null default 'user' check (app_role in ('user', 'admin')),
  invited_by uuid references auth.users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb,
  constraint invites_email_lowercase_check check (email = lower(email))
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create unique index invites_email_active_unique_idx
on public.invites (lower(email))
where accepted_at is null and revoked_at is null;
