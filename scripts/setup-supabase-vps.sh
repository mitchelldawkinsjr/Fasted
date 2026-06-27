#!/usr/bin/env bash
# Bootstrap self-hosted Supabase on the VPS (run on VPS via ssh).
# Installs to /opt/apps/supabase and joins fasted-network.
set -euo pipefail

SUPABASE_DIR="${SUPABASE_DIR:-/opt/apps/supabase}"
NETWORK="${DOCKER_NETWORK:-fasted-network}"
SITE_URL="${SITE_URL:-https://app.example.com}"
API_URL="${API_URL:-https://db.app.example.com}"

echo "Supabase install directory: $SUPABASE_DIR"

if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  echo "Creating Docker network: $NETWORK"
  docker network create "$NETWORK"
fi

if [ ! -f "$SUPABASE_DIR/docker-compose.yml" ]; then
  TMP=$(mktemp -d)
  git clone --depth 1 https://github.com/supabase/supabase "$TMP/supabase-repo"
  rm -rf "$SUPABASE_DIR"
  cp -r "$TMP/supabase-repo/docker" "$SUPABASE_DIR"
  rm -rf "$TMP"
  echo "Cloned Supabase docker stack to $SUPABASE_DIR"
fi

cd "$SUPABASE_DIR"

if [ ! -f .env ]; then
  cp .env.example .env
fi

# Generate secrets if placeholders remain
gen_secret() {
  openssl rand -base64 32 | tr -d '/+=' | head -c 32
}

if grep -q '^POSTGRES_PASSWORD=your-super-secret-and-long-postgres-password' .env; then
  POSTGRES_PASSWORD=$(gen_secret)
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|" .env
  echo "Generated POSTGRES_PASSWORD"
fi

if grep -q '^JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters-long' .env; then
  JWT_SECRET=$(gen_secret)$(gen_secret)
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" .env
  echo "Generated JWT_SECRET"
fi

JWT_SECRET=$(grep '^JWT_SECRET=' .env | cut -d= -f2-)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYS_JSON=$(node "$SCRIPT_DIR/generate-supabase-keys.mjs" "$JWT_SECRET")
ANON_KEY=$(echo "$KEYS_JSON" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).ANON_KEY)")
SERVICE_KEY=$(echo "$KEYS_JSON" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).SERVICE_ROLE_KEY)")

sed -i "s|^ANON_KEY=.*|ANON_KEY=${ANON_KEY}|" .env
sed -i "s|^SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=${SERVICE_KEY}|" .env
sed -i "s|^SITE_URL=.*|SITE_URL=${SITE_URL}|" .env
sed -i "s|^API_EXTERNAL_URL=.*|API_EXTERNAL_URL=${API_URL}|" .env
sed -i "s|^SUPABASE_PUBLIC_URL=.*|SUPABASE_PUBLIC_URL=${API_URL}|" .env

# Avoid host port conflicts (app-api uses 8000). NPM reaches Kong via docker network on container port 8000.
KONG_HOST_PORT="${KONG_HOST_PORT:-8050}"
sed -i "s|^KONG_HTTP_PORT=.*|KONG_HTTP_PORT=${KONG_HOST_PORT}|" .env
sed -i 's|^KONG_HTTPS_PORT=.*|KONG_HTTPS_PORT=8444|' .env

# Join fasted-network (patch compose if not already external)
if ! grep -q 'name: fasted-network' docker-compose.yml; then
  cat >> docker-compose.yml <<'YAML'

networks:
  default:
    external: true
    name: fasted-network
YAML
  echo "Patched docker-compose.yml to use $NETWORK"
fi

docker compose pull
docker compose up -d

echo ""
echo "Waiting for services to start..."
sleep 90
docker compose ps

echo ""
echo "=== Supabase bootstrap complete ==="
echo "ANON_KEY (for VITE_SUPABASE_ANON_KEY):"
grep '^ANON_KEY=' .env | cut -d= -f2-
echo ""
echo "Next steps:"
echo "  1. sudo bash /opt/apps/fasted-calendar/scripts/npm-add-supabase.sh"
echo "  2. Run SQL migration (supabase/migrations/20260627000000_initial.sql)"
echo "  3. Update fasted-calendar .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
