create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('user', 'admin');

create type public.workspace_member_role as enum (
  'owner',
  'admin',
  'member'
);

create type public.dataset_visibility as enum (
  'global',
  'private',
  'workspace',
  'shared'
);

create type public.invite_status as enum (
  'pending',
  'accepted',
  'revoked',
  'expired'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  app_role public.app_role not null default 'user',
  display_name text null,
  avatar_url text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_member_role not null default 'member',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (workspace_id, user_id)
);

create table public.datasets (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text null,
  visibility public.dataset_visibility not null default 'private',
  is_default_global boolean not null default false,
  owner_workspace_id uuid null references public.workspaces (id) on delete cascade,
  active_version_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint datasets_default_global_requires_global_visibility check (
    not is_default_global
    or visibility = 'global'
  ),
  constraint datasets_workspace_owner_required check (
    visibility not in ('workspace', 'shared')
    or owner_workspace_id is not null
  )
);

create unique index datasets_single_default_global_idx
  on public.datasets (is_default_global)
  where is_default_global;

create table public.dataset_versions (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  version_number integer not null,
  column_definitions jsonb not null default '{"columns":[]}'::jsonb,
  row_count bigint not null default 0,
  source_ref text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint dataset_versions_row_count_non_negative check (row_count >= 0),
  constraint dataset_versions_version_number_positive check (version_number > 0),
  constraint dataset_versions_dataset_id_version_number_key unique (
    dataset_id,
    version_number
  ),
  constraint dataset_versions_dataset_id_id_key unique (dataset_id, id)
);

alter table public.datasets
add constraint datasets_active_version_matches_dataset_fkey
foreign key (id, active_version_id)
references public.dataset_versions (dataset_id, id)
deferrable initially immediate;

create table public.dataset_rows (
  id uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null references public.dataset_versions (id) on delete cascade,
  pipeline_row_id text not null,
  row_index bigint null,
  attributes jsonb not null default '{}'::jsonb,
  lineage jsonb null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint dataset_rows_dataset_version_id_pipeline_row_id_key unique (
    dataset_version_id,
    pipeline_row_id
  )
);

create table public.dataset_access (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  user_id uuid null references auth.users (id) on delete cascade,
  workspace_id uuid null references public.workspaces (id) on delete cascade,
  granted_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint dataset_access_exactly_one_subject check (
    num_nonnulls(user_id, workspace_id) = 1
  )
);

create unique index dataset_access_dataset_id_user_id_key
  on public.dataset_access (dataset_id, user_id)
  where user_id is not null;

create unique index dataset_access_dataset_id_workspace_id_key
  on public.dataset_access (dataset_id, workspace_id)
  where workspace_id is not null;

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  status public.invite_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz null,
  created_by uuid null references auth.users (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index dataset_versions_dataset_id_idx
  on public.dataset_versions (dataset_id);

create index dataset_rows_dataset_version_id_idx
  on public.dataset_rows (dataset_version_id);

create index dataset_rows_dataset_version_id_pipeline_row_id_idx
  on public.dataset_rows (dataset_version_id, pipeline_row_id);

create index dataset_access_dataset_id_idx
  on public.dataset_access (dataset_id);

create index workspace_members_user_id_idx
  on public.workspace_members (user_id);

create index workspace_members_workspace_id_idx
  on public.workspace_members (workspace_id);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_workspaces_updated_at
before update on public.workspaces
for each row
execute function public.set_updated_at();

create trigger set_datasets_updated_at
before update on public.datasets
for each row
execute function public.set_updated_at();

create trigger set_dataset_rows_updated_at
before update on public.dataset_rows
for each row
execute function public.set_updated_at();

create trigger set_invites_updated_at
before update on public.invites
for each row
execute function public.set_updated_at();
