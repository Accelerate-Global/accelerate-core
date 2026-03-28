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
                where dataset_access.dataset_id = datasets.id
                  and dataset_access.user_id = target_user_id
              )
              or exists(
                select 1
                from public.dataset_access
                inner join public.workspace_members
                  on workspace_members.workspace_id = dataset_access.workspace_id
                where dataset_access.dataset_id = datasets.id
                  and workspace_members.user_id = target_user_id
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

revoke all on function public.current_app_role() from public;
revoke all on function public.is_admin(uuid) from public;
revoke all on function public.user_is_workspace_member(uuid, uuid) from public;
revoke all on function public.user_can_read_dataset(uuid, uuid) from public;
revoke all on function public.user_can_read_dataset_version(uuid, uuid) from public;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.user_is_workspace_member(uuid, uuid) to authenticated;
grant execute on function public.user_can_read_dataset(uuid, uuid) to authenticated;
grant execute on function public.user_can_read_dataset_version(uuid, uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.datasets enable row level security;
alter table public.dataset_versions enable row level security;
alter table public.dataset_rows enable row level security;
alter table public.dataset_access enable row level security;
alter table public.invites enable row level security;

create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

create policy "workspaces_select_member_or_admin"
on public.workspaces
for select
to authenticated
using (
  public.user_is_workspace_member(id)
  or public.is_admin()
);

create policy "workspace_members_select_self_or_admin"
on public.workspace_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

create policy "datasets_select_readable"
on public.datasets
for select
to authenticated
using (public.user_can_read_dataset(id));

create policy "dataset_versions_select_readable"
on public.dataset_versions
for select
to authenticated
using (public.user_can_read_dataset_version(id));

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

create policy "dataset_access_select_admin_only"
on public.dataset_access
for select
to authenticated
using (public.is_admin());

create policy "invites_select_admin_only"
on public.invites
for select
to authenticated
using (public.is_admin());
