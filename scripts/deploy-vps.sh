#!/usr/bin/env bash
# Deploy fasted-calendar to mitch-cloud VPS (manual / CI helper).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE="${VPS_REMOTE:-vps}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/360ws/clients/docker-app/fasted-calendar}"

echo "Deploying to ${REMOTE}:${DEPLOY_DIR}"

ssh "$REMOTE" "mkdir -p ${DEPLOY_DIR} && docker network ls --format '{{.Name}}' | grep -q '^360ws-network\$' || docker network create 360ws-network"

rsync -avz --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'docker/pb_data' \
  --exclude '.env.local' \
  --exclude 'dist' \
  "$ROOT/" "${REMOTE}:${DEPLOY_DIR}/"

ssh "$REMOTE" <<EOF
set -e
cd ${DEPLOY_DIR}
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

if curl -fsS http://127.0.0.1:8023/api/health >/dev/null; then
  echo "PocketBase health check passed (port 8023)"
else
  echo "PocketBase health check failed"
  docker compose -f docker-compose.prod.yml logs pocketbase
  exit 1
fi

echo "Deployment successful!"
EOF

echo ""
echo "If first deploy, run on VPS: sudo bash ${DEPLOY_DIR}/scripts/npm-add-fasted.sh"
