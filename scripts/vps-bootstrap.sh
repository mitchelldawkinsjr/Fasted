#!/usr/bin/env bash
# One-time host prep for docker-compose.prod.yml (run on the VPS).
set -euo pipefail

NET="${DOCKER_NETWORK:-fasted-network}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/apps}"
APP_DIR="${APP_DIR:-${DEPLOY_ROOT}/fasted-calendar}"

if ! docker network inspect "$NET" >/dev/null 2>&1; then
  echo "Creating Docker network: $NET"
  docker network create "$NET"
else
  echo "Docker network exists: $NET"
fi

mkdir -p "$APP_DIR"
echo "Deploy directory ready: $APP_DIR"
echo ""
echo "Next steps:"
echo "  1. rsync or git pull app files into $APP_DIR"
echo "  2. cd $APP_DIR && docker compose -f docker-compose.prod.yml up -d --build"
echo "  3. APP_DOMAIN=... API_DOMAIN=... sudo bash scripts/npm-add-fasted.sh"
echo "  4. See docker/SETUP.md for Supabase setup and migrations"
