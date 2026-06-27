#!/usr/bin/env bash
# Repoint api.app.example.com from PocketBase to Supabase Kong (production cutover).
# Updates NPM database and the live nginx proxy config file.
set -euo pipefail

DB="${NPM_DB:-/data/nginx/database.sqlite}"
DOMAIN="api.app.example.com"
FORWARD_HOST="supabase-kong"
FORWARD_PORT=8000

HOST_ID=$(sudo sqlite3 "$DB" "SELECT id FROM proxy_host WHERE domain_names LIKE '%${DOMAIN}%' AND is_deleted=0 LIMIT 1;" || true)

if [ -z "$HOST_ID" ]; then
  echo "No proxy host found for ${DOMAIN}. Run scripts/npm-add-fasted.sh first or add manually in NPM."
  exit 1
fi

sudo sqlite3 "$DB" "UPDATE proxy_host SET forward_host='${FORWARD_HOST}', forward_port=${FORWARD_PORT}, modified_on=datetime('now') WHERE id=${HOST_ID};"

CONF="/data/nginx/proxy_host/${HOST_ID}.conf"
if docker exec nginx-proxy test -f "$CONF"; then
  docker exec nginx-proxy sh -c "sed -i 's|set \\\$server         \\\".*\\\"|set \\\$server         \"${FORWARD_HOST}\"|' \"$CONF\" && sed -i 's|set \\\$port           [0-9]*|set \\\$port           ${FORWARD_PORT}|' \"$CONF\" && nginx -s reload"
  echo "Updated ${CONF} and reloaded nginx"
else
  echo "Warning: ${CONF} not found — restart nginx-proxy if routing does not update"
  docker restart nginx-proxy
fi

sudo sqlite3 "$DB" "SELECT id, domain_names, forward_host, forward_port FROM proxy_host WHERE id=${HOST_ID};"
echo "Done. ${DOMAIN} now forwards to ${FORWARD_HOST}:${FORWARD_PORT}"
