#!/bin/bash

# ALERTA360 — Backup de PostgreSQL
#
# Dos modos:
#   1) Dentro del contenedor `backup` (o de cualquier host con el cliente psql):
#        PGHOST=db PGUSER=... PGPASSWORD=... PGDATABASE=... ./scripts/backup.sh
#   2) En el host, contra el contenedor `alerta360-db-prod`:
#        DB_USER=... DB_NAME=... ./scripts/backup.sh
#
# Opcional: subir a S3 si están definidas AWS_ACCESS_KEY_ID y BACKUP_S3_BUCKET.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/alerta360/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/alerta360_backup_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "📦 Backup de ALERTA360 — $TIMESTAMP"

if [ -n "${PGHOST:-}" ]; then
  # Modo contenedor / cliente local
  pg_dump --no-owner --no-privileges --clean --if-exists | gzip -9 > "$BACKUP_FILE"
else
  # Modo host: ejecuta pg_dump dentro del contenedor de PostgreSQL
  CONTAINER="${DB_CONTAINER:-alerta360-db-prod}"
  docker exec "$CONTAINER" pg_dump -U "${DB_USER:?DB_USER requerido}" --no-owner --no-privileges \
    "${DB_NAME:?DB_NAME requerido}" | gzip -9 > "$BACKUP_FILE"
fi

SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"
if [ ! -s "$BACKUP_FILE" ]; then
  echo "❌ El backup quedó vacío: $BACKUP_FILE"
  exit 1
fi

echo "✅ Backup creado: $BACKUP_FILE ($SIZE)"

if [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  echo "☁️  Subiendo a s3://$BACKUP_S3_BUCKET/"
  aws s3 cp "$BACKUP_FILE" "s3://$BACKUP_S3_BUCKET/" --only-show-errors
fi

echo "🧹 Borrando backups de más de ${RETENTION_DAYS} días…"
find "$BACKUP_DIR" -name "alerta360_backup_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete

echo "✅ Backup completo"
