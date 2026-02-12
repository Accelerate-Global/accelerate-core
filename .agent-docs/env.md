# Environment Variables

This repo expects environment variables to be provided by deploy-time configuration (Secret Manager or service config), not hardcoded in source.

## Authorization / Access Control
- `ALLOWED_ADMIN_EMAILS`: comma-separated exact emails enforced by API/Worker. Missing/empty should be treated as fail-closed for privileged endpoints.
- `NEXT_PUBLIC_ALLOWED_ADMIN_EMAILS`: web-only UI gating hint; not enforcement.
- `DEV_AUTH_EMAIL`: local/dev bypass identity for non-production runs.
- `WORKER_AUTH_MODE`: worker auth mode (`iam` default, optional `firebase`).

## Service Wiring
- `API_BASE_URL`: preferred server-side base URL for web proxy routes.
- `NEXT_PUBLIC_API_BASE_URL`: fallback API base URL.
- `WORKER_BASE_URL`: API target URL for worker trigger endpoint.
- `PORT`, `HOST`: runtime server bind values.

## GCP / Data Plane
- `GOOGLE_CLOUD_PROJECT`: project id override for runtime clients.
- `BIGQUERY_DATASET`: BigQuery dataset override (default falls back to shared constant).
- `BIGQUERY_LOCATION`: BigQuery location (default `US`).
- `ARTIFACTS_BUCKET`: GCS bucket for run artifacts.

## Firebase Web Config
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## Connector Variables
- `JOSHUA_PROJECT_API_KEY`: required connector secret.
- `JOSHUA_PROJECT_BASE_URL`: optional connector endpoint override.
- `JOSHUA_PROJECT_LIMIT`: optional record limit override.

## Gotchas
- Never commit real values for secret-bearing variables.
- Web allowlist vars do not authorize backend actions.
- Keep env defaults aligned with shared constants in `packages/shared/src/index.ts`.
