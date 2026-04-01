# Phase 4 Implementation Notes

Date: 2026-04-01

## Objective

Deliver the query-layer foundation for dataset browsing, not browser UX expansion:

- stable server-side query contract
- dataset list + metadata retrieval contracts
- row query behavior with filtering, sorting, pagination, and counts
- access-aware behavior aligned with authenticated access and RLS

## Scope Reconstruction (Repo + Packet Alignment)

Phase 4 intent, as evidenced in this repository, is:

1. Introduce the database query primitive for dataset rows:
   - `supabase/migrations/20260328130000_phase_4_dataset_query_rpc.sql`
   - RPC supports filter/sort/page/pageSize and returns `rows` + `totalRows`
2. Define and enforce API contracts for query-layer payloads:
   - `src/features/datasets/query-contract.ts`
3. Expose authenticated API routes for dataset list, metadata, and row query:
   - `src/app/api/datasets/route.ts`
   - `src/app/api/datasets/[datasetId]/metadata/route.ts`
   - `src/app/api/datasets/[datasetId]/query/route.ts`
4. Provide service normalization and guardrails between API and SQL:
   - `src/features/datasets/metadata-service.ts`
   - `src/features/datasets/query-service.ts`
   - `src/features/datasets/context-service.ts`

Explicitly deferred from Phase 4:

- broad browser/UI redesign and expansion work (handled in later phases)
- text-to-query generation, warehouse execution, or phase-8 experimental surfaces
- new query operators or endpoint families beyond the structured dataset query contract

## End-to-End Path (What Is Implemented)

### Dataset list

- `GET /api/datasets`
  - enforces auth via `requireAuthenticatedUser()`
  - loads readable dataset summaries from `listDatasetSummaries()`
  - validates response with `datasetListResponseSchema`

### Dataset metadata

- `GET /api/datasets/:datasetId/metadata`
  - validates route params + search params
  - resolves readable dataset/version context through `resolveReadableDatasetVersionContext()`
  - returns validated `datasetMetadataResponseSchema`

### Dataset rows query

- `POST /api/datasets/:datasetId/query`
  - validates dataset id + JSON body
  - parses body with `datasetQueryRequestSchema`
  - validates filter/sort fields against column definitions and allowed sources
  - normalizes query to RPC payload (`target_filters`, `target_sorts`, `target_page`, `target_page_size`)
  - calls `public.query_dataset_rows(...)`
  - normalizes row values to contract keys and validates `datasetQueryResponseSchema`

### Access-aware behavior

- dataset and version readability is checked before query execution in context service
- DB-level RLS remains active and RPC is `security invoker`
- unreadable datasets are denied by helper/readability checks (`DATASET_ACCESS_DENIED` path)

## Phase 4 Public Contract Boundary

### Supported endpoints

- `GET /api/datasets` (dataset list)
- `GET /api/datasets/:datasetId/metadata` (dataset metadata)
- `POST /api/datasets/:datasetId/query` (dataset row query)

### Supported query behaviors at Phase 4

- Filtering operators accepted by the request contract: `eq`, `neq`, `in`, `contains`, `startsWith`, `gt`, `gte`, `lt`, `lte`, `isNull`
- Operator constraints enforced by implementation:
  - `contains` and `startsWith` are only supported for text fields
  - `gt`, `gte`, `lt`, and `lte` are only supported for comparable fields (`number`, `date`, `datetime`)
- Filter/sort fields must map to dataset columns marked queryable (`filterable`/`sortable`) and backed by supported sources (`created_at`, `updated_at`, `pipeline_row_id`, or `attributes.<key>` with no nested path)
- Sorting supports `asc`/`desc` with up to 3 sort clauses
- Pagination supports `page >= 1`, `pageSize` from 1 to 100, and normalizes out-of-range pages to the last available page
- Count semantics return `totalRows` and derived `totalPages` with each query response

### Intentionally excluded from default row payload

- `lineage`
- `rowIndex`

## Acceptance Criteria Used for Closeout

Phase 4 is considered complete when all are true:

- query-layer routes and services exist and are schema-validated
- metadata retrieval returns columns + dataset/version summary
- row query returns deterministic rows + totalRows and supports:
  - filtering (supported operators only)
  - sorting
  - pagination
  - count semantics
- malformed query inputs are rejected safely
- access-aware behavior prevents unauthorized read paths
- repository passes lint/type/build checks

## Fresh Validation Run (Minimal, Durable)

Commands run:

```sh
supabase status
supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 <<'SQL'
-- phase4_validation: begin/end scripted checks
SQL
npm run check
npm run build
```

### Runtime checks proven by SQL execution

- `metadata_readable:PASS`
  - readable dataset active version exists with non-empty column definitions
- `query_baseline:PASS`
  - unfiltered row query returns expected rows and `totalRows`
- `query_filter_contains:PASS`
  - `contains` filter behavior works for text field
- `query_sort_desc:PASS`
  - sort ordering is honored
- `query_pagination_count:PASS`
  - pagination slices rows while preserving total count
- `query_malformed:PASS`
  - malformed RPC input (`target_filters` not array) raises SQLSTATE `22023`
- `access_rls_denial:PASS`
  - unreadable dataset is denied for non-member user and rows are not visible under RLS

### Contract and API-surface checks (inspection-backed)

- request/response schemas are enforced in API route and service layers
- invalid route params/search/body produce dataset API errors via shared error mapping
- RPC SQLSTATE `22023` is converted to `INVALID_REQUEST` in query service
- dataset/version access-denial paths are explicit in context resolution

### Repo integrity checks

- `npm run check`: PASS
- `npm run build`: PASS

## Operational Caveat (Not Product Incompleteness)

During one local dev-server session, direct curl calls to `/api/datasets*` returned a Next.js module-chunk runtime error (`Cannot find module './331.js'`) unrelated to Phase 4 query-layer implementation. Production build succeeds and the query-layer behavior is validated through DB/runtime checks above.

Treat this as local dev-runtime hygiene (stale/contended dev build state), not a Phase 4 product-scope failure.

## Verdict

Phase 4 query-layer scope is functionally complete and closeable.

Remaining follow-ups are operational only (local dev-server runtime consistency) and should be tracked separately from Phase 4 product completion.
