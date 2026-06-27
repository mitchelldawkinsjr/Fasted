#!/usr/bin/env bash
# Deploy fasted-calendar to mitch-cloud VPS (manual / CI helper).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE="${VPS_REMOTE:-vps}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/360ws/clients/docker-app/fasted-calendar}"
SUPABASE_DIR="${SUPABASE_DIR:-/opt/360ws/clients/docker-app/supabase}"
APP_PORT="${APP_PUBLISH_PORT:-8022}"

echo "Deploying to ${REMOTE}:${DEPLOY_DIR}"

ssh "$REMOTE" "mkdir -p ${DEPLOY_DIR} && docker network ls --format '{{.Name}}' | grep -q '^360ws-network\$' || docker network create 360ws-network"

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

# Use a double-quoted ssh command (not bash -s heredoc) so that docker
# compose never competes with bash for stdin — the approach confirmed to
# work in manual testing.  Local variables like DEPLOY_DIR are expanded
# here; remote variables are escaped with \$.
ssh "$REMOTE" "
  set -e
  cd '${DEPLOY_DIR}'

  ANON_KEY=\$(grep '^ANON_KEY=' '${SUPABASE_DIR}/.env' | cut -d= -f2-)
  API_URL=\$(grep '^API_EXTERNAL_URL=' '${SUPABASE_DIR}/.env' | cut -d= -f2-)

  if [ -z \"\$ANON_KEY\" ] || [ -z \"\$API_URL\" ]; then
    echo 'ERROR: Could not read ANON_KEY / API_EXTERNAL_URL from ${SUPABASE_DIR}/.env'
    exit 1
  fi

  printf 'VITE_SUPABASE_URL=%s\nVITE_SUPABASE_ANON_KEY=%s\nAPP_PUBLISH_PORT=%s\n' \
    \"\$API_URL\" \"\$ANON_KEY\" '${APP_PORT}' > .env
  echo \".env written (VITE_SUPABASE_URL=\$API_URL)\"

  export VITE_SUPABASE_URL=\"\$API_URL\"
  export VITE_SUPABASE_ANON_KEY=\"\$ANON_KEY\"

  docker compose -f docker-compose.prod.yml build --no-cache \
    --build-arg VITE_SUPABASE_URL=\"\$API_URL\" \
    --build-arg VITE_SUPABASE_ANON_KEY=\"\$ANON_KEY\"

  docker compose -f docker-compose.prod.yml up -d

  echo 'Waiting for containers...'
  sleep 10
  docker compose -f docker-compose.prod.yml ps

  curl -fsS http://127.0.0.1:8022/ >/dev/null && echo 'App health check passed (port 8022)' || {
    echo 'App health check failed'
    docker compose -f docker-compose.prod.yml logs app
    exit 1
  }

  echo 'Deployment successful!'
"

echo ""
echo "Ensure Supabase is running: bash ${DEPLOY_DIR}/scripts/setup-supabase-vps.sh (on VPS, first time only)"
echo "Ensure NPM proxy: sudo bash ${DEPLOY_DIR}/scripts/npm-add-supabase.sh (on VPS)"
