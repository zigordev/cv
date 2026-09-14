APP_LABEL="cv web"
APP_ENV_FILE="docker/.env.app.local"
APP_ENV_EXAMPLE_FILE="docker/.env.app.local.example"
COMPOSE_FILES=(docker/compose.app.local.yml)
DEV_COMPOSE_FILES=(docker/compose.app.dev.yml)

OPENBAO_SECRET_PATH="cv"
OPENBAO_REQUIRED_KEYS="TOLGEE_API_KEY,CONTACT_RECIPIENT_EMAIL"
OPENBAO_RUN="scripts/openbao-run.mjs"

TOLGEE_SYNC="pull"
TOLGEE_WORKSPACE="@cv/web"

RESET_MODE="rebuild"
READY_MESSAGE="cv web started."
READY_URLS=("http://localhost:3021")
