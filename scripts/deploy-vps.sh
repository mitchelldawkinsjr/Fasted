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

# Single SSH session (bash -s) so creds, .env, and docker compose all run
# in the same shell — no cross-session file visibility issues.
# Vars passed as positional args to avoid heredoc escaping problems.
ssh "$REMOTE" bash -s -- "$DEPLOY_DIR" "$SUPABASE_DIR" "$APP_PORT" <<'ENDSSH'
set -e
DEPLOY_DIR="$1"
SUPABASE_DIR="$2"
APP_PORT="$3"

cd "$DEPLOY_DIR"

# Read creds from the Supabase stack (refreshed on every deploy).
ANON_KEY=$(grep '^ANON_KEY=' "$SUPABASE_DIR/.env" | cut -d= -f2-)
API_URL=$(grep '^API_EXTERNAL_URL=' "$SUPABASE_DIR/.env" | cut -d= -f2-)

if [ -z "$ANON_KEY" ] || [ -z "$API_URL" ]; then
  echo "ERROR: Could not read ANON_KEY / API_EXTERNAL_URL from $SUPABASE_DIR/.env"
  exit 1
fi

# Write app .env (docker compose also reads this as fallback).
printf 'VITE_SUPABASE_URL=%s\nVITE_SUPABASE_ANON_KEY=%s\nAPP_PUBLISH_PORT=%s\n' \
  "$API_URL" "$ANON_KEY" "$APP_PORT" > .env
echo ".env written (VITE_SUPABASE_URL=$API_URL)"

# Pass vars directly to docker compose — belt-and-suspenders.
VITE_SUPABASE_URL="$API_URL" \
VITE_SUPABASE_ANON_KEY="$ANON_KEY" \
docker compose -f docker-compose.prod.yml build --no-cache

VITE_SUPABASE_URL="$API_URL" \
VITE_SUPABASE_ANON_KEY="$ANON_KEY" \
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
echo "Ensure Supabase is running: bash ${DEPLOY_DIR}/scripts/setup-supabase-vps.sh (on VPS, first time only)"
echo "Ensure NPM proxy: sudo bash ${DEPLOY_DIR}/scripts/npm-add-supabase.sh (on VPS)"
