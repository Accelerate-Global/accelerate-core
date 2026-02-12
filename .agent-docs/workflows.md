# Key Workflows

## Development Workflow
1. Install dependencies: `pnpm install`
2. Implement changes in the relevant package/app.
3. Run checks for touched areas: `pnpm run lint`, `pnpm run typecheck`, targeted tests, then `pnpm run test`.
4. Update agent docs when behavior/contracts/workflows change.
5. Regenerate the AGENTS index: `npm run agents:index` (or `pnpm run agents:index`).
6. Validate index freshness: `npm run agents:check`.

## Release Workflow (Mandatory)
1. Commit changes to a feature branch.
2. Push branch and open a PR.
3. Merge PR to `main`.
4. Return local repo to `main`.
5. Clean merged branches:
- `git fetch --prune`
- `git branch -d <branch-name>`
- `git push origin --delete <branch-name>`
6. Confirm GitHub Actions web deploy completed.

## Run Execution Flow
1. API creates run (`queued`) and writes initial log.
2. API triggers worker run endpoint.
3. Worker acquires run lease and marks run `running`.
4. Worker executes connector and writes raw artifacts.
5. Worker loads BigQuery versioned table and records dataset version.
6. Worker marks run `succeeded` or `failed`; UI reads logs/status through API.

## Resource Table Versioning Flow
1. CSV upload/edit/restore creates a new resource version snapshot.
2. Prior versions remain readable.
3. Current version can be switched by restore operations.
