# Accelerate Core Overview

Accelerate Core is a V1 monorepo for an internal ingestion control plane.

## Services
- `apps/web`: Next.js admin UI on Firebase App Hosting.
- `apps/api`: Fastify HTTP API on Cloud Run.
- `apps/worker`: sequential runner service on Cloud Run.
- `packages/shared`: shared constants/types/contracts.
- `packages/firestore`: Firestore data access layer and run logging helpers.
- `packages/bq`: BigQuery helpers for preview and loads.
- `packages/connectors`: connector framework + registry.
- `packages/connectors/joshuaproject`: current connector implementation.
- `infra/firebase`: Firebase config/rules/index placeholders.

## Core Data Flow
1. Web calls API via Next route handlers under `apps/web/src/app/api`.
2. API creates/updates run state in Firestore and triggers worker.
3. Worker runs connector, stores artifacts in GCS, loads BigQuery versioned tables, and finalizes run state.
4. Web reads run status/logs and resource snapshots through API proxies.

## Immutable Identifiers (Do Not Change)
- GCP project: `accelerate-global-473318`
- Firebase project: `accelerate-global-473318`
- BigQuery dataset (default): `accelerate_dev`
- First dataset slug: `pgic_people_groups`

## Source of Truth
- Folder-level `AGENTS.md` files define local policy/commands/contracts.
- Root `AGENTS.md` defines repo-wide policy and the compressed retriever index.
