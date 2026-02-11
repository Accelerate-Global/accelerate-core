# accelerate-core

## Purpose
V1 monorepo for Accelerate Global core services:
- `apps/web`: Next.js (Firebase App Hosting)
- `apps/api`: HTTP API (Cloud Run)
- `apps/worker`: sequential pipeline runner (Cloud Run)
- `packages/*`: shared libraries (types, Firestore DAL, BigQuery helpers, connector framework)
- `infra/firebase`: Firebase config/rules/indexes placeholders

## AGENTS.md Policy (Mandatory)
- Each folder's `AGENTS.md` is the source of truth for that folder.
- **Never modify any `AGENTS.md` unless behavior, contracts, run/test steps, deploy flow, or security posture meaningfully changes in that folder.**
  - Do not do formatting-only edits.
  - Do not add "last updated" notes.

## What Lives Here / What Must Not
Lives here:
- Product code, infrastructure placeholders, and shared libraries.

Must not live here:
- Secrets or credentials (API keys, service account JSON, private keys).
- Any hardcoded admin emails.

## How To Run / Test
Prereqs: Node.js 18+ and `pnpm`.

Commands:
- Install: `pnpm install`
- Build: `pnpm run build`
- Typecheck: `pnpm run typecheck`
- Lint: `pnpm run lint`
- Test (placeholder): `pnpm run test`
- Dev (all packages with `dev`): `pnpm run dev`

To run a single package:
- `pnpm --filter @accelerate-core/api run dev`
- `pnpm --filter @accelerate-core/worker run dev`
- `pnpm --filter @accelerate-core/web run dev`

## Key Files
- `package.json`: root scripts delegate to Turborepo (`turbo run ...`)
- `pnpm-workspace.yaml`: workspace package globs
- `turbo.json`: build/lint/typecheck/test/dev task graph
- `tsconfig.base.json`: shared TypeScript defaults
- `infra/firebase/`: Firebase placeholders (rules/indexes/config)

## Interfaces / Contracts
- Admin allowlist (V1 internal-only):
  - API/Worker enforce allowlist by exact email via `ALLOWED_ADMIN_EMAILS="a@b.com,c@d.com"`.
  - Web may hide admin UI when not allowlisted, but **API/Worker are the enforcement point**.
- Identifiers (do not change):
  - GCP Project ID: `accelerate-global-473318`
  - Firebase project: `accelerate-global-473318`
  - BigQuery dataset: `accelerate_dev`
  - First dataset slug: `pgic_people_groups`

## Security Notes
- Do not commit secrets. Deployment pulls secrets from Secret Manager (or equivalent) into env vars.
- Connector secrets must be provided via env vars at deploy time (example: `JOSHUA_PROJECT_API_KEY`).

## Deploy Flow (Mandatory)
- For every code change session, complete this sequence before handoff:
  - Run relevant tests/checks for touched packages.
  - Commit code to a feature branch and open a PR.
  - Merge PR to `main`.
  - Return local repo to `main`.
  - Clean up merged branches (local + remote).
  - Redeploy Firebase App Hosting.
- After every merged PR, immediately redeploy the web app on Firebase App Hosting.
- Command:
  - `firebase apphosting:rollouts:create accelerate-core --project accelerate-global-473318 --git-branch main --force`
- After merge and deploy, clean up branches:
  - Fetch/prune refs: `git fetch --prune`
  - Delete merged local branch: `git branch -d <branch-name>`
  - Delete merged remote branch: `git push origin --delete <branch-name>`

## Docs Index (Placeholders)
- Firebase config/rules/indexes: `infra/firebase/`
- Cloud Run service scaffolds: `apps/api/`, `apps/worker/`
