alter table public.profiles enable row level security;
alter table public.invites enable row level security;

create policy profiles_select_own
on public.profiles
for select
using (auth.uid() = id);

create policy profiles_select_admin
on public.profiles
for select
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid() and app_role = 'admin'
  )
);

create policy invites_select_admin
on public.invites
for select
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid() and app_role = 'admin'
  )
);

create policy invites_insert_admin
on public.invites
for insert
with check (
  exists (
    select 1
    from public.profiles
    where id = auth.uid() and app_role = 'admin'
  )
);

create policy invites_update_admin
on public.invites
for update
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid() and app_role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where id = auth.uid() and app_role = 'admin'
  )
);
