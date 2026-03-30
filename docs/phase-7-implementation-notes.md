# Phase 7 Implementation Notes

## Scope Summary

Phase 7 closes the sharing and expansion slice by:

- completing workspace-scoped and shared dataset enforcement
- making `/app/workspace` a real product page
- treating merged outputs as first-class datasets and versions
- extending admin dataset controls with workspace-centered sharing and lineage

The pipeline remains the only dataset creator.

## Acceptance Evidence

- Workspace-scoped datasets work end-to-end:
  - DB helper path in `supabase/migrations/20260329100000_phase_7_workspace_sharing_and_lineage.sql`
  - product workspace loader and page in `src/features/workspaces/server.ts` and `src/features/workspaces/page.tsx`
  - seeded workspace-owned dataset in `supabase/seeds/001_phase_3_core_data.sql`
- Shared datasets across approved workspaces work end-to-end:
  - shared access logic in `supabase/migrations/20260329100000_phase_7_workspace_sharing_and_lineage.sql`
  - workspace grant/revoke actions in `src/features/admin/permissions/actions.ts`
  - shared dataset and grant seed rows in `supabase/seeds/001_phase_3_core_data.sql`
- `/app/workspace` is a meaningful page:
  - route wiring in `src/app/app/(product)/workspace/page.tsx`
  - server-rendered page content in `src/features/workspaces/page.tsx`
- Admins can manage workspace sharing cleanly:
  - visibility cleanup in `src/features/admin/datasets/actions.ts`
  - workspace-centered permissions UI in `src/features/admin/permissions/page.tsx`
  - permissions data shaping in `src/features/admin/permissions/server.ts`
- Merged datasets are represented as first-class dataset/version entities with lineage links:
  - `dataset_version_sources` table in `supabase/migrations/20260329100000_phase_7_workspace_sharing_and_lineage.sql`
  - merged dataset seed rows in `supabase/seeds/001_phase_3_core_data.sql`
  - lineage surfaced in admin publishing in `src/features/admin/publishing/server.ts` and `src/features/admin/publishing/page.tsx`
- The reusable dataset browser shell still drives the normal user experience:
  - dataset detail route still renders `DatasetBrowserShell` in `src/app/app/(product)/datasets/[datasetId]/page.tsx`
  - browser enrichment is additive in `src/features/datasets/browser/dataset-header.tsx`

## Seeded QA Targets

### Users

- `admin@accelerate.test` / `password123`
- `owner-a@accelerate.test` / `password123`
- `owner-b@accelerate.test` / `password123`
- `dual-member@accelerate.test` / `password123`
- `direct-grant@accelerate.test` / `password123`

### Workspaces

- `Workspace A` (`workspace-a`)
- `Workspace B` (`workspace-b`)

### Datasets

- `Accelerate Core Global` (`accelerate-core-global`) — global
- `Workspace A Portfolio` (`workspace-a-portfolio`) — workspace-scoped to Workspace A
- `Executive Private List` (`executive-private-list`) — private with direct user grant
- `Shared Market Map` (`shared-market-map`) — shared from Workspace A to Workspace B, plus one legacy shared direct-user grant
- `Workspace A Combined Signals` (`workspace-a-combined-signals`) — merged shared dataset with lineage links to:
  - `Workspace A Portfolio` v1
  - `Shared Market Map` v1

## Validation Run

- `npm run check`
- `npm run build`
- `supabase db reset`

DB helper spot checks passed after reset:

- `owner_b_shared = true`
- `owner_b_merged = true`
- `direct_shared_legacy = true`
- `direct_merged_denied = false`
- `owner_b_workspace_denied = false`

## Compact Manual QA Script

1. Reset local data with `supabase db reset`.
2. Verify product directory as a Workspace A user:
   - workspace dataset is visible
   - shared dataset is visible
   - merged shared dataset is visible
3. Verify product directory as a Workspace B user:
   - Workspace A workspace-scoped dataset is not visible
   - shared dataset is visible
   - merged shared dataset is visible
4. Verify product directory as the direct-grant user:
   - private dataset is visible
   - shared dataset is visible via legacy grant
   - merged shared dataset is not visible
5. Verify `/app/workspace`:
   - memberships render
   - page defaults to all readable workspaces
   - filtering to Workspace A narrows to workspace-related datasets
   - filtering to Workspace B narrows to datasets shared with or owned by Workspace B
6. Verify `/app/admin/permissions` as admin:
   - shared dataset shows owner workspace as implicit access
   - shared dataset allows workspace grant/revoke
   - shared dataset does not offer new direct-user grant creation
   - legacy shared direct-user grant remains visible and revocable
   - private dataset still allows direct-user grant creation
7. Verify `/app/admin/datasets`:
   - visibility update succeeds
   - moving to `private` drops workspace grants
   - moving to `workspace` or `global` clears all `dataset_access` rows
8. Verify `/app/admin/publishing`:
   - merged dataset version shows source dataset/version links
   - active version switching still works
9. Verify dataset detail pages:
   - browser shell still renders
   - owner workspace, shared-workspace summary, and derived summary appear where applicable

## Known Browser Gaps

These paths were not fully re-verified end-to-end in a live browser session with authenticated user switching:

- `/app/workspace`
- `/app/datasets`
- `/app/datasets/[datasetId]`
- `/app/admin/datasets`
- `/app/admin/permissions`
- `/app/admin/publishing`

The repo currently lacks a real in-app login UI; the local `login` route is still a placeholder. Browser-level QA therefore still requires manual session setup outside the route itself.

## Pipeline Follow-up

The pipeline must populate:

- `datasets.visibility`
- `datasets.owner_workspace_id`
- `dataset_access` workspace grants for shared datasets
- `dataset_version_sources` rows for merged outputs

Merged outputs must continue to be emitted as real dataset/version records, not temporary joins.
