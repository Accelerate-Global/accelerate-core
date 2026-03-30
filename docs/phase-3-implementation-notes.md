# Phase 3 Implementation Notes

Phase 3 is locally validated.

## Local Validation Outcome

- Local Supabase migration and seed application passed.
- RLS validation passed for admin, workspace-owned, shared-workspace, dual-workspace-member, and direct-user-grant access paths.
- Local email/password auth is disabled in the current Supabase config, so RLS was validated by impersonating authenticated JWT claims directly in Postgres with `set role authenticated` and `set_config('request.jwt.claim.sub', ...)`.
- `supabase db reset` completed schema and seed replay successfully, but the CLI ended with a restart-step `502`. The actual database state was verified afterward by querying the live local Postgres instance directly.

## Commands Run

### Local Supabase Start

```sh
supabase start
```

During validation, a temporary local port shift was used in `supabase/config.toml` because another Supabase project was already bound to the default ports. That workaround was reverted after validation.

### Reset and Seed

```sh
supabase db reset
```

### DB Type Generation

```sh
supabase gen types typescript --local --schema public
supabase gen types typescript --local --schema public > src/lib/supabase/database.types.ts
```

### App Verification

```sh
npm run check
npm run build
```

## Post-Reset Verification

The live local database was verified directly after reset:

- `public.datasets`: 4 rows
- `public.dataset_versions`: 4 rows
- `public.dataset_rows`: 7 rows
- `public.dataset_access`: 3 rows

RLS-visible dataset sets were also verified:

- `admin`: global, private, shared, workspace
- `owner_a`: global, shared, workspace
- `owner_b`: global, shared
- `dual_member`: global, shared, workspace
- `direct_grant`: global, private, shared
