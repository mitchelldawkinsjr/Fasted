#!/usr/bin/env bash
# Deploy fasted-calendar to a VPS (manual / CI helper).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE="${VPS_REMOTE:?Set VPS_REMOTE to user@host}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/apps/fasted-calendar}"
SUPABASE_DIR="${SUPABASE_DIR:-/opt/apps/supabase}"
GA_MEASUREMENT_ID="${VITE_GA_MEASUREMENT_ID:-G-BHRDQXDTBH}"
APP_PORT="${APP_PUBLISH_PORT:-8022}"
NETWORK="${DOCKER_NETWORK:-fasted-network}"

echo "Deploying to ${REMOTE}:${DEPLOY_DIR}"

ssh "$REMOTE" "mkdir -p ${DEPLOY_DIR} && docker network ls --format '{{.Name}}' | grep -q '^${NETWORK}\$' || docker network create ${NETWORK}"

rsync -avz --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'docker/pb_data' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude 'dist' \
  --exclude 'e2e/overflow-screenshots' \
  --exclude 'e2e/tour-screenshots' \
  --exclude 'test-results' \
  "$ROOT/" "${REMOTE}:${DEPLOY_DIR}/"

ssh "$REMOTE" "
  set -e
  cd '${DEPLOY_DIR}'

  ANON_KEY=\$(grep '^ANON_KEY=' '${SUPABASE_DIR}/.env' | cut -d= -f2-)
  API_URL=\$(grep '^API_EXTERNAL_URL=' '${SUPABASE_DIR}/.env' | cut -d= -f2-)

  if [ -z \"\$ANON_KEY\" ] || [ -z \"\$API_URL\" ]; then
    echo 'ERROR: Could not read ANON_KEY / API_EXTERNAL_URL from ${SUPABASE_DIR}/.env'
    exit 1
  fi

  printf 'VITE_SUPABASE_URL=%s\nVITE_SUPABASE_ANON_KEY=%s\nVITE_GA_MEASUREMENT_ID=%s\nAPP_PUBLISH_PORT=%s\n' \
    \"\$API_URL\" \"\$ANON_KEY\" '${GA_MEASUREMENT_ID}' '${APP_PORT}' > .env
  echo \".env written (VITE_SUPABASE_URL=\$API_URL, VITE_GA_MEASUREMENT_ID=${GA_MEASUREMENT_ID})\"

  if ! docker ps --format '{{.Names}}' | grep -qx supabase-db; then
    echo 'ERROR: supabase-db is not running; cannot apply SQL migrations'
    exit 1
  fi

  echo 'Applying pending Supabase migrations...'
  DEPLOY_DIR='${DEPLOY_DIR}' bash scripts/apply-supabase-migrations.sh

  export VITE_SUPABASE_URL=\"\$API_URL\"
  export VITE_SUPABASE_ANON_KEY=\"\$ANON_KEY\"
  export VITE_GA_MEASUREMENT_ID='${GA_MEASUREMENT_ID}'
  export DOCKER_NETWORK='${NETWORK}'

  docker compose -f docker-compose.prod.yml build --no-cache \
    --build-arg VITE_SUPABASE_URL=\"\$API_URL\" \
    --build-arg VITE_SUPABASE_ANON_KEY=\"\$ANON_KEY\" \
    --build-arg VITE_GA_MEASUREMENT_ID='${GA_MEASUREMENT_ID}'

  docker compose -f docker-compose.prod.yml up -d

  echo 'Waiting for containers...'
  sleep 10
  docker compose -f docker-compose.prod.yml ps

  curl -fsS http://127.0.0.1:${APP_PORT}/ >/dev/null && echo 'App health check passed (port ${APP_PORT})' || {
    echo 'App health check failed'
    docker compose -f docker-compose.prod.yml logs app
    exit 1
  }

  echo 'Deployment successful!'
"

echo ""
echo "Ensure Supabase is running: SITE_URL=... API_URL=... bash ${DEPLOY_DIR}/scripts/setup-supabase-vps.sh (on VPS, first time only)"
echo "Ensure reverse proxy: APP_DOMAIN=... API_DOMAIN=... sudo bash ${DEPLOY_DIR}/scripts/npm-add-fasted.sh (on VPS)"
