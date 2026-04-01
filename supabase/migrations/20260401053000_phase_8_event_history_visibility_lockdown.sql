alter table public.dataset_version_events enable row level security;

revoke all on table public.dataset_version_events from anon;
revoke all on table public.dataset_version_events from authenticated;

grant select, insert, update, delete on table public.dataset_version_events to service_role;
