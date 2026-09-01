#!/usr/bin/env bash
set -euo pipefail

# Brings up the CV web container on the shared platform-ops network. There is
# no database and no API here, so this is the gpool script minus the Postgres
# bootstrap: verify OpenBao is reachable and holds our keys, pull translations,
# then compose up.

APP_ENV_FILE="docker/.env.app.local"
APP_ENV_EXAMPLE_FILE="docker/.env.app.local.example"
OPENBAO_LOCAL_ADDR="http://localhost:8200"
SHARED_NETWORK="platform_ops_shared"
OPENBAO_KV_MOUNT="kv"
OPENBAO_SECRET_PATH="cv"
OPENBAO_REQUIRED_KEYS="TOLGEE_API_KEY,CONTACT_RECIPIENT_EMAIL"
TOLGEE_LOCAL_ADDR="http://localhost:8090"

read_env_var_from_file() {
  local file="$1" key="$2" line
  line="$(grep -E "^${key}=" "$file" | tail -n1 || true)"
  printf '%s' "${line#*=}"
}

if [ ! -f "$APP_ENV_FILE" ]; then
  if [ ! -f "$APP_ENV_EXAMPLE_FILE" ]; then
    echo "Missing $APP_ENV_FILE and $APP_ENV_EXAMPLE_FILE." >&2
    exit 1
  fi
  cp "$APP_ENV_EXAMPLE_FILE" "$APP_ENV_FILE"
  echo "Created $APP_ENV_FILE from $APP_ENV_EXAMPLE_FILE — fill it in and rerun."
  exit 1
fi

docker network create "$SHARED_NETWORK" >/dev/null 2>&1 || true

openbao_token="$(read_env_var_from_file "$APP_ENV_FILE" "OPENBAO_TOKEN")"
if [ -z "$openbao_token" ]; then
  echo "OPENBAO_TOKEN is required in $APP_ENV_FILE" >&2
  exit 1
fi

echo "Waiting for OpenBao to become ready..."
i=1
openbao_code=""
while [ $i -le 60 ]; do
  openbao_code="$(curl -s -o /dev/null -w '%{http_code}' "$OPENBAO_LOCAL_ADDR/v1/sys/health" || true)"
  case "$openbao_code" in
    200|429|472|473) break ;;
    501)
      echo "OpenBao is uninitialized. Initialize/unseal it from platform-ops first." >&2
      exit 1
      ;;
    503)
      echo "OpenBao is sealed. Unseal it from platform-ops first." >&2
      exit 1
      ;;
  esac
  sleep 2
  i=$((i + 1))
done

if [ $i -gt 60 ]; then
  echo "OpenBao did not become ready. Start the platform-ops local stack first." >&2
  exit 1
fi
echo "OpenBao is ready"

secret_url="$OPENBAO_LOCAL_ADDR/v1/${OPENBAO_KV_MOUNT}/data/${OPENBAO_SECRET_PATH}"
secret_body_file="$(mktemp)"
trap 'rm -f "$secret_body_file"' EXIT

secret_code="$(curl -s -o "$secret_body_file" -w '%{http_code}' -H "X-Vault-Token: $openbao_token" "$secret_url" || true)"
if [ "$secret_code" != "200" ]; then
  echo "OpenBao path ${OPENBAO_KV_MOUNT}/${OPENBAO_SECRET_PATH} is not readable (status=$secret_code)" >&2
  cat "$secret_body_file" >&2 || true
  exit 1
fi

REQUIRED_KEYS="$OPENBAO_REQUIRED_KEYS" SECRET_BODY_FILE="$secret_body_file" node -e '
const fs = require("node:fs");
const required = process.env.REQUIRED_KEYS.split(",").map((k) => k.trim()).filter(Boolean);
const payload = JSON.parse(fs.readFileSync(process.env.SECRET_BODY_FILE, "utf8"));
const data = payload?.data?.data;
if (!data || typeof data !== "object" || Array.isArray(data)) {
  console.error("OpenBao payload does not contain a kv-v2 data.data object");
  process.exit(1);
}
const missing = required.filter((key) => String(data[key] ?? "").trim().length === 0);
if (missing.length > 0) {
  console.error(`OpenBao secret path is missing required keys: ${missing.join(", ")}`);
  process.exit(1);
}
'

tolgee_project_id="$(read_env_var_from_file "$APP_ENV_FILE" "TOLGEE_PROJECT_ID")"
if [ -n "$tolgee_project_id" ]; then
  echo "Pulling Tolgee snapshots for local messages..."
  OPENBAO_ADDR="$OPENBAO_LOCAL_ADDR" \
  OPENBAO_TOKEN="$openbao_token" \
  OPENBAO_KV_MOUNT="$OPENBAO_KV_MOUNT" \
  OPENBAO_SECRET_PATH="$OPENBAO_SECRET_PATH" \
  OPENBAO_REQUIRED_KEYS="TOLGEE_API_KEY" \
  TOLGEE_API_URL="$TOLGEE_LOCAL_ADDR" \
  TOLGEE_PROJECT_ID="$tolgee_project_id" \
    node scripts/openbao-run.mjs -- npm run i18n:pull -w @cv/web
fi

docker compose --env-file "$APP_ENV_FILE" -f docker/compose.app.local.yml \
  up -d --build --force-recreate --remove-orphans

echo "CV web started on http://localhost:3021"
