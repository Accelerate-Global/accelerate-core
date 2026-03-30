# Phase 6 Implementation Notes

## Scope Status

### Fully functional admin areas

- `/app/admin`
- `/app/admin/users`
- `/app/admin/invites`
- `/app/admin/permissions`
- `/app/admin/datasets`
- `/app/admin/publishing`

### Bounded placeholders by design

- `/app/admin/apis`
- `/app/admin/ingestion-runs`
- `/app/admin/pipeline-runs`

These three routes are intentionally placeholder-only because the repository
still does not contain real backing tables, views, or confirmed external
operational feeds for those surfaces. The placeholder adapter lives in
`src/features/admin/operations/server.ts` and already enforces admin-only
access plus explicit integration notes.

## Closeout QA

All QA below was run against the local Supabase stack seeded from
`supabase/seeds/001_phase_3_core_data.sql`, with the Next app started against
that local project.

### Access control

- `PASS` Unauthenticated `/app/admin` redirects to `/login`.
  Verified from the live app response payload and redirect metadata.
- `PASS` Authenticated non-admin `/app/admin` redirects to `/app`.
- `PASS` Non-admin `/app` does not render the Admin navigation entry.
- `PASS` Direct non-admin mutation attempts fail at the server boundary.
  Verified with real POST submissions for:
  - invite revoke
  - dataset visibility update
  - user role update
  - user dataset-access grant
  - dataset version activation
- `PASS` Every admin action module still enforces admin access directly with
  `requireCurrentUserAdmin()` and does not rely only on layout protection.

### Admin mutations

- `PASS` Invite regenerate revokes the previous invite row and creates a new
  invite row with a new raw link.
- `PASS` Old regenerated invite row is no longer pending/actionable.
- `PASS` Setting a new default global dataset clears the previous default.
- `PASS` Publishing activation updates `datasets.active_version_id` and the UI
  reflects the newly active version.

### QA notes

- The seed only provides one version per dataset, so publishing activation was
  validated by inserting one temporary local `dataset_versions` row during QA,
  exercising the admin action, then restoring the DB to its prior state.
- Invite regeneration and dataset-default reassignment were also restored in
  the local DB after verification so the workspace was not left in a mutated
  QA state.
- Local HTTP response captures used during QA were moved under
  `.tmp/phase6-artifacts/` and are not intended for review or commit.

## Repo Checks

- `PASS` `npm run check`
- `PASS` `npm run build`

Notes:

- A runtime regression surfaced during QA in the admin shell because nav items
  were passing Lucide component functions across a server-to-client boundary.
  That was fixed by serializing nav icons as string keys and resolving them in
  the client sidebar.
- `npm run check` initially failed on the stock Playwright scaffold plus the
  temporary QA HTML captures. The scaffold files were normalized, and the QA
  captures were moved out of the linter path.

## Manual Follow-ups

- Provide a confirmed backing source for API oversight before making
  `/app/admin/apis` live.
- Provide a confirmed ingestion-run table, view, or operational feed before
  making `/app/admin/ingestion-runs` live.
- Provide a confirmed pipeline-run table, view, or operational feed before
  making `/app/admin/pipeline-runs` live.

## Review Hygiene

Phase 6 review should focus on the admin implementation and the closeout fixes.
Keep these out of the Phase 6 decision unless they are intentionally being
cleaned up in the same review:

- pre-existing unrelated worktree noise such as `bun.lock`
- pre-existing `.tmp/pr9-review`
- local QA artifacts under `.tmp/phase6-artifacts/`
