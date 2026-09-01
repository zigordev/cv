#!/usr/bin/env bash
set -euo pipefail

# Pushes the committed message files to Tolgee.
#
# The Tolgee CLI reads its credentials from tolgee.config.cjs, which requires
# TOLGEE_API_URL, TOLGEE_API_KEY and TOLGEE_PROJECT_ID in the environment. The
# API key is not on disk — it lives in OpenBao at kv/cv — so running the
# workspace script directly can only work if all three are exported by hand,
# and fails with a misleading "Can't open config file" when they are not (the
# config throws while the CLI is requiring it).
#
# This is the pull invocation from local-stack-up.sh with the direction
# reversed, so push has the same one-command path that pull already had.
#
# Note the workspace script pushes with --force-mode OVERRIDE: Tolgee's copy of
# every key here is replaced by what is committed. That is the right direction
# for keys added in code, and the wrong one if someone has been editing in the
# Tolgee UI — pull first if in doubt.

APP_ENV_FILE="docker/.env.app.local"
OPENBAO_LOCAL_ADDR="http://localhost:8200"
OPENBAO_KV_MOUNT="kv"
OPENBAO_SECRET_PATH="cv"
TOLGEE_LOCAL_ADDR="http://localhost:8090"

read_env_var_from_file() {
  local file="$1" key="$2" line
  line="$(grep -E "^${key}=" "$file" | tail -n1 || true)"
  printf '%s' "${line#*=}"
}

if [ ! -f "$APP_ENV_FILE" ]; then
  echo "Missing $APP_ENV_FILE — run 'npm run local:up' first to create it." >&2
  exit 1
fi

openbao_token="$(read_env_var_from_file "$APP_ENV_FILE" "OPENBAO_TOKEN")"
if [ -z "$openbao_token" ]; then
  echo "OPENBAO_TOKEN is required in $APP_ENV_FILE" >&2
  exit 1
fi

tolgee_project_id="$(read_env_var_from_file "$APP_ENV_FILE" "TOLGEE_PROJECT_ID")"
if [ -z "$tolgee_project_id" ]; then
  echo "TOLGEE_PROJECT_ID is required in $APP_ENV_FILE" >&2
  exit 1
fi

tolgee_code="$(curl -s -o /dev/null -w '%{http_code}' "$TOLGEE_LOCAL_ADDR/api/public/configuration" || true)"
if [ "$tolgee_code" != "200" ]; then
  echo "Tolgee is not answering on $TOLGEE_LOCAL_ADDR (status=${tolgee_code:-none})." >&2
  echo "Start the platform-ops stack first." >&2
  exit 1
fi

echo "Pushing local messages to Tolgee project $tolgee_project_id..."
OPENBAO_ADDR="$OPENBAO_LOCAL_ADDR" \
OPENBAO_TOKEN="$openbao_token" \
OPENBAO_KV_MOUNT="$OPENBAO_KV_MOUNT" \
OPENBAO_SECRET_PATH="$OPENBAO_SECRET_PATH" \
OPENBAO_REQUIRED_KEYS="TOLGEE_API_KEY" \
TOLGEE_API_URL="$TOLGEE_LOCAL_ADDR" \
TOLGEE_PROJECT_ID="$tolgee_project_id" \
  node scripts/openbao-run.mjs -- npm run i18n:push -w @cv/web
