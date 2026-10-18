#!/bin/bash

# ALERTA360 — Emisión del primer certificado de Let's Encrypt
#
# Nginx no arranca si falta ./ssl/live/<dominio>/fullchain.pem, así que este
# script crea un certificado autofirmado temporal, levanta nginx, pide el
# certificado real con certbot (webroot) y recarga nginx.
#
# Uso:  DOMAIN=alerta360.com EMAIL=tu@correo.com ./scripts/init-letsencrypt.sh

set -euo pipefail

DOMAIN="${DOMAIN:-alerta360.com}"
EMAIL="${EMAIL:?Define EMAIL=tu@correo.com}"
COMPOSE_FILE="docker-compose.prod.yml"
SSL_DIR="./ssl/live/$DOMAIN"

cd "$(dirname "$0")/.."

if [ -f "$SSL_DIR/fullchain.pem" ]; then
  echo "✅ Ya existe un certificado en $SSL_DIR — nada que hacer."
  exit 0
fi

echo "🔐 Generando certificado autofirmado temporal…"
mkdir -p "$SSL_DIR"
docker run --rm -v "$(pwd)/ssl:/etc/letsencrypt" alpine:3.20 sh -c "
  apk add --no-cache openssl >/dev/null &&
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj '/CN=localhost'
"

echo "🐳 Levantando nginx…"
docker compose -f "$COMPOSE_FILE" up -d nginx

echo "🧹 Eliminando el certificado temporal…"
docker run --rm -v "$(pwd)/ssl:/etc/letsencrypt" alpine:3.20 sh -c "
  rm -rf /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf
"

echo "📜 Solicitando el certificado real para $DOMAIN…"
docker compose -f "$COMPOSE_FILE" run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  --email "$EMAIL" -d "$DOMAIN" -d "www.$DOMAIN" \
  --agree-tos --no-eff-email --force-renewal

echo "🔄 Recargando nginx…"
docker compose -f "$COMPOSE_FILE" exec nginx nginx -s reload

echo "✅ Listo. Certificado emitido; certbot lo renueva automáticamente cada 12 h."
