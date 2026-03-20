create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and app_role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.invites enable row level security;

create policy profiles_select_own
on public.profiles
for select
using (auth.uid() = id);

create policy profiles_select_admin
on public.profiles
for select
using (public.is_admin());

create policy invites_select_admin
on public.invites
for select
using (public.is_admin());

create policy invites_insert_admin
on public.invites
for insert
with check (public.is_admin());

create policy invites_update_admin
on public.invites
for update
using (public.is_admin())
with check (public.is_admin());
