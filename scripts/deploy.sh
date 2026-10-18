#!/bin/bash

# ALERTA360 — Despliegue en el servidor
#
# Uso:  ./scripts/deploy.sh [produccion]
#
# Requiere: docker + compose v2, git, node 20, acceso a ghcr.io.

set -euo pipefail

ENVIRONMENT="${1:-produccion}"
COMPOSE_FILE="docker-compose.prod.yml"

cd "$(dirname "$0")/.."

if [ -f ".env.$ENVIRONMENT" ]; then
  echo "🔐 Cargando .env.$ENVIRONMENT"
  set -a
  # shellcheck disable=SC1090
  . ".env.$ENVIRONMENT"
  set +a
else
  echo "⚠️  No existe .env.$ENVIRONMENT; se usan las variables del entorno."
fi

echo "🚀 Desplegando ALERTA360 ($ENVIRONMENT)"

# 1. Código
echo "📥 Actualizando código…"
git pull --ff-only origin main

# 2. Frontend → ./dist (lo sirve nginx)
echo "🔨 Compilando frontend…"
npm ci --no-audit --no-fund
npm run build

# 3. Imágenes
echo "🐳 Descargando imágenes…"
if docker compose -f "$COMPOSE_FILE" pull backend; then
  echo "   imagen descargada desde el registry"
else
  echo "   no se pudo descargar; se compila en local"
  docker compose -f "$COMPOSE_FILE" build backend
fi

# 4. Base de datos arriba antes de tocar el esquema (importante en el primer
#    despliegue: `run --no-deps` no arranca dependencias)
echo "🗄️  Preparando la base de datos…"
docker compose -f "$COMPOSE_FILE" up -d db
for i in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" exec -T db pg_isready -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; then
    break
  fi
  sleep 2
done

# 5. Esquema de base de datos (antes de levantar la nueva versión)
#    Hoy el proyecto usa `db push`. Cuando existan migraciones versionadas,
#    cambia esta línea por: npx prisma migrate deploy
echo "🗄️  Sincronizando esquema…"
docker compose -f "$COMPOSE_FILE" run --rm --no-deps backend npx prisma db push --skip-generate || {
  echo "❌ Falló la sincronización del esquema; no se reinicia la aplicación."
  exit 1
}

# 6. Arranque
echo "🚀 Levantando servicios…"
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# 7. Health check con reintentos
echo "🏥 Esperando a que la API responda…"
for i in $(seq 1 30); do
  if curl -fsS -m 3 "https://${DOMAIN:-alerta360.com}/health" > /dev/null; then
    echo "✅ Despliegue correcto — https://${DOMAIN:-alerta360.com}"
    # El rollback del pipeline lee este archivo para saber a qué tag volver.
    echo "${IMAGE_TAG:-latest}" > .current_tag
    docker image prune -f > /dev/null
    exit 0
  fi
  sleep 3
done

echo "❌ La API no respondió en 90 s. Revisa:"
echo "   docker compose -f $COMPOSE_FILE logs --tail=100 backend nginx"
echo "   Rollback: IMAGE_TAG=<tag-anterior> docker compose -f $COMPOSE_FILE up -d backend"
exit 1
