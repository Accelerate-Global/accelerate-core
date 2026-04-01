alter table public.dataset_versions
add column notes text null,
add column change_summary text null,
add column published_at timestamptz null,
add column published_by uuid null references auth.users (id) on delete set null;

create index dataset_versions_dataset_id_published_at_idx
  on public.dataset_versions (dataset_id, published_at desc);

create table public.dataset_version_events (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  dataset_version_id uuid not null references public.dataset_versions (id) on delete cascade,
  previous_dataset_version_id uuid null references public.dataset_versions (id) on delete set null,
  event_type text not null,
  actor_user_id uuid null references auth.users (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint dataset_version_events_event_type_check check (
    event_type in ('activated', 'published')
  )
);

create index dataset_version_events_dataset_id_created_at_idx
  on public.dataset_version_events (dataset_id, created_at desc);

create index dataset_version_events_dataset_version_id_created_at_idx
  on public.dataset_version_events (dataset_version_id, created_at desc);

create or replace function public.activate_dataset_version(
  target_dataset_id uuid,
  target_dataset_version_id uuid,
  target_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_active_version_id uuid;
  current_version_dataset_id uuid;
  target_published_at timestamptz;
  event_timestamp timestamptz := timezone('utc', now());
begin
  if target_actor_user_id is null then
    raise exception using
      errcode = '22023',
      message = 'target_actor_user_id is required';
  end if;

  select active_version_id
  into current_active_version_id
  from public.datasets
  where id = target_dataset_id
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'The target dataset does not exist';
  end if;

  select dataset_id, published_at
  into current_version_dataset_id, target_published_at
  from public.dataset_versions
  where id = target_dataset_version_id
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'The target dataset version does not exist';
  end if;

  if current_version_dataset_id <> target_dataset_id then
    raise exception using
      errcode = '22023',
      message = 'The selected version does not belong to the selected dataset';
  end if;

  if current_active_version_id = target_dataset_version_id then
    return jsonb_build_object(
      'datasetId',
      target_dataset_id,
      'datasetVersionId',
      target_dataset_version_id,
      'status',
      'already_active'
    );
  end if;

  if target_published_at is null then
    update public.dataset_versions
    set published_at = event_timestamp,
        published_by = target_actor_user_id
    where id = target_dataset_version_id;

    insert into public.dataset_version_events (
      dataset_id,
      dataset_version_id,
      previous_dataset_version_id,
      event_type,
      actor_user_id,
      metadata,
      created_at
    )
    values (
      target_dataset_id,
      target_dataset_version_id,
      current_active_version_id,
      'published',
      target_actor_user_id,
      jsonb_build_object('publishedFirstTime', true),
      event_timestamp
    );
  end if;

  update public.datasets
  set active_version_id = target_dataset_version_id
  where id = target_dataset_id;

  insert into public.dataset_version_events (
    dataset_id,
    dataset_version_id,
    previous_dataset_version_id,
    event_type,
    actor_user_id,
    metadata,
    created_at
  )
  values (
    target_dataset_id,
    target_dataset_version_id,
    current_active_version_id,
    'activated',
    target_actor_user_id,
    jsonb_build_object(
      'fromVersionId',
      current_active_version_id,
      'toVersionId',
      target_dataset_version_id
    ),
    event_timestamp
  );

  return jsonb_build_object(
    'datasetId',
    target_dataset_id,
    'datasetVersionId',
    target_dataset_version_id,
    'previousDatasetVersionId',
    current_active_version_id,
    'status',
    'activated'
  );
end;
$$;

revoke all on function public.activate_dataset_version(uuid, uuid, uuid) from public;
grant execute on function public.activate_dataset_version(uuid, uuid, uuid) to authenticated;
