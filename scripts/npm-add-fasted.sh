#!/usr/bin/env bash
# Add PWA + Supabase API proxy hosts to Nginx Proxy Manager.
# Run on VPS with sudo access to /data/nginx/database.sqlite
set -euo pipefail

APP_DOMAIN="${APP_DOMAIN:?Set APP_DOMAIN (e.g. app.example.com)}"
API_DOMAIN="${API_DOMAIN:?Set API_DOMAIN (e.g. api.example.com)}"
DB="${NPM_DB:-/data/nginx/database.sqlite}"
NOW=$(date "+%Y-%m-%d %H:%M:%S")

add_proxy_host() {
  local domain="$1"
  local forward_host="$2"
  local forward_port="$3"

  local exist
  exist=$(sudo sqlite3 "$DB" "SELECT id FROM proxy_host WHERE domain_names LIKE '%${domain}%' AND is_deleted=0 LIMIT 1;" || true)
  if [ -n "$exist" ]; then
    echo "Proxy host already exists for ${domain}: id=$exist"
    sudo sqlite3 "$DB" "SELECT id, domain_names, forward_host, forward_port, certificate_id, ssl_forced FROM proxy_host WHERE id=$exist;"
    return 0
  fi

  sudo sqlite3 "$DB" <<SQL
INSERT INTO certificate (created_on, modified_on, owner_user_id, is_deleted, provider, nice_name, domain_names, expires_on, meta)
VALUES ('$NOW', '$NOW', 1, 0, 'letsencrypt', '${domain}', '["${domain}"]', '2099-01-01 00:00:00', '{}');
SQL

  local cert_id
  cert_id=$(sudo sqlite3 "$DB" "SELECT id FROM certificate WHERE nice_name='${domain}' ORDER BY id DESC LIMIT 1;")
  echo "Created certificate id=$cert_id for ${domain}"

  sudo sqlite3 "$DB" <<SQL
INSERT INTO proxy_host (
  created_on, modified_on, owner_user_id, is_deleted, domain_names,
  forward_host, forward_port, access_list_id, certificate_id, ssl_forced,
  caching_enabled, block_exploits, advanced_config, meta,
  allow_websocket_upgrade, http2_support, forward_scheme, enabled,
  locations, hsts_enabled, hsts_subdomains
) VALUES (
  '$NOW', '$NOW', 1, 0, '["${domain}"]',
  '${forward_host}', ${forward_port}, 0, ${cert_id}, 1,
  0, 0, '', '{"nginx_online":true,"nginx_err":null}',
  1, 0, 'http', 1,
  '[]', 0, 0
);
SQL

  local host_id
  host_id=$(sudo sqlite3 "$DB" "SELECT id FROM proxy_host WHERE domain_names LIKE '%${domain}%' ORDER BY id DESC LIMIT 1;")
  echo "Created proxy_host id=$host_id -> ${forward_host}:${forward_port}"

  if ! docker exec nginx-proxy test -f "/data/nginx/proxy_host/${host_id}.conf"; then
    docker exec nginx-proxy sh -c "cat > /data/nginx/proxy_host/${host_id}.conf <<EOF
# ------------------------------------------------------------
# ${domain}
# ------------------------------------------------------------

server {
  set \\\$forward_scheme http;
  set \\\$server         \"${forward_host}\";
  set \\\$port           ${forward_port};

  listen 80;
  listen [::]:80;

  server_name ${domain};

  access_log /data/logs/proxy-host-${host_id}_access.log proxy;
  error_log /data/logs/proxy-host-${host_id}_error.log warn;

  location / {
    include conf.d/include/proxy.conf;
  }

  include /data/nginx/custom/server_proxy[.]conf;
}
EOF
nginx -s reload"
    echo "Wrote /data/nginx/proxy_host/${host_id}.conf and reloaded nginx"
  fi

  sudo sqlite3 "$DB" "SELECT id, domain_names, forward_host, forward_port, certificate_id, ssl_forced, enabled FROM proxy_host WHERE id=$host_id;"
}

add_proxy_host "$APP_DOMAIN" "fasted-calendar-app" 80
add_proxy_host "$API_DOMAIN" "supabase-kong" 8000

docker restart nginx-proxy
sleep 8
echo "NPM restarted. Request SSL certs in NPM UI if HTTP works but HTTPS does not."
