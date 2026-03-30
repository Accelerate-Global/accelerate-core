# Phase 8 Implementation Notes

## Scope Summary

Phase 8 adds three controlled extensions without destabilizing the existing dataset browser or admin model:

- deeper dataset-version lineage and normalized row provenance contracts
- stronger version management with comparison summaries, publish history, and rollback-safe activation
- admin-only warehouse and text-to-query scaffolding behind explicit feature gates

## Acceptance Evidence

- Version history and activation safety:
  - schema and activation RPC in `supabase/migrations/20260330100000_phase_8_advanced_data_product_features.sql`
  - admin activation action in `src/features/admin/datasets/actions.ts`
  - version history and notes UI in `src/features/admin/publishing/page.tsx`
- Deeper lineage:
  - recursive lineage and comparison helpers in `src/features/datasets/lineage-service.ts`
  - normalized row provenance in `src/features/datasets/types.ts`
  - admin publishing lineage panel in `src/features/admin/publishing/page.tsx`
- Experimental scaffolding:
  - feature gates in `src/lib/experiments/feature-flags.ts`
  - warehouse and text-to-query adapter boundaries in `src/lib/warehouse/*` and `src/lib/experiments/text-to-query/*`
  - admin-only readiness surface in `src/features/admin/apis/page.tsx`

## Seeded QA Targets

- `Workspace A Combined Signals` now includes:
  - v1 as the earlier merged baseline
  - v2 as the active version with one added column and one added row
  - seeded publish and activation history
- v2 row lineage includes explicit `upstreamRows` references in `dataset_rows.lineage`

## Manual QA Script

1. Reset and seed the local database with Phase 8 data:
   - run `supabase db reset`
   - confirm the seeded dataset `Workspace A Combined Signals` has active v2
2. Verify publishing lineage and comparison summaries in `/app/admin/publishing`:
   - select `Workspace A Combined Signals`
   - inspect v2 lineage panel and confirm:
     - direct sources is `2`
     - total ancestors is greater than or equal to direct sources
     - max depth is at least `1`
     - lineage graph renders without duplicate dataset-version nodes
   - inspect v1 in the version catalog and confirm comparison summary renders:
     - row count delta
     - added/removed columns
     - added/removed lineage sources
     - notes changed and change summary changed indicators
   - confirm the lineage panel still states field-level lineage is deferred
3. Verify activation history and rollback behavior:
   - activate v1 from the version catalog
   - confirm dataset active version changes to v1
   - verify `Activation and publish history` includes a new `Activated` event with previous version populated
   - reactivate v2
   - confirm dataset active version changes back to v2
   - verify a second new `Activated` event is recorded with correct version transition metadata
4. Verify publish metadata behavior:
   - activate a version that already has `published_at` set
   - confirm activation creates an `Activated` event
   - confirm no duplicate first-publication semantics are implied in history metadata
5. Verify notes/change-summary persistence:
   - update operator notes and change summary on the selected version
   - save and reload `/app/admin/publishing`
   - confirm both values persist and render in version details and catalog row
6. Verify admin-only and feature-flag boundaries on `/app/admin/apis`:
   - as an admin with default env flags (off), confirm:
     - `Admin experiments` and `Text-to-query` badges show disabled
     - warehouse and text-to-query sections show disabled/not-configured state only
     - provider-specific readiness does not appear as enabled capability
   - as a non-admin user, navigate to `/app/admin/apis` and confirm access is blocked by admin routing
   - confirm page content remains informational only (no action controls that execute warehouse queries, model calls, or text-to-query runs)

## Pipeline Follow-up

Current normalized row provenance expects `dataset_rows.lineage` to optionally emit:

- `ingestedFrom`
- `upstreamRows[]` with `datasetVersionId` and `pipelineRowId`

Field-level lineage is still deferred. If later needed, the pipeline must emit explicit, stable field-mapping structures before the app should render them.

## Human-Owned Prerequisites

- choose warehouse and model providers
- provision credentials and connection references
- define governance, auditing, and evaluation criteria
- approve allowlisted datasets and columns before enabling experiments
