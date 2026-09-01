#!/usr/bin/env bash
set -euo pipefail

# No volumes to drop — the CV app is stateless. This just forces a clean
# rebuild so a stale image cannot mask a broken build.
docker compose --env-file docker/.env.app.local -f docker/compose.app.local.yml down --remove-orphans
docker compose --env-file docker/.env.app.local -f docker/compose.app.local.yml build --no-cache
bash ./scripts/local-stack-up.sh
