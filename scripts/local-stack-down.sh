#!/usr/bin/env bash
set -euo pipefail

docker compose --env-file docker/.env.app.local -f docker/compose.app.local.yml down "$@"
