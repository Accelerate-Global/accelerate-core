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
- `apps/web/src/app/runs/page.tsx` (runs list)
- `apps/web/src/app/runs/[runId]/page.tsx`
- `apps/web/src/app/api/query/route.ts` (proxy to API `/query`)
- `apps/web/src/app/api/runs/route.ts` (proxy to API `/runs`)
- `apps/web/src/app/api/runs/[runId]/route.ts` (proxy to API `/runs/:id`)
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

API proxy routes (server-side):
- `/api/query` forwards to `${API_BASE_URL || NEXT_PUBLIC_API_BASE_URL}/query` (returns `{ rows }`)
- `/api/runs` forwards to `${API_BASE_URL || NEXT_PUBLIC_API_BASE_URL}/runs`
- `/api/runs/[runId]` forwards to `${API_BASE_URL || NEXT_PUBLIC_API_BASE_URL}/runs/:id`
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
