#!/bin/bash

# ALERTA360 Database Backup Script
# Usage: ./scripts/backup.sh

set -e

BACKUP_DIR="/opt/alerta360/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/alerta360_backup_$TIMESTAMP.sql.gz"

echo "📦 Creating database backup..."

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Backup database
docker exec alerta360-db-prod pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_FILE

# Upload to S3/Spaces (optional)
if [ -n "$AWS_ACCESS_KEY_ID" ]; then
    echo "☁️ Uploading to S3..."
    aws s3 cp $BACKUP_FILE s3://alerta360-backups/
fi

# Cleanup old backups (keep last 7 days)
echo "🧹 Cleaning old backups..."
find $BACKUP_DIR -name "alerta360_backup_*.sql.gz" -mtime +7 -delete

echo "✅ Backup complete: $BACKUP_FILE"
EOF