# Phase 5 Closeout Validation

Date: 2026-04-01

## Acceptance Criteria Reconstructed from Repo Evidence

Derived from:
- `src/app/app/(product)/page.tsx`
- `src/app/app/(product)/datasets/page.tsx`
- `src/app/app/(product)/datasets/[datasetId]/page.tsx`
- `src/features/datasets/browser/dataset-browser-shell.tsx`
- `src/features/datasets/browser/server.ts`
- `src/features/datasets/query-service.ts`
- `src/app/api/datasets/[datasetId]/query/route.ts`

Phase 5 closeout criteria used:
1. `/app` is the authenticated default landing page for home/global dataset browsing.
2. `/app/datasets` is a readable dataset directory for current-user visibility.
3. `/app/datasets/[datasetId]` is the reusable dataset detail browser.
4. sorting/filtering/pagination remain backend-query-driven (not client-faked).
5. loading/empty/access-denied/not-found/unavailable states are handled.
6. browser shell is shared across supported dataset contexts.
7. URL/query synchronization works for supported browser state parameters.
8. browser stays on top of the Phase 4 query-layer contract (`/api/datasets/*` + query service + RPC).

## Environment Targeting (Local vs Remote)

`.env.local` currently points at remote Supabase:
- `NEXT_PUBLIC_SUPABASE_URL=https://vopebyadvjdskmctxjhn.supabase.co`

For QA, local-targeting was explicitly enforced:

```sh
supabase status
supabase db reset
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH" \
SUPABASE_SERVICE_ROLE_KEY="<local service role key from supabase status>" \
NEXT_PUBLIC_APP_URL="http://localhost:3000" \
npm run dev -- --port 3000
```

Local-target proof used:
- `supabase status` reported local API/DB endpoints (`127.0.0.1:54321/54322`) and local keys.
- App runtime command used explicit local env overrides (above), so `.env.local` remote values were bypassed.
- Real auth flow used local Mailpit (`http://127.0.0.1:54324`) and local auth verify links (`http://127.0.0.1:54321/auth/v1/verify?...`).
- Browser interactions produced local app API traffic against `/api/datasets/*` with local DB reset fixtures.

## Browser Validation Results

### A. Auth and landing
- A1 Unauthenticated `/app` -> `/login`: **passed**
- A2 Authenticated user lands correctly on `/app` home/global browser: **passed**
- A3 No readable home dataset -> empty-home state without crash: **passed** (temporary local fixture toggle)

### B. Dataset directory and detail pages
- B4 `/app/datasets` lists readable datasets for current user: **passed**
- B5 `/app/datasets/[datasetId]` renders readable dataset: **passed**
- B6 Shared browser shell consistency across global/private/workspace/shared contexts: **passed**

### C. Browser interactions
- C7 Sorting updates URL and triggers backend refetch: **passed**
- C8 Filtering updates URL and triggers backend refetch: **passed**
- C9 Pagination/page-size updates URL and backend refetch:
  - pageSize: **passed**
  - page index (next page): **passed**
- C10 URL/query sync for supported params (`page`, `pageSize`, `sortField`, `sortDirection`, `filter_*`, `versionId`): **passed**
- C11 Unsupported/stale params cleanup on next browser-generated update: **passed**

### D. State handling
- D12 Empty dataset state: **passed**
- D13 Access denied (`403`): **passed**
- D14 Dataset not found (`404`): **passed**
- D15 Dataset/version unavailable (`409`): **passed**
- D16 Expired-session interactive refetch -> login redirect (`401` handling): **passed**

## Local-Only Fixture Setup

Used local SQL-only QA fixtures in local Supabase (not product code):

1. Added temporary QA datasets for interaction/state coverage:
   - large global dataset (`90000000-0000-4000-8000-000000000001`) with 60 rows for true pagination
   - empty global dataset (`90000000-0000-4000-8000-000000000002`) for empty state
   - unavailable global dataset (`90000000-0000-4000-8000-000000000003`) with no active version for `409`

2. Temporarily removed home flag to validate empty-home state:
   - `update public.datasets set is_default_global = false where is_default_global = true;`
   - reverted after test to seeded behavior:
     - `update public.datasets set is_default_global = (id = '20000000-0000-4000-8000-000000000001');`

3. Fixture cleanup:
   - QA fixture datasets/versions/rows were deleted after validation.

## Bugs Found and Minimal Durable Fixes

### Bug 1: browser remained stuck in loading/disabled after aborted interactive refetch
- File: `src/features/datasets/browser/dataset-browser-shell.tsx`
- Failure:
  - During rapid URL-driven browser updates (page size/sort/filter), aborted client requests could leave `isQueryLoading` stuck `true`.
  - Result: persistent loading pulse + disabled pagination/filter controls despite valid results.
- Minimal fix:
  - On aborted request paths (`then` and `catch` branches), explicitly call `setIsQueryLoading(false)`.
  - Remove unused transition state binding after busy-state adjustment.
- Rerun result:
  - After fix, pagination controls recovered correctly (`Page 1 of 3` with enabled `Next`), and C9 + D16 scenarios passed.

## Validation Commands Run

```sh
supabase status
supabase db reset
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH" SUPABASE_SERVICE_ROLE_KEY="<local service role key from supabase status>" NEXT_PUBLIC_APP_URL="http://localhost:3000" npm run dev -- --port 3000

# local fixture setup/teardown and targeted checks
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" ...
node - <<'NODE' ... (playwright-driven authenticated browser checks) ... NODE

# code validation
npm run check
npm run build
```

Results:
- `npm run check`: PASS
- `npm run build`: PASS

## Final Verdict

**Phase 5 closed**.
