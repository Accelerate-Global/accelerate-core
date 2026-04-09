create type public.operation_run_status as enum (
  'queued',
  'running',
  'succeeded',
  'failed'
);

create table public.registered_sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text null,
  connector_kind text not null,
  is_enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  last_run_at timestamptz null,
  last_run_status public.operation_run_status null,
  created_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint registered_sources_config_object_check check (
    jsonb_typeof(config) = 'object'
  )
);

create index registered_sources_connector_kind_idx
  on public.registered_sources (connector_kind);

create table public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.registered_sources (id) on delete cascade,
  run_kind text not null,
  status public.operation_run_status not null default 'queued',
  requested_by uuid null references auth.users (id) on delete set null,
  started_at timestamptz null,
  completed_at timestamptz null,
  error_message text null,
  source_config_snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ingestion_runs_run_kind_required check (char_length(run_kind) > 0),
  constraint ingestion_runs_completed_after_started check (
    completed_at is null
    or started_at is null
    or completed_at >= started_at
  ),
  constraint ingestion_runs_snapshot_object_check check (
    jsonb_typeof(source_config_snapshot) = 'object'
  ),
  constraint ingestion_runs_metadata_object_check check (
    jsonb_typeof(metadata) = 'object'
  )
);

create index ingestion_runs_source_id_created_at_idx
  on public.ingestion_runs (source_id, created_at desc);

create index ingestion_runs_status_created_at_idx
  on public.ingestion_runs (status, created_at desc);

create table public.pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.registered_sources (id) on delete cascade,
  ingestion_run_id uuid null references public.ingestion_runs (id) on delete set null,
  pipeline_key text not null,
  execution_mode text not null,
  status public.operation_run_status not null default 'queued',
  requested_by uuid null references auth.users (id) on delete set null,
  started_at timestamptz null,
  completed_at timestamptz null,
  error_message text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pipeline_runs_pipeline_key_required check (
    char_length(pipeline_key) > 0
  ),
  constraint pipeline_runs_execution_mode_phase_b_check check (
    execution_mode = 'deferred_scaffold'
  ),
  constraint pipeline_runs_completed_after_started check (
    completed_at is null
    or started_at is null
    or completed_at >= started_at
  ),
  constraint pipeline_runs_metadata_object_check check (
    jsonb_typeof(metadata) = 'object'
  )
);

create index pipeline_runs_source_id_created_at_idx
  on public.pipeline_runs (source_id, created_at desc);

create index pipeline_runs_ingestion_run_id_idx
  on public.pipeline_runs (ingestion_run_id);

create index pipeline_runs_status_created_at_idx
  on public.pipeline_runs (status, created_at desc);

create table public.publish_runs (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  dataset_version_id uuid not null references public.dataset_versions (id) on delete cascade,
  action_type text not null,
  status public.operation_run_status not null default 'queued',
  requested_by uuid null references auth.users (id) on delete set null,
  started_at timestamptz null,
  completed_at timestamptz null,
  error_message text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint publish_runs_action_type_required check (
    char_length(action_type) > 0
  ),
  constraint publish_runs_completed_after_started check (
    completed_at is null
    or started_at is null
    or completed_at >= started_at
  ),
  constraint publish_runs_metadata_object_check check (
    jsonb_typeof(metadata) = 'object'
  )
);

create index publish_runs_dataset_id_created_at_idx
  on public.publish_runs (dataset_id, created_at desc);

create index publish_runs_dataset_version_id_created_at_idx
  on public.publish_runs (dataset_version_id, created_at desc);

create index publish_runs_status_created_at_idx
  on public.publish_runs (status, created_at desc);

create trigger set_registered_sources_updated_at
before update on public.registered_sources
for each row
execute function public.set_updated_at();

create trigger set_ingestion_runs_updated_at
before update on public.ingestion_runs
for each row
execute function public.set_updated_at();

create trigger set_pipeline_runs_updated_at
before update on public.pipeline_runs
for each row
execute function public.set_updated_at();

create trigger set_publish_runs_updated_at
before update on public.publish_runs
for each row
execute function public.set_updated_at();

alter table public.registered_sources enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.pipeline_runs enable row level security;
alter table public.publish_runs enable row level security;

revoke all on table public.registered_sources from anon;
revoke all on table public.ingestion_runs from anon;
revoke all on table public.pipeline_runs from anon;
revoke all on table public.publish_runs from anon;

revoke all on table public.registered_sources from authenticated;
revoke all on table public.ingestion_runs from authenticated;
revoke all on table public.pipeline_runs from authenticated;
revoke all on table public.publish_runs from authenticated;

grant select, insert, update, delete
on table public.registered_sources
to service_role;

grant select, insert, update, delete
on table public.ingestion_runs
to service_role;

grant select, insert, update, delete
on table public.pipeline_runs
to service_role;

grant select, insert, update, delete
on table public.publish_runs
to service_role;
