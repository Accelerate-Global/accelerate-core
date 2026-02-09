#!/usr/bin/env sh
set -eu

mode="${SERVICE_MODE:-}"
if [ "$mode" = "api" ]; then
  exec node /workspace/apps/api/dist/index.js
fi

if [ "$mode" = "worker" ]; then
  exec node /workspace/apps/worker/dist/index.js
fi

cat >&2 <<'EOF'
ERROR: Missing/invalid SERVICE_MODE.

Set SERVICE_MODE=api    to run the HTTP API (apps/api)
Set SERVICE_MODE=worker to run the worker service (apps/worker)
EOF

exit 1

