-- Reconcile hosted Supabase projects that were manually repaired for auth
-- before the repo-tracked Phase 3+ dataset backend migrations were applied.
--
-- This migration is additive and idempotent:
-- - it creates missing dataset/workspace tables and indexes
-- - it restores the dataset RPC/function contract used by the product routes
-- - it restores the relevant RLS policies
-- - it preserves the hosted legacy zero-argument is_admin() overload because
--   existing auth policies still depend on it; app code avoids RPC ambiguity
--   by using current_app_role() instead
-- - it notifies PostgREST to reload its schema cache

create extension if not exists pgcrypto with schema extensions;

do $$
begin
  create type public.app_role as enum ('user', 'admin');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.workspace_member_role as enum ('owner', 'admin', 'member');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.dataset_visibility as enum (
    'global',
    'private',
    'workspace',
    'shared'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.invite_status as enum (
    'pending',
    'accepted',
    'revoked',
    'expired'
  );
exception
  when duplicate_object then null;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_member_role not null default 'member',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (workspace_id, user_id)
);

create table if not exists public.datasets (
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
  updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'datasets_default_global_requires_global_visibility'
  ) then
    alter table public.datasets
    add constraint datasets_default_global_requires_global_visibility check (
      not is_default_global
      or visibility = 'global'
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'datasets_workspace_owner_required'
  ) then
    alter table public.datasets
    add constraint datasets_workspace_owner_required check (
      visibility not in ('workspace', 'shared')
      or owner_workspace_id is not null
    );
  end if;
end;
$$;

create table if not exists public.dataset_versions (
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

alter table public.dataset_versions
add column if not exists notes text null,
add column if not exists change_summary text null,
add column if not exists published_at timestamptz null,
add column if not exists published_by uuid null references auth.users (id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'datasets_active_version_matches_dataset_fkey'
  ) then
    alter table public.datasets
    add constraint datasets_active_version_matches_dataset_fkey
    foreign key (id, active_version_id)
    references public.dataset_versions (dataset_id, id)
    deferrable initially immediate;
  end if;
end;
$$;

create table if not exists public.dataset_rows (
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

create table if not exists public.dataset_access (
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

create table if not exists public.dataset_version_sources (
  id uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null references public.dataset_versions (id) on delete cascade,
  source_dataset_version_id uuid not null references public.dataset_versions (id) on delete cascade,
  relation_type text not null default 'merged_from',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.dataset_version_events (
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

create unique index if not exists datasets_single_default_global_idx
  on public.datasets (is_default_global)
  where is_default_global;

create index if not exists dataset_versions_dataset_id_idx
  on public.dataset_versions (dataset_id);

create index if not exists dataset_versions_dataset_id_published_at_idx
  on public.dataset_versions (dataset_id, published_at desc);

create index if not exists dataset_rows_dataset_version_id_idx
  on public.dataset_rows (dataset_version_id);

create index if not exists dataset_rows_dataset_version_id_pipeline_row_id_idx
  on public.dataset_rows (dataset_version_id, pipeline_row_id);

create index if not exists dataset_access_dataset_id_idx
  on public.dataset_access (dataset_id);

create unique index if not exists dataset_access_dataset_id_user_id_key
  on public.dataset_access (dataset_id, user_id)
  where user_id is not null;

create unique index if not exists dataset_access_dataset_id_workspace_id_key
  on public.dataset_access (dataset_id, workspace_id)
  where workspace_id is not null;

create index if not exists workspace_members_user_id_idx
  on public.workspace_members (user_id);

create index if not exists workspace_members_workspace_id_idx
  on public.workspace_members (workspace_id);

create unique index if not exists dataset_version_sources_unique_relation_idx
  on public.dataset_version_sources (
    dataset_version_id,
    source_dataset_version_id,
    relation_type
  );

create index if not exists dataset_version_sources_dataset_version_id_idx
  on public.dataset_version_sources (dataset_version_id);

create index if not exists dataset_version_sources_source_dataset_version_id_idx
  on public.dataset_version_sources (source_dataset_version_id);

create index if not exists dataset_version_events_dataset_id_created_at_idx
  on public.dataset_version_events (dataset_id, created_at desc);

create index if not exists dataset_version_events_dataset_version_id_created_at_idx
  on public.dataset_version_events (dataset_version_id, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_profiles_updated_at'
  ) then
    create trigger set_profiles_updated_at
    before update on public.profiles
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_workspaces_updated_at'
  ) then
    create trigger set_workspaces_updated_at
    before update on public.workspaces
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_datasets_updated_at'
  ) then
    create trigger set_datasets_updated_at
    before update on public.datasets
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_dataset_rows_updated_at'
  ) then
    create trigger set_dataset_rows_updated_at
    before update on public.dataset_rows
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_invites_updated_at'
  ) then
    create trigger set_invites_updated_at
    before update on public.invites
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select profiles.app_role
      from public.profiles
      where profiles.user_id = auth.uid()
    ),
    'user'::public.app_role
  );
$$;

create or replace function public.is_admin(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles
    where profiles.user_id = target_user_id
      and profiles.app_role = 'admin'
  );
$$;

create or replace function public.user_is_workspace_member(
  target_workspace_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.workspace_members
    where workspace_members.workspace_id = target_workspace_id
      and workspace_members.user_id = target_user_id
  );
$$;

create or replace function public.user_can_read_dataset(
  target_dataset_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when target_user_id is null then false
    when public.is_admin(target_user_id) then true
    else exists(
      select 1
      from public.datasets
      where datasets.id = target_dataset_id
        and (
          datasets.visibility = 'global'
          or (
            datasets.visibility = 'private'
            and exists(
              select 1
              from public.dataset_access
              where dataset_access.dataset_id = datasets.id
                and dataset_access.user_id = target_user_id
            )
          )
          or (
            datasets.visibility = 'workspace'
            and datasets.owner_workspace_id is not null
            and public.user_is_workspace_member(
              datasets.owner_workspace_id,
              target_user_id
            )
          )
          or (
            datasets.visibility = 'shared'
            and (
              (
                datasets.owner_workspace_id is not null
                and public.user_is_workspace_member(
                  datasets.owner_workspace_id,
                  target_user_id
                )
              )
              or exists(
                select 1
                from public.dataset_access
                inner join public.workspace_members
                  on workspace_members.workspace_id = dataset_access.workspace_id
                where dataset_access.dataset_id = datasets.id
                  and workspace_members.user_id = target_user_id
              )
              or exists(
                select 1
                from public.dataset_access
                where dataset_access.dataset_id = datasets.id
                  and dataset_access.user_id = target_user_id
              )
            )
          )
        )
    )
  end;
$$;

create or replace function public.user_can_read_dataset_version(
  target_dataset_version_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.dataset_versions
    where dataset_versions.id = target_dataset_version_id
      and public.user_can_read_dataset(
        dataset_versions.dataset_id,
        target_user_id
      )
  );
$$;

create or replace function public.query_dataset_rows(
  target_dataset_version_id uuid,
  target_filters jsonb default '[]'::jsonb,
  target_sorts jsonb default '[]'::jsonb,
  target_page integer default 1,
  target_page_size integer default 50
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  attribute_key text;
  count_sql text;
  escaped_filter_value text;
  expression_sql text;
  filter_clause text;
  filter_data_type text;
  filter_item jsonb;
  filter_literal_sql text;
  filter_op text;
  filter_source text;
  filter_value jsonb;
  filter_value_text text;
  in_values_sql text;
  offset_value integer;
  order_parts text[] := array[]::text[];
  order_sql text;
  rows_result jsonb := '{}'::jsonb;
  rows_sql text;
  sort_data_type text;
  sort_direction text;
  sort_item jsonb;
  sort_source text;
  total_rows bigint := 0;
  where_sql text := format(
    'dataset_version_id = %L::uuid',
    target_dataset_version_id
  );
begin
  if target_page < 1 then
    raise exception using errcode = '22023', message = 'target_page must be >= 1';
  end if;

  if target_page_size < 1 then
    raise exception using errcode = '22023', message = 'target_page_size must be >= 1';
  end if;

  if jsonb_typeof(coalesce(target_filters, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'target_filters must be an array';
  end if;

  if jsonb_typeof(coalesce(target_sorts, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'target_sorts must be an array';
  end if;

  offset_value := greatest(target_page - 1, 0) * target_page_size;

  for filter_item in
    select value
    from jsonb_array_elements(coalesce(target_filters, '[]'::jsonb))
  loop
    filter_source := filter_item ->> 'source';
    filter_op := filter_item ->> 'op';
    filter_data_type := coalesce(lower(filter_item ->> 'dataType'), 'text');
    filter_value := filter_item -> 'value';
    filter_clause := null;
    filter_literal_sql := null;
    filter_value_text := null;
    in_values_sql := null;

    if filter_source is null or filter_op is null then
      raise exception using errcode = '22023', message = 'Each filter requires source and op';
    end if;

    if filter_source = 'pipeline_row_id' then
      filter_data_type := 'text';
      expression_sql := 'pipeline_row_id';
    elsif filter_source = 'created_at' then
      filter_data_type := 'datetime';
      expression_sql := 'created_at';
    elsif filter_source = 'updated_at' then
      filter_data_type := 'datetime';
      expression_sql := 'updated_at';
    elsif filter_source like 'attributes.%' then
      attribute_key := substring(filter_source from 12);

      if attribute_key = '' or position('.' in attribute_key) > 0 then
        raise exception using errcode = '22023', message = format(
          'Unsupported filter source: %s',
          filter_source
        );
      end if;

      case filter_data_type
        when 'boolean' then
          expression_sql := format(
            'nullif(attributes ->> %L, '''')::boolean',
            attribute_key
          );
        when 'date' then
          expression_sql := format(
            'nullif(attributes ->> %L, '''')::date',
            attribute_key
          );
        when 'datetime' then
          expression_sql := format(
            'nullif(attributes ->> %L, '''')::timestamptz',
            attribute_key
          );
        when 'number' then
          expression_sql := format(
            'nullif(attributes ->> %L, '''')::numeric',
            attribute_key
          );
        else
          filter_data_type := 'text';
          expression_sql := format('attributes ->> %L', attribute_key);
      end case;
    else
      raise exception using errcode = '22023', message = format(
        'Unsupported filter source: %s',
        filter_source
      );
    end if;

    case filter_op
      when 'isNull' then
        filter_clause := format('%s is null', expression_sql);
      when 'in' then
        if jsonb_typeof(filter_value) <> 'array' then
          raise exception using errcode = '22023', message = format(
            'The "in" filter requires an array for source %s',
            filter_source
          );
        end if;

        select string_agg(
          case filter_data_type
            when 'boolean' then format('%L::boolean', values_array.value)
            when 'date' then format('%L::date', values_array.value)
            when 'datetime' then format('%L::timestamptz', values_array.value)
            when 'number' then format('%L::numeric', values_array.value)
            else format('%L', values_array.value)
          end,
          ', '
        )
        into in_values_sql
        from jsonb_array_elements_text(filter_value) as values_array(value);

        if in_values_sql is null then
          filter_clause := 'false';
        else
          filter_clause := format('%s in (%s)', expression_sql, in_values_sql);
        end if;
      when 'contains' then
        if filter_data_type <> 'text' then
          raise exception using errcode = '22023', message = format(
            'The "contains" operator only supports text fields: %s',
            filter_source
          );
        end if;

        filter_value_text := filter_item ->> 'value';

        if filter_value_text is null then
          raise exception using errcode = '22023', message = format(
            'The "contains" operator requires a value: %s',
            filter_source
          );
        end if;

        escaped_filter_value := replace(
          replace(replace(filter_value_text, E'\\', E'\\\\'), '%', E'\\%'),
          '_',
          E'\\_'
        );
        filter_clause := format(
          '%s ilike %L',
          expression_sql,
          '%' || escaped_filter_value || '%'
        );
      when 'startsWith' then
        if filter_data_type <> 'text' then
          raise exception using errcode = '22023', message = format(
            'The "startsWith" operator only supports text fields: %s',
            filter_source
          );
        end if;

        filter_value_text := filter_item ->> 'value';

        if filter_value_text is null then
          raise exception using errcode = '22023', message = format(
            'The "startsWith" operator requires a value: %s',
            filter_source
          );
        end if;

        escaped_filter_value := replace(
          replace(replace(filter_value_text, E'\\', E'\\\\'), '%', E'\\%'),
          '_',
          E'\\_'
        );
        filter_clause := format(
          '%s ilike %L',
          expression_sql,
          escaped_filter_value || '%'
        );
      else
        filter_value_text := filter_item ->> 'value';

        if filter_value_text is null then
          raise exception using errcode = '22023', message = format(
            'The "%s" operator requires a scalar value: %s',
            filter_op,
            filter_source
          );
        end if;

        case filter_data_type
          when 'boolean' then
            filter_literal_sql := format('%L::boolean', filter_value_text);
          when 'date' then
            filter_literal_sql := format('%L::date', filter_value_text);
          when 'datetime' then
            filter_literal_sql := format('%L::timestamptz', filter_value_text);
          when 'number' then
            filter_literal_sql := format('%L::numeric', filter_value_text);
          else
            filter_literal_sql := format('%L', filter_value_text);
        end case;

        case filter_op
          when 'eq' then
            filter_clause := format('%s = %s', expression_sql, filter_literal_sql);
          when 'neq' then
            filter_clause := format(
              '%s is distinct from %s',
              expression_sql,
              filter_literal_sql
            );
          when 'gt' then
            filter_clause := format('%s > %s', expression_sql, filter_literal_sql);
          when 'gte' then
            filter_clause := format('%s >= %s', expression_sql, filter_literal_sql);
          when 'lt' then
            filter_clause := format('%s < %s', expression_sql, filter_literal_sql);
          when 'lte' then
            filter_clause := format('%s <= %s', expression_sql, filter_literal_sql);
          else
            raise exception using errcode = '22023', message = format(
              'Unsupported filter operator: %s',
              filter_op
            );
        end case;
    end case;

    where_sql := where_sql || ' and ' || filter_clause;
  end loop;

  for sort_item in
    select value
    from jsonb_array_elements(coalesce(target_sorts, '[]'::jsonb))
  loop
    sort_source := sort_item ->> 'source';
    sort_direction := lower(coalesce(sort_item ->> 'direction', 'asc'));
    sort_data_type := coalesce(lower(sort_item ->> 'dataType'), 'text');

    if sort_source is null then
      raise exception using errcode = '22023', message = 'Each sort requires a source';
    end if;

    if sort_direction not in ('asc', 'desc') then
      raise exception using errcode = '22023', message = format(
        'Unsupported sort direction: %s',
        sort_direction
      );
    end if;

    if sort_source = 'pipeline_row_id' then
      sort_data_type := 'text';
      expression_sql := 'pipeline_row_id';
    elsif sort_source = 'created_at' then
      sort_data_type := 'datetime';
      expression_sql := 'created_at';
    elsif sort_source = 'updated_at' then
      sort_data_type := 'datetime';
      expression_sql := 'updated_at';
    elsif sort_source like 'attributes.%' then
      attribute_key := substring(sort_source from 12);

      if attribute_key = '' or position('.' in attribute_key) > 0 then
        raise exception using errcode = '22023', message = format(
          'Unsupported sort source: %s',
          sort_source
        );
      end if;

      case sort_data_type
        when 'boolean' then
          expression_sql := format(
            'nullif(attributes ->> %L, '''')::boolean',
            attribute_key
          );
        when 'date' then
          expression_sql := format(
            'nullif(attributes ->> %L, '''')::date',
            attribute_key
          );
        when 'datetime' then
          expression_sql := format(
            'nullif(attributes ->> %L, '''')::timestamptz',
            attribute_key
          );
        when 'number' then
          expression_sql := format(
            'nullif(attributes ->> %L, '''')::numeric',
            attribute_key
          );
        else
          sort_data_type := 'text';
          expression_sql := format('attributes ->> %L', attribute_key);
      end case;
    else
      raise exception using errcode = '22023', message = format(
        'Unsupported sort source: %s',
        sort_source
      );
    end if;

    order_parts := array_append(
      order_parts,
      format('%s %s nulls last', expression_sql, sort_direction)
    );
  end loop;

  if coalesce(array_length(order_parts, 1), 0) = 0 then
    order_parts := array['row_index asc nulls last', 'id asc'];
  else
    order_parts := array_append(order_parts, 'id asc');
  end if;

  order_sql := array_to_string(order_parts, ', ');
  count_sql := format(
    'select count(*) from public.dataset_rows where %s',
    where_sql
  );

  execute count_sql into total_rows;

  rows_sql := format(
    $query$
      select jsonb_build_object(
        'rows',
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'rowId',
              paged_rows.id,
              'pipelineRowId',
              paged_rows.pipeline_row_id,
              'attributes',
              paged_rows.attributes,
              'createdAt',
              paged_rows.created_at,
              'updatedAt',
              paged_rows.updated_at
            )
            order by %s
          ),
          '[]'::jsonb
        ),
        'totalRows',
        %s
      )
      from (
        select
          id,
          pipeline_row_id,
          attributes,
          created_at,
          updated_at,
          row_index
        from public.dataset_rows
        where %s
        order by %s
        limit %s
        offset %s
      ) as paged_rows
    $query$,
    order_sql,
    total_rows,
    where_sql,
    order_sql,
    target_page_size,
    offset_value
  );

  execute rows_sql into rows_result;

  return rows_result;
end;
$$;

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

revoke all on function public.current_app_role() from public;
revoke all on function public.is_admin(uuid) from public;
revoke all on function public.user_is_workspace_member(uuid, uuid) from public;
revoke all on function public.user_can_read_dataset(uuid, uuid) from public;
revoke all on function public.user_can_read_dataset_version(uuid, uuid) from public;
revoke all on function public.query_dataset_rows(uuid, jsonb, jsonb, integer, integer) from public;
revoke all on function public.activate_dataset_version(uuid, uuid, uuid) from public;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.user_is_workspace_member(uuid, uuid) to authenticated;
grant execute on function public.user_can_read_dataset(uuid, uuid) to authenticated;
grant execute on function public.user_can_read_dataset_version(uuid, uuid) to authenticated;
grant execute on function public.query_dataset_rows(uuid, jsonb, jsonb, integer, integer) to authenticated;
grant execute on function public.activate_dataset_version(uuid, uuid, uuid) to service_role;

alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.datasets enable row level security;
alter table public.dataset_versions enable row level security;
alter table public.dataset_rows enable row level security;
alter table public.dataset_access enable row level security;
alter table public.dataset_version_sources enable row level security;
alter table public.dataset_version_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_self_or_admin'
  ) then
    create policy "profiles_select_self_or_admin"
    on public.profiles
    for select
    to authenticated
    using (
      user_id = auth.uid()
      or public.is_admin(auth.uid())
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workspaces'
      and policyname = 'workspaces_select_member_or_admin'
  ) then
    create policy "workspaces_select_member_or_admin"
    on public.workspaces
    for select
    to authenticated
    using (
      public.user_is_workspace_member(id, auth.uid())
      or public.is_admin(auth.uid())
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workspace_members'
      and policyname = 'workspace_members_select_self_or_admin'
  ) then
    create policy "workspace_members_select_self_or_admin"
    on public.workspace_members
    for select
    to authenticated
    using (
      user_id = auth.uid()
      or public.is_admin(auth.uid())
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'datasets'
      and policyname = 'datasets_select_readable'
  ) then
    create policy "datasets_select_readable"
    on public.datasets
    for select
    to authenticated
    using (public.user_can_read_dataset(id, auth.uid()));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'dataset_versions'
      and policyname = 'dataset_versions_select_readable'
  ) then
    create policy "dataset_versions_select_readable"
    on public.dataset_versions
    for select
    to authenticated
    using (public.user_can_read_dataset_version(id, auth.uid()));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'dataset_rows'
      and policyname = 'dataset_rows_select_readable'
  ) then
    create policy "dataset_rows_select_readable"
    on public.dataset_rows
    for select
    to authenticated
    using (
      exists(
        select 1
        from public.dataset_versions
        where dataset_versions.id = dataset_rows.dataset_version_id
          and public.user_can_read_dataset(
            dataset_versions.dataset_id,
            auth.uid()
          )
      )
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'dataset_access'
      and policyname = 'dataset_access_select_admin_only'
  ) then
    create policy "dataset_access_select_admin_only"
    on public.dataset_access
    for select
    to authenticated
    using (public.is_admin(auth.uid()));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'dataset_version_sources'
      and policyname = 'dataset_version_sources_select_readable'
  ) then
    create policy "dataset_version_sources_select_readable"
    on public.dataset_version_sources
    for select
    to authenticated
    using (public.user_can_read_dataset_version(dataset_version_id, auth.uid()));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'invites'
      and policyname = 'invites_select_admin_only'
  ) then
    create policy "invites_select_admin_only"
    on public.invites
    for select
    to authenticated
    using (public.is_admin(auth.uid()));
  end if;
end;
$$;

revoke all on table public.dataset_version_events from anon;
revoke all on table public.dataset_version_events from authenticated;
grant select, insert, update, delete on table public.dataset_version_events to service_role;

notify pgrst, 'reload schema';
