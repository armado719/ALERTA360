# Fase 3 — Producción y Go-Live

Runbook de la infraestructura de producción de ALERTA360. Todo lo que depende del
repositorio está implementado; las acciones que necesitan cuenta, dominio o servidor
quedan marcadas como **⏳ externo**.

---

## 1. Arquitectura de producción

```
                 Internet
                    │  80/443
             ┌──────▼───────┐
             │    nginx     │  TLS (Let's Encrypt), gzip, rate limit,
             │  :80 / :443  │  CSP, HSTS, cache de /assets
             └───┬──────┬───┘
        /        │      │  /api · /ws · /health
   ┌─────────┐   │      │
   │  dist/  │   │   ┌──▼────────┐        ┌────────────┐
   │ (Vite)  │   │   │  backend  │───────▶│ PostgreSQL │
   └─────────┘   │   │  :3000    │        │  :5432     │
                 │   └──┬───┬────┘        └────────────┘
                 │      │   │ /metrics
        /status  │      │   ▼
   (status.html) │   ┌──┴──────────┐    ┌─────────────┐
                 │   │ Prometheus  │───▶│ Alertmanager│──▶ webhook
                 │   │  :9090      │    │   :9093     │
                 │   └──┬──────────┘    └─────────────┘
                 │      ▼
                 │   ┌─────────────┐
                 │   │   Grafana   │  :3000 interno (publicado en 127.0.0.1:3001)
                 │   └─────────────┘
                 │
            ┌────▼─────┐        ┌──────────┐
            │ certbot  │        │  backup  │ → ./backups (7 días)
            └──────────┘        └──────────┘
```

Servicios del `docker-compose.prod.yml`: `db`, `backend`, `nginx`, `certbot`,
`prometheus`, `alertmanager`, `grafana`, `node-exporter`, `postgres-exporter`, `backup`.
Solo nginx publica puertos al exterior; Prometheus, Alertmanager y Grafana escuchan
en `127.0.0.1`.

---

## 2. Servidor

| Recurso | Mínimo | Recomendado |
|---|---|---|
| vCPU | 2 | 2 |
| RAM | 2 GB | 4 GB |
| Disco | 25 GB SSD | 40 GB SSD |
| SO | Ubuntu 22.04/24.04 | Ubuntu 24.04 LTS |

**Proveedor recomendado:** Hetzner CX22 (≈ €4/mes) o DigitalOcean Droplet Basic
(2 vCPU / 2 GB, ≈ $12/mes). Ambos dan IPv4 fija y snapshots.

**CDN / DNS:** Cloudflare en plan gratuito — proxy activado, SSL «Full (strict)»,
cache de `/assets/*` (los hashes de Vite ya son inmutables) y `Always Use HTTPS`.
El orden de activación y el `real_ip` de nginx están en la sección 9.

**⏳ externo:** abrir el servidor, crear el registro A de `alerta360.com` y `www`
apuntando a la IP y declarar el dominio en Cloudflare.

### Firewall

Solo deben ser alcanzables SSH, HTTP y HTTPS. El resto de servicios
(PostgreSQL, backend, Prometheus, Alertmanager, Grafana) ya están atados a
`127.0.0.1` en el compose, así que no necesitan regla.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # ACME + redirección a HTTPS
sudo ufw allow 443/tcp    # aplicación
sudo ufw enable
sudo ufw status verbose
```

Comprobación desde fuera: `nc -zv alerta360.com 5432` y `nc -zv alerta360.com 3000`
deben fallar. Opcional: `fail2ban` para SSH.

---

## 3. Puesta en marcha (una sola vez)

```bash
# 1. En el servidor
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git curl rsync
#    (si docker-compose-v2 no existe en tu distro, usa el repo oficial de Docker)

# Node 20 solo hace falta para el despliegue manual; el pipeline compila el
# frontend en GitHub y envía el `dist/` ya construido.
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Con 2 GB de RAM, 2 GB de swap: Vite necesita aire al compilar
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

git clone https://github.com/armado719/ALERTA360.git
cd ALERTA360

# 2. Variables de entorno
cp .env.example .env.produccion
#   DB_USER, DB_PASSWORD, DB_NAME
#   JWT_SECRET       → openssl rand -hex 32
#   GRAFANA_PASSWORD
#   CORS_ORIGIN=https://alerta360.com
#   DOMAIN=alerta360.com
#   ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...   (opcional)

# 3. Certificado TLS
DOMAIN=alerta360.com EMAIL=tu@correo.com ./scripts/init-letsencrypt.sh

# 4. Despliegue
./scripts/deploy.sh produccion
```

Verificación rápida:

```bash
curl -fsS https://alerta360.com/health | jq
curl -fsS https://alerta360.com/api/events?timeRange=24h | jq '.events | length'
open https://alerta360.com/status          # página de estado pública
```

---

## 4. Observabilidad

| Recurso | Dónde |
|---|---|
| Métricas crudas | `GET /metrics` del backend (solo red interna) |
| Scrape | `monitoring/prometheus.yml`, retención 15 días |
| Reglas de alerta | `monitoring/alerts.yml` |
| Enrutado | `monitoring/alertmanager.yml` → `ALERT_WEBHOOK_URL` |
| Dashboard | Grafana → carpeta **ALERTA360** → *ALERTA360 — Producción* |
| Estado público | `https://alerta360.com/status` |

Métricas expuestas por el backend:

- `alerta360_http_requests_total` y `alerta360_http_request_duration_seconds` (método, ruta, estado)
- `alerta360_ingestion_last_success_timestamp_seconds`, `..._cycle_duration_seconds`
- `alerta360_ingestion_events_total{source}`, `alerta360_ingestion_errors_total{source}`
- `alerta360_active_events`
- Métricas de proceso (`alerta360_process_*`, `nodejs_*`)

Alertas incluidas: `BackendDown`, `BackendErrorRate`, `BackendLatenciaAlta`,
`IngestaDetenida`, `IngestaSinEventosNuevos`, `IngestaConErrores`, `MemoriaAlta`,
`DemasiadasConexionesHTTP`.

### Webhook

```bash
# Slack: crea un Incoming Webhook y pega la URL
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
```

Sin webhook configurado las alertas se evalúan y se ven en Prometheus/Alertmanager,
pero no se envían a ningún sitio.

---

## 5. Backups y restauración

```bash
# Backup manual (en el host)
DB_USER=... DB_NAME=... ./scripts/backup.sh

# Restaurar
gunzip -c backups/alerta360_backup_20261018_030000.sql.gz \
  | docker exec -i alerta360-db-prod psql -U "$DB_USER" "$DB_NAME"
```

El servicio `backup` corre `pg_dump` cada 24 h y conserva 7 días
(`BACKUP_RETENTION_DAYS`). Con `AWS_ACCESS_KEY_ID` y `BACKUP_S3_BUCKET` también sube a S3.

### Prueba de restauración

Un backup que nunca se restauró no es un backup. Ensayo **mensual** y después
de cada cambio de esquema, siempre contra una base temporal:

```bash
# 1. Elegir el backup más reciente
ls -lh backups/ | tail -3

# 2. Base de prueba (nunca sobre la de producción)
docker exec -i alerta360-db-prod psql -U "$DB_USER" \
  -c 'CREATE DATABASE alerta360_restore_test;'

# 3. Restaurar ahí
gunzip -c backups/alerta360_backup_20261018_030000.sql.gz \
  | docker exec -i alerta360-db-prod psql -U "$DB_USER" -d alerta360_restore_test

# 4. Cuadrar cifras con producción (deben coincidir salvo el delta del día)
docker exec -i alerta360-db-prod psql -U "$DB_USER" -d alerta360_restore_test \
  -c 'SELECT count(*) FROM "DisasterEvent"; SELECT count(*) FROM "User";'

# 5. Limpiar
docker exec -i alerta360-db-prod psql -U "$DB_USER" \
  -c 'DROP DATABASE alerta360_restore_test;'
```

Anotar fecha, tamaño del backup y resultado en `BITACORA.md`.

Tiempo objetivo de recuperación (RTO): **1 hora**. Pérdida máxima aceptable
(RPO): **24 horas**, el intervalo del `pg_dump`.

---

## 6. Despliegue y rollback

### Automático (GitHub Actions)

Cada push a `main` dispara `.github/workflows/deploy.yml`:

1. **build-and-push** — compila el backend a
   `ghcr.io/armado719/alerta360-backend:sha-<commit>` (más `latest` y, si es un
   tag `v*`, la versión semver) y genera el artefacto `dist/` del frontend.
2. **deploy** — hace `rsync` de `dist/` y de la configuración
   (`docker-compose.prod.yml`, `nginx.conf`, `monitoring/`, `scripts/`) a
   `/opt/alerta360`, cambia `dist` de forma atómica, descarga la imagen,
   sincroniza el esquema con `prisma db push`, levanta los servicios, valida
   `nginx -t`, recarga nginx y comprueba `/health` en local y en público.
3. Si algo falla, **rollback automático**: restaura el `dist` anterior y vuelve
   a levantar el `IMAGE_TAG` guardado en `.current_tag`.

Secretos (Settings → Secrets → Actions): `PROD_HOST`, `PROD_USER`,
`PROD_SSH_KEY`. Variable opcional: `PROD_DOMAIN` (por defecto `alerta360.com`).

Requisitos en el servidor: `/opt/alerta360` con `.env.produccion`, Docker +
compose v2, `rsync` y el usuario en el grupo `docker`.

La imagen se publica en un paquete de GitHub. Si el paquete es **privado**, o
lo haces público (Packages → *alerta360-backend* → Change visibility) o el
servidor necesita `echo "$GHCR_TOKEN" | docker login ghcr.io -u TU_USUARIO
--password-stdin`. Si el `pull` falla, el pipeline compila la imagen en el
servidor con el código que sincroniza.

### Manual

```bash
# pull de imagen + esquema + health check, con traza de rollback
./scripts/deploy.sh produccion
```

Para fijar una versión concreta:

```bash
IMAGE_TAG=sha-1a2b3c4 docker compose -f docker-compose.prod.yml up -d backend
```

Rollback: vuelve a levantar el tag anterior (las migraciones de Prisma son
aditivas; si hiciera falta revertir, restaurar el backup previo).

---

## 7. Checklist de go-live

| Ítem | Estado |
|---|---|
| CI/CD preparado para producción | ✅ imagen en ghcr + `dist/` + despliegue SSH con rollback |
| TLS con Let's Encrypt + renovación | ✅ nginx + certbot |
| Rate limiting y cabeceras de seguridad | ✅ nginx (HSTS, CSP, X-Frame-Options…) |
| Monitoreo Prometheus + Grafana | ✅ métricas, dashboard provisionado |
| Alertas con enrutado | ✅ 8 reglas + Alertmanager |
| Backup automático de BD | ✅ servicio `backup` diario |
| Página de estado pública | ✅ `/status` |
| CDN | ⏳ activar Cloudflare (config de cache ya lista) |
| Proveedor cloud y dominio | ⏳ elegir y apuntar DNS |
| Lanzamiento público | ⏳ tras los dos anteriores |

**Criterios de salida de la fase** (1000 usuarios, 99.9 % uptime, on-call) solo se
pueden medir con el servicio ya en producción.

---

## 8. Operación

- **Uptime:** comprobación externa cada minuto a `/health` (UptimeRobot, BetterStack
  o Cloudflare Health Checks). El endpoint devuelve 503 si la base de datos falla.
- **On-call:** las alertas críticas llegan al webhook; el runbook de respuesta es
  este documento (secciones 4–6).
- **Capacidad:** una instancia de backend sostiene el tráfico del MVP. Antes de
  escalar a más de una réplica hay que mover la ingesta a un proceso aparte: hoy
  corre con `setInterval` dentro del API y se duplicaría.

---

## 9. Cloudflare

Recomendado para el lanzamiento: CDN, TLS en el borde, protección DDoS y
caché de los assets sin coste.

### Orden de activación

1. Crear las zonas DNS con los registros A de `alerta360.com` y `www`
   apuntando a la IP del servidor, **en modo «DNS only» (nube gris)**.
2. Emitir el certificado del origen: `./scripts/init-letsencrypt.sh`.
   Con la nube naranja activa, la validación HTTP-01 llega a través de
   Cloudflare y puede fallar o renovar mal.
3. En Cloudflare: SSL/TLS → **Full (strict)**; reglas → **Always Use HTTPS**.
4. Pasar ambos registros a **«Proxied» (nube naranja)**.
5. En el servidor, descomentar el bloque `real_ip` de `nginx.conf` y recargar:

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -t
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

6. Verificar que nginx ya ve la IP real: `docker compose logs nginx | tail`
   debe mostrar la IP del visitante, no una `172.x` de Cloudflare.

### Por qué el `real_ip` es obligatorio

Sin el bloque `set_real_ip_from`, nginx toma como origen la IP de Cloudflare:
el rate limit (`10 r/s` por IP) agrupa a **todos** los usuarios en un mismo
cubo —un pico de tráfico legítimo devolvería 429 a todo el mundo— y los logs
dejan de ser útiles para diagnosticar. Los rangos del archivo son los
publicados en <https://www.cloudflare.com/ips/>.

### Reglas de caché

| Ruta | Regla |
|---|---|
| `/assets/*` | Cache Everything, Edge TTL 1 año (los hashes de Vite son inmutables) |
| `/` y `index.html` | Bypass (para que el despliegue se vea al instante) |
| `/api/*`, `/health`, `/status` | Bypass (datos en vivo) |
| `/.well-known/acme-challenge/*` | Bypass |

### Renovación del certificado

Con la nube naranja las renovaciones HTTP-01 pueden fallar. Si ocurre, hay dos
salidas: usar el modo DNS-01 de certbot (token de API de Cloudflare) o volver
temporalmente el registro a «DNS only» durante la renovación. El contenedor
`certbot` reintenta cada 12 h, así que un fallo puntual no deja el sitio sin
TLS.
