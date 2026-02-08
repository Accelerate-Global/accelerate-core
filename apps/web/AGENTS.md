# apps/web

## Purpose
Next.js web app (App Router) intended to deploy on Firebase App Hosting for V1.

## What Lives Here / What Must Not
Lives here:
- UI routes and components
- Firebase Web SDK client initialization (Auth placeholder)
- API client helpers calling `apps/api` via `NEXT_PUBLIC_API_BASE_URL`

Must not live here:
- Secrets (API keys not intended for client, service accounts)
- Server-side privileged operations (those belong in API/Worker)

## How To Run / Test
- Dev: `pnpm --filter @accelerate-core/web run dev`
- Build: `pnpm --filter @accelerate-core/web run build`
- Typecheck: `pnpm --filter @accelerate-core/web run typecheck`
- Lint: `pnpm --filter @accelerate-core/web run lint`

## Key Files
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/connectors/page.tsx`
- `apps/web/src/app/datasets/page.tsx`
- `apps/web/src/app/runs/[runId]/page.tsx`
- `apps/web/src/lib/firebase/client.ts` (Firebase client placeholder)
- `apps/web/src/lib/auth/AuthProvider.tsx` (Auth wiring placeholder)

## Interfaces / Contracts
Routes (placeholders):
- `/connectors`
- `/datasets`
- `/runs/[runId]`

Admin allowlist (V1 internal-only):
- Web may hide admin actions using `NEXT_PUBLIC_ALLOWED_ADMIN_EMAILS`.
- **This is not enforcement.** API/Worker must enforce allowlist via `ALLOWED_ADMIN_EMAILS`.

## Security Notes (Secrets, Authz)
Secrets:
- Do not commit secrets.
- Firebase client config uses `NEXT_PUBLIC_*` vars and is not treated as secret.

Authz:
- Treat UI gating as convenience only. Do not rely on it for protection.

