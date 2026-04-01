create table public.dataset_version_sources (
  id uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null references public.dataset_versions (id) on delete cascade,
  source_dataset_version_id uuid not null references public.dataset_versions (id) on delete cascade,
  relation_type text not null default 'merged_from',
  created_at timestamptz not null default timezone('utc', now())
);

create unique index dataset_version_sources_unique_relation_idx
  on public.dataset_version_sources (
    dataset_version_id,
    source_dataset_version_id,
    relation_type
  );

create index dataset_version_sources_dataset_version_id_idx
  on public.dataset_version_sources (dataset_version_id);

create index dataset_version_sources_source_dataset_version_id_idx
  on public.dataset_version_sources (source_dataset_version_id);

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

alter table public.dataset_version_sources enable row level security;

create policy "dataset_version_sources_select_readable"
on public.dataset_version_sources
for select
to authenticated
using (public.user_can_read_dataset_version(dataset_version_id));
