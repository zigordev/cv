#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage:
  $0 \
    --release-dir <path> \
    --region <aws-region> \
    --app-ssm-prefix </cv/prod/app> \
    --web-image <ecr-uri:tag> \
    --release-tag <tag>
USAGE
}

RELEASE_DIR=""
AWS_REGION=""
APP_SSM_PREFIX=""
WEB_IMAGE=""
RELEASE_TAG=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --release-dir) RELEASE_DIR="$2"; shift 2 ;;
    --region) AWS_REGION="$2"; shift 2 ;;
    --app-ssm-prefix) APP_SSM_PREFIX="$2"; shift 2 ;;
    --web-image) WEB_IMAGE="$2"; shift 2 ;;
    --release-tag) RELEASE_TAG="$2"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1 ;;
  esac
done

for cmd in aws jq docker curl; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "Missing command: $cmd" >&2; exit 1; }
done

run_compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
    return
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
    return
  fi

  echo "Missing compose runtime (tried 'docker compose' and 'docker-compose')" >&2
  exit 1
}

[ -n "$RELEASE_DIR" ] || { echo "Missing --release-dir" >&2; exit 1; }
[ -n "$AWS_REGION" ] || { echo "Missing --region" >&2; exit 1; }
[ -n "$APP_SSM_PREFIX" ] || { echo "Missing --app-ssm-prefix" >&2; exit 1; }
[ -n "$WEB_IMAGE" ] || { echo "Missing --web-image" >&2; exit 1; }
[ -n "$RELEASE_TAG" ] || { echo "Missing --release-tag" >&2; exit 1; }
[ -d "$RELEASE_DIR" ] || { echo "Release dir not found: $RELEASE_DIR" >&2; exit 1; }

cd "$RELEASE_DIR"

APP_BASE_ENV_FILE="docker/.env.app.prod"
APP_ENV_FILE="$(mktemp /tmp/cv-app-env.XXXXXX)"
trap 'rm -f "$APP_ENV_FILE"' EXIT
OPENBAO_LOCAL_ADDR="http://127.0.0.1:8200"
OPENBAO_KV_MOUNT="kv"
OPENBAO_SECRET_PATH="cv"

[ -f "$APP_BASE_ENV_FILE" ] || { echo "Missing base env file in bundle: $APP_BASE_ENV_FILE" >&2; exit 1; }
cp "$APP_BASE_ENV_FILE" "$APP_ENV_FILE"
chmod 600 "$APP_ENV_FILE"

read_env_var() {
  local file="$1"
  local key="$2"
  grep -E "^${key}=" "$file" | tail -n1 | cut -d'=' -f2- || true
}

require_env_var_in_file() {
  local file="$1"
  local key="$2"
  local value
  value="$(read_env_var "$file" "$key")"
  if [ -z "$value" ]; then
    echo "Missing required non-secret value '$key' in $file" >&2
    exit 1
  fi
}

upsert_env_var() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp
  tmp="$(mktemp)"
  awk -v key="$key" -v value="$value" -F= '
    BEGIN { updated=0 }
    $1 == key { print key "=" value; updated=1; next }
    { print }
    END { if (!updated) print key "=" value }
  ' "$file" > "$tmp"
  mv "$tmp" "$file"
}

fetch_ssm_secret_value() {
  local parameter_name="$1"
  aws ssm get-parameter \
    --region "$AWS_REGION" \
    --name "$parameter_name" \
    --with-decryption \
    --query 'Parameter.Value' \
    --output text
}

required_non_secret_keys=(
  TOLGEE_PROJECT_ID
  NOTIFICATIONS_KAFKA_BROKERS
  NOTIFICATIONS_EMAIL_TOPIC
)

for key in "${required_non_secret_keys[@]}"; do
  require_env_var_in_file "$APP_ENV_FILE" "$key"
done

openbao_token="$(fetch_ssm_secret_value "${APP_SSM_PREFIX%/}/OPENBAO_TOKEN")"
upsert_env_var "$APP_ENV_FILE" "OPENBAO_TOKEN" "$openbao_token"
upsert_env_var "$APP_ENV_FILE" "CV_WEB_IMAGE" "$WEB_IMAGE"
upsert_env_var "$APP_ENV_FILE" "NEXT_PUBLIC_RELEASE" "$RELEASE_TAG"

docker network create "platform_ops_shared" >/dev/null 2>&1 || true

echo "[deploy] Waiting for OpenBao health"
openbao_code=""
for _ in $(seq 1 60); do
  openbao_code="$(curl -s -o /dev/null -w '%{http_code}' "$OPENBAO_LOCAL_ADDR/v1/sys/health" || true)"
  if [ "$openbao_code" = "200" ] || [ "$openbao_code" = "429" ]; then
    break
  fi
  if [ "$openbao_code" = "501" ] || [ "$openbao_code" = "503" ]; then
    echo "[deploy] OpenBao health is $openbao_code (not initialized or sealed)." >&2
    break
  fi
  sleep 2
done

if [ "$openbao_code" != "200" ] && [ "$openbao_code" != "429" ]; then
  echo "OpenBao did not become ready (last_health_code=$openbao_code)." >&2
  exit 1
fi

openbao_secret_url="${OPENBAO_LOCAL_ADDR}/v1/${OPENBAO_KV_MOUNT}/data/${OPENBAO_SECRET_PATH}"
openbao_secret_body_file="$(mktemp)"
openbao_secret_code="$(curl -s -o "$openbao_secret_body_file" -w '%{http_code}' -H "X-Vault-Token: $openbao_token" "$openbao_secret_url" || true)"
if [ "$openbao_secret_code" != "200" ]; then
  echo "Failed to read OpenBao secret ${OPENBAO_KV_MOUNT}/${OPENBAO_SECRET_PATH} with OPENBAO_TOKEN (status=$openbao_secret_code)" >&2
  cat "$openbao_secret_body_file" >&2 || true
  rm -f "$openbao_secret_body_file"
  exit 1
fi

for key in TOLGEE_API_KEY CONTACT_RECIPIENT_EMAIL UNLEASH_TOKEN; do
  if [ -z "$(jq -r --arg k "$key" '.data.data[$k] // ""' "$openbao_secret_body_file")" ]; then
    echo "OpenBao secret ${OPENBAO_KV_MOUNT}/${OPENBAO_SECRET_PATH} is missing required key: $key" >&2
    rm -f "$openbao_secret_body_file"
    exit 1
  fi
done
rm -f "$openbao_secret_body_file"

is_ecr_registry() {
  local registry="$1"
  [[ "$registry" == *".dkr.ecr."*".amazonaws.com"* ]]
}

login_ecr_for_image() {
  local image="$1"
  local registry
  local registry_region

  registry="${image%%/*}"

  if [ -z "$registry" ] || [ "$registry" = "$image" ]; then
    return 0
  fi

  if ! is_ecr_registry "$registry"; then
    return 0
  fi

  registry_region="$(printf '%s' "$registry" | awk -F'.' '{print $4}')"
  if [ -z "$registry_region" ]; then
    registry_region="$AWS_REGION"
  fi

  echo "[deploy] Logging into ECR registry: $registry (region=$registry_region)"
  aws ecr get-login-password --region "$registry_region" | docker login --username AWS --password-stdin "$registry" >/dev/null
}

login_ecr_for_image "$WEB_IMAGE"

run_compose --env-file "$APP_ENV_FILE" -f docker/compose.app.prod.yml up -d --remove-orphans

web_ready=false
for _ in $(seq 1 60); do
  if run_compose --env-file "$APP_ENV_FILE" -f docker/compose.app.prod.yml exec -T \
    cv_web wget -qO- http://127.0.0.1:3001/health >/dev/null 2>&1; then
    web_ready=true
    break
  fi
  sleep 2
done

if [ "$web_ready" != "true" ]; then
  echo "cv web did not become ready after deployment." >&2
  run_compose --env-file "$APP_ENV_FILE" -f docker/compose.app.prod.yml ps >&2 || true
  run_compose --env-file "$APP_ENV_FILE" -f docker/compose.app.prod.yml logs --no-color cv_web >&2 || true
  exit 1
fi

run_compose --env-file "$APP_ENV_FILE" -f docker/compose.app.prod.yml ps
echo "[deploy] cv web is ready."
