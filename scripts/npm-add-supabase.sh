#!/usr/bin/env bash
# Add a Supabase API proxy host to Nginx Proxy Manager.
set -euo pipefail

API_DOMAIN="${API_DOMAIN:?Set API_DOMAIN (e.g. api.example.com)}"
DB="${NPM_DB:-/data/nginx/database.sqlite}"
NOW=$(date "+%Y-%m-%d %H:%M:%S")

exist=$(sudo sqlite3 "$DB" "SELECT id FROM proxy_host WHERE domain_names LIKE '%${API_DOMAIN}%' AND is_deleted=0 LIMIT 1;" || true)
if [ -n "$exist" ]; then
  echo "Proxy host already exists for ${API_DOMAIN}: id=$exist"
  exit 0
fi

sudo sqlite3 "$DB" <<SQL
INSERT INTO certificate (created_on, modified_on, owner_user_id, is_deleted, provider, nice_name, domain_names, expires_on, meta)
VALUES ('$NOW', '$NOW', 1, 0, 'letsencrypt', '${API_DOMAIN}', '["${API_DOMAIN}"]', '2099-01-01 00:00:00', '{}');
SQL

cert_id=$(sudo sqlite3 "$DB" "SELECT id FROM certificate WHERE nice_name='${API_DOMAIN}' ORDER BY id DESC LIMIT 1;")

sudo sqlite3 "$DB" <<SQL
INSERT INTO proxy_host (
  created_on, modified_on, owner_user_id, is_deleted, domain_names,
  forward_host, forward_port, access_list_id, certificate_id, ssl_forced,
  caching_enabled, block_exploits, advanced_config, meta,
  allow_websocket_upgrade, http2_support, forward_scheme, enabled,
  locations, hsts_enabled, hsts_subdomains
) VALUES (
  '$NOW', '$NOW', 1, 0, '["${API_DOMAIN}"]',
  'supabase-kong', 8000, 0, ${cert_id}, 1,
  0, 0, '', '{"nginx_online":true,"nginx_err":null}',
  1, 0, 'http', 1,
  '[]', 0, 0
);
SQL

host_id=$(sudo sqlite3 "$DB" "SELECT id FROM proxy_host WHERE domain_names LIKE '%${API_DOMAIN}%' ORDER BY id DESC LIMIT 1;")
echo "Created proxy_host id=$host_id for ${API_DOMAIN} -> supabase-kong:8000"

docker restart nginx-proxy
sleep 8
echo "NPM restarted. Request SSL cert for ${API_DOMAIN} in NPM UI if HTTPS does not work."
