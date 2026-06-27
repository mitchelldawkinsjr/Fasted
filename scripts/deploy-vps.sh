#!/usr/bin/env bash
# Deploy fasted-calendar to production VPS VPS (manual / CI helper).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE="${VPS_REMOTE:-vps}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/apps/fasted-calendar}"
SUPABASE_DIR="${SUPABASE_DIR:-/opt/apps/supabase}"
APP_PORT="${APP_PUBLISH_PORT:-8022}"

echo "Deploying to ${REMOTE}:${DEPLOY_DIR}"

ssh "$REMOTE" "mkdir -p ${DEPLOY_DIR} && docker network ls --format '{{.Name}}' | grep -q '^fasted-network\$' || docker network create fasted-network"

rsync -avz --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'docker/pb_data' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude 'dist' \
  "$ROOT/" "${REMOTE}:${DEPLOY_DIR}/"

# Auto-create .env on the VPS from the Supabase stack if missing/empty.
# Uses a single ssh command (no heredoc) to avoid nested-heredoc escaping issues.
ssh "$REMOTE" "
  set -e
  if [ ! -s ${DEPLOY_DIR}/.env ]; then
    echo 'No .env found — generating from Supabase stack...'
    ANON_KEY=\$(grep '^ANON_KEY=' ${SUPABASE_DIR}/.env | cut -d= -f2-)
    API_URL=\$(grep '^API_EXTERNAL_URL=' ${SUPABASE_DIR}/.env | cut -d= -f2-)
    if [ -z \"\$ANON_KEY\" ] || [ -z \"\$API_URL\" ]; then
      echo 'ERROR: Could not read ANON_KEY / API_EXTERNAL_URL from ${SUPABASE_DIR}/.env'
      exit 1
    fi
    printf 'VITE_SUPABASE_URL=%s\nVITE_SUPABASE_ANON_KEY=%s\nAPP_PUBLISH_PORT=${APP_PORT}\n' \"\$API_URL\" \"\$ANON_KEY\" > ${DEPLOY_DIR}/.env
    echo \".env created (VITE_SUPABASE_URL=\$API_URL)\"
  else
    echo '.env already present — skipping generation'
  fi
"

ssh "$REMOTE" <<'ENDSSH'
set -e
cd /opt/apps/fasted-calendar

docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

echo "Waiting for containers..."
sleep 10
docker compose -f docker-compose.prod.yml ps

if curl -fsS http://127.0.0.1:8022/ >/dev/null; then
  echo "App health check passed (port 8022)"
else
  echo "App health check failed"
  docker compose -f docker-compose.prod.yml logs app
  exit 1
fi

echo "Deployment successful!"
ENDSSH

echo ""
echo "Ensure Supabase is running: bash /opt/apps/fasted-calendar/scripts/setup-supabase-vps.sh (on VPS, first time only)"
echo "Ensure NPM proxy: sudo bash /opt/apps/fasted-calendar/scripts/npm-add-supabase.sh (on VPS)"
