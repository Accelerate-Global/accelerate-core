# Phase 8 Closeout Validation (Proof Run)

Date: 2026-04-01
Scope: seeded publishing/versioning/lineage proof for `Workspace A Combined Signals` only, plus bounded admin API posture checks.

## Seeded Dataset Proven

- Dataset: `Workspace A Combined Signals` (`workspace-a-combined-signals`)
- Dataset id: `20000000-0000-4000-8000-000000000005`
- Version baseline:
  - v1 id `30000000-0000-4000-8000-000000000005` (earlier merged baseline)
  - v2 id `30000000-0000-4000-8000-000000000006` (seeded active version)
- Seeded publish + activation history exists for both versions in `dataset_version_events`.
- v2 row lineage includes explicit `upstreamRows` references for `combined-1` and `combined-2`.

## Lineage Semantics Proven

- Direct sources for v2: `2`
- Total deduplicated ancestors for v2: `2`
- Max depth for seeded graph: `1`
- Deduplicated graph node count (selected + ancestors): `3`
- Raw traversal count equals deduplicated count for seeded graph (`3`), confirming no duplicate dataset-version walk results for this case.
- Admin publishing UI proof (headless) confirms:
  - deduplicated ancestry rendering (`3` unique dataset-version labels)
  - field-level-lineage deferral text is present:
    - "Field-level lineage remains deferred until the pipeline provides explicit field mappings."

## Comparison Summary Semantics Proven (Inactive v1 vs Active v2)

- Row count delta: `-1`
- Added columns: none
- Removed columns: `priority_signal`
- Added lineage sources: `0`
- Removed lineage sources: `0`
- `notes_changed`: true
- `change_summary_changed`: true
- Admin publishing UI proof confirms summary rendering includes:
  - row delta text
  - columns delta counts
  - lineage source delta counts
  - notes changed indicator
  - change summary changed indicator

## Publishing/History/Rollback Semantics Proven

- Pre-transition events on seeded dataset:
  - total `4` (`2` published, `2` activated)
- Activation proof:
  1. activate v1 through `activate_dataset_version(...)`
  2. reactivate v2 through same RPC (rollback by reactivation)
- Post-transition events:
  - total `6` (`2` published, `4` activated)
  - exactly two new `Activated` events were appended
- `previous_dataset_version_id` and metadata transition fields (`fromVersionId`, `toVersionId`) are populated correctly on new activation events.
- No duplicate first-publication semantics:
  - published event count remains `2`
  - `first_publication_events` count remains `0`
- Notes/change-summary persistence:
  - saved in `/app/admin/publishing` for v2 and reloaded successfully
  - persisted values:
    - notes: `Phase8 proof notes persisted`
    - change summary: `Phase8 proof summary persisted`

## Visibility/Security Posture for Version Events

Validation found and fixed a real mismatch:

- Before fix:
  - `dataset_version_events` had `rls_enabled = false`
  - broad table grants existed for `anon` and `authenticated`
- Minimal durable fix applied:
  - migration: `supabase/migrations/20260401053000_phase_8_event_history_visibility_lockdown.sql`
  - enables RLS on `dataset_version_events`
  - revokes all table privileges from `anon` and `authenticated`
  - leaves `service_role` access for admin server paths
- After fix:
  - `rls_enabled = true`
  - only `service_role` privileges remain
- Code-path verification:
  - `dataset_version_events` is loaded only through admin server flow:
    - `listAdminDatasetVersionEvents()` -> `loadAdminPublishingPage()`
  - no `/api` route exposes `dataset_version_events` directly.

## Portion C / Admin APIs Bounded Posture

Proven against `/app/admin/apis`:

- Admin-only routing enforced (non-admin redirected to `/app`).
- Feature gates render disabled posture by default.
- Page is informational-only:
  - disabled-by-flag messaging shown
  - no execution controls for warehouse/model/text-to-query work
- Supporting code confirms status-only behavior:
  - `getWarehouseAdapterStatus()` returns configuration status only
  - `getTextToQueryStatus()` returns readiness/status only

## Commands Run

- `supabase db reset` (initial proof run)
- `npm run check` (fails on pre-existing formatting issue in `.tmp/phase7-permissions-durability-validation.mjs`)
- `npm run build` (pass)
- `psql ...` queries for seeded values, lineage metrics, comparison facts, event history, and grants/RLS posture
- headless Playwright proof runs against `/app/admin/publishing` and `/app/admin/apis`
- `supabase db reset` (rerun after security migration)
- `npm run check` (same pre-existing `.tmp` formatting failure)
- `npm run build` (pass)

## Closeout Status

Phase 8 is CLOSED for the scoped proof criteria after the minimal `dataset_version_events` visibility lockdown migration.
