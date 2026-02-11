# apps/web

## Purpose
Next.js web app (App Router) intended to deploy on Firebase App Hosting for V1.

## What Lives Here / What Must Not
Lives here:
- UI routes and components
- Firebase Web SDK client initialization (Auth placeholder)
- Server-side API proxy routes under `src/app/api/*` (forward to `apps/api`)

Must not live here:
- Secrets (API keys not intended for client, service accounts)
- Server-side privileged operations (those belong in API/Worker)

## How To Run / Test
- Dev: `pnpm --filter @accelerate-core/web run dev`
- Build: `pnpm --filter @accelerate-core/web run build`
- Typecheck: `pnpm --filter @accelerate-core/web run typecheck`
- Lint: `pnpm --filter @accelerate-core/web run lint`
- Test: `pnpm --filter @accelerate-core/web run test`

Runtime config:
- Firebase client config is provided via `NEXT_PUBLIC_FIREBASE_*`.
- In Firebase App Hosting, these are sourced via `apps/web/apphosting.yaml`.

## Key Files
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/_components/AppFrame.tsx` (app chrome: topbar + sidebar + section subnav)
- `apps/web/src/app/_components/Page.tsx` (page title + description template)
- `apps/web/src/app/connectors/page.tsx`
- `apps/web/src/app/connectors/joshuaproject/page.tsx` (run JP connector; embeds run details)
- `apps/web/src/app/datasets/page.tsx`
- `apps/web/src/app/datasets/pgic_people_groups/page.tsx` (dataset preview)
- `apps/web/src/app/resources/page.tsx` (Resources overview)
- `apps/web/src/app/resources/tables/page.tsx` (resource list + create form)
- `apps/web/src/app/resources/tables/[resourceSlug]/page.tsx` (current version editor)
- `apps/web/src/app/resources/tables/[resourceSlug]/versions/page.tsx` (version history + restore)
- `apps/web/src/app/resources/tables/[resourceSlug]/versions/[versionId]/page.tsx` (read-only snapshot)
- `apps/web/src/app/resources/_components/resource-table-editor.tsx` (TanStack editable table UI)
- `apps/web/src/app/runs/page.tsx` (runs list)
- `apps/web/src/app/runs/[runId]/page.tsx`
- `apps/web/src/app/api/query/route.ts` (proxy to API `/query`)
- `apps/web/src/app/api/runs/route.ts` (proxy to API `/runs`)
- `apps/web/src/app/api/runs/[runId]/route.ts` (proxy to API `/runs/:id`)
- `apps/web/src/app/api/runs/[runId]/cancel/route.ts` (proxy to API `/runs/:id/cancel`)
- `apps/web/src/app/api/runs/[runId]/logs/route.ts` (proxy to API `/runs/:id/logs`)
- `apps/web/src/app/api/runs/[runId]/raw/route.ts` (converts API NDJSON artifact stream to CSV download)
- `apps/web/src/app/api/resources/route.ts` (proxy to API `/resources`)
- `apps/web/src/app/api/resources/[resourceSlug]/route.ts` (proxy to API `/resources/:slug`)
- `apps/web/src/app/api/resources/[resourceSlug]/upload/route.ts` (accepts multipart CSV from browser and proxies to API upload)
- `apps/web/src/app/api/resources/[resourceSlug]/preview/route.ts` (proxy to API preview pagination)
- `apps/web/src/app/api/resources/[resourceSlug]/versions/route.ts` (proxy to API `/resources/:resourceId/versions`)
- `apps/web/src/app/api/resources/[resourceSlug]/versions/[versionId]/route.ts` (proxy to API `/resources/:resourceId/versions/:versionId`)
- `apps/web/src/app/api/resources/[resourceSlug]/versions/[versionId]/restore/route.ts` (proxy to API restore)
- `apps/web/src/app/api/resources/[resourceSlug]/current/route.ts` (proxy to API set current version)
- `apps/web/src/app/api/resources/[resourceSlug]/data/route.ts` (proxy to API save edited data)
- `apps/web/src/lib/firebase/client.ts` (Firebase client placeholder)
- `apps/web/src/lib/auth/AuthProvider.tsx` (Auth wiring placeholder)
- `apps/web/src/lib/auth/AuthControls.tsx` (Google sign-in/out UI)
- `apps/web/apphosting.yaml` (App Hosting env/secrets mapping)

## Interfaces / Contracts
Routes (placeholders):
- `/connectors`
- `/connectors/joshuaproject`
- `/datasets`
- `/datasets/pgic_people_groups`
- `/runs`
- `/runs/[runId]`
- `/resources`
- `/resources/tables`
- `/resources/tables/[resourceSlug]`
- `/resources/tables/[resourceSlug]/versions`
- `/resources/tables/[resourceSlug]/versions/[versionId]`
- Resource detail page supports CSV multipart upload with progress + paginated preview table.

API proxy routes (server-side):
- `/api/query` forwards to `${API_BASE_URL || NEXT_PUBLIC_API_BASE_URL}/query` (returns `{ rows }`)
- `/api/runs` forwards to `${API_BASE_URL || NEXT_PUBLIC_API_BASE_URL}/runs`
- `/api/runs/[runId]` forwards to `${API_BASE_URL || NEXT_PUBLIC_API_BASE_URL}/runs/:id`
- `/api/runs/[runId]/cancel` forwards to `${API_BASE_URL || NEXT_PUBLIC_API_BASE_URL}/runs/:id/cancel`
- `/api/runs/[runId]/logs` forwards to `${API_BASE_URL || NEXT_PUBLIC_API_BASE_URL}/runs/:id/logs` (returns `{ logs }`)
- `/api/runs/[runId]/raw` fetches `${API_BASE_URL || NEXT_PUBLIC_API_BASE_URL}/runs/:id/raw`, converts NDJSON to CSV, and streams `text/csv` download
- `/api/resources` forwards to `${API_BASE_URL || NEXT_PUBLIC_API_BASE_URL}/resources`
- `/api/resources/[resourceSlug]` forwards to `${API_BASE_URL || NEXT_PUBLIC_API_BASE_URL}/resources/:resourceId`
- `/api/resources/[resourceSlug]/upload` accepts multipart CSV uploads and forwards JSON `{ csvText, fileName }` to `${API_BASE_URL || NEXT_PUBLIC_API_BASE_URL}/resources/:resourceId/upload`
- `/api/resources/[resourceSlug]/preview` forwards to `${API_BASE_URL || NEXT_PUBLIC_API_BASE_URL}/resources/:resourceId/preview`
- `/api/resources/[resourceSlug]/versions` forwards to `${API_BASE_URL || NEXT_PUBLIC_API_BASE_URL}/resources/:resourceId/versions`
- `/api/resources/[resourceSlug]/versions/[versionId]` forwards to `${API_BASE_URL || NEXT_PUBLIC_API_BASE_URL}/resources/:resourceId/versions/:versionId`
- `/api/resources/[resourceSlug]/versions/[versionId]/restore` forwards to `${API_BASE_URL || NEXT_PUBLIC_API_BASE_URL}/resources/:resourceId/versions/:versionId/restore`
- `/api/resources/[resourceSlug]/current` forwards to `${API_BASE_URL || NEXT_PUBLIC_API_BASE_URL}/resources/:resourceId/current`
- `/api/resources/[resourceSlug]/data` forwards to `${API_BASE_URL || NEXT_PUBLIC_API_BASE_URL}/resources/:resourceId/data`
- Requests forward `Authorization: Bearer <Firebase ID token>` from the browser to the API.

Admin allowlist (V1 internal-only):
- Web may hide admin actions using `NEXT_PUBLIC_ALLOWED_ADMIN_EMAILS`.
- **This is not enforcement.** API/Worker must enforce allowlist via `ALLOWED_ADMIN_EMAILS`.

## Security Notes (Secrets, Authz)
Secrets:
- Do not commit secrets.
- Firebase client config uses `NEXT_PUBLIC_*` vars and is not treated as secret.

Authz:
- Treat UI gating as convenience only. Do not rely on it for protection.
