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

  if not exists(
    select 1
    from public.profiles
    where profiles.user_id = target_actor_user_id
      and profiles.app_role = 'admin'
  ) then
    raise exception using
      errcode = '42501',
      message = 'Only admin users can activate dataset versions';
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

revoke all on function public.activate_dataset_version(uuid, uuid, uuid) from authenticated;
grant execute on function public.activate_dataset_version(uuid, uuid, uuid) to service_role;
