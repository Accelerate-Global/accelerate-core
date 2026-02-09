# syntax=docker/dockerfile:1.6
#
# Cloud Run build for `apps/api` and `apps/worker`.
# We ship a single image and choose which service to run via `SERVICE_MODE`.
#
# - SERVICE_MODE=api    -> starts `apps/api`
# - SERVICE_MODE=worker -> starts `apps/worker`
#
# This avoids duplicating Dockerfiles while still allowing separate Cloud Run
# services with different env/IAM/concurrency settings.

FROM node:22-slim AS builder

WORKDIR /workspace

# Pin pnpm via corepack to match `package.json#packageManager`.
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate

COPY . .

RUN pnpm install --frozen-lockfile

# Build only what Cloud Run needs (API + worker + their deps).
RUN pnpm turbo run build --filter=@accelerate-core/api... --filter=@accelerate-core/worker...

# Remove devDependencies for smaller runtime image.
RUN pnpm prune --prod

FROM node:22-slim AS runner

WORKDIR /workspace

COPY --from=builder /workspace /workspace

ENV NODE_ENV=production

RUN chmod +x /workspace/docker-entrypoint.sh

CMD ["/workspace/docker-entrypoint.sh"]

