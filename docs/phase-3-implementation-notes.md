# Phase 3 Implementation Notes

Fresh closeout validation was rerun for Phase 3 core data model on local Supabase.

## Commands Run

```sh
supabase status
supabase db reset
supabase gen types typescript --local --schema public > src/lib/supabase/database.types.ts
npm exec -- ultracite fix src/lib/supabase/database.types.ts
npm exec -- biome check --write --unsafe src/lib/supabase/database.types.ts
npm run check
npm run build
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 <<'SQL'
-- schema presence checks
-- seed coverage checks
-- claim-based RLS proof checks
SQL
node -e "<thin session-backed auth smoke check against /auth/v1/token and /rest/v1/datasets>"
```

## Local Stack Targeting

- Targeting was normal: `supabase status` reported local stack on default ports (`127.0.0.1:54321` API, `127.0.0.1:54322` Postgres).
- No temporary port/config workaround was required or left behind.

## Reset, Schema, and Seed Result

- `supabase db reset` completed successfully (no restart-step `502` during this run).
- The reset replayed migrations through current head, then loaded `supabase/seeds/001_phase_3_core_data.sql`.
- Direct post-reset SQL verification confirmed Phase 3 core objects exist:
  - tables: `profiles`, `invites`, `workspaces`, `workspace_members`, `datasets`, `dataset_versions`, `dataset_rows`, `dataset_access`
  - helper functions: `current_app_role`, `is_admin`, `user_is_workspace_member`, `user_can_read_dataset`, `user_can_read_dataset_version`
  - expected RLS policies present on all core tables
  - expected indexes/unique indexes present for dataset/workspace access paths

## Seed Coverage Verification

- Seed shape after reset:
  - datasets by visibility: `global=1`, `workspace=1`, `private=1`, `shared=2`
  - `dataset_access`: `2` direct-user grants + `2` workspace grants
  - `invites`: `1` row
- Access-path coverage present in seeded data:
  - admin access
  - global dataset access
  - workspace-member access
  - non-member denial
  - shared dataset access (workspace and direct user grant)
  - direct-user private grant access

## Typegen Status

- `src/lib/supabase/database.types.ts` was regenerated from the local schema and checked in sync.
- A formatting/style pass was required after generation to satisfy repo lint policy.

## Repo Validation

- `npm run check`: passed.
- `npm run build`: passed.

## RLS Proof Method and Outcome

Authoritative Phase 3 proof used claim-based Postgres impersonation (`set local role authenticated` + `set_config('request.jwt.claim.sub', ...)`) and verified:

- admin sees all intended datasets, versions, rows, both workspaces, all `workspace_members`, all `dataset_access`, and all `invites`
- workspace member sees workspace-owned/shared datasets and corresponding versions/rows
- non-member denial holds (owner of workspace B cannot see workspace A-only dataset or private dataset)
- direct-user grants work for private and shared datasets, including versions/rows
- admin-only internals hold (`dataset_access`, `invites` hidden from non-admins)

Thin session-backed smoke check was also run (cheap with existing seeded auth users and no harness changes):

- admin authenticated via `/auth/v1/token` and saw full dataset set via `/rest/v1/datasets`
- normal user (`owner-b`) authenticated and saw only allowed dataset subset

## Final Closeout Verdict

Phase 3 is closed based on fresh schema/seed/typegen/build/RLS validation.
