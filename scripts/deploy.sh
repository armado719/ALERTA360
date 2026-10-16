#!/bin/bash

# ALERTA360 Deploy Script
# Usage: ./scripts/deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
echo "🚀 Deploying ALERTA360 to $ENVIRONMENT..."

# Load environment variables
if [ -f .env.$ENVIRONMENT ]; then
    export $(cat .env.$ENVIRONMENT | xargs)
fi

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Build frontend
echo "🔨 Building frontend..."
npm ci
npm run build

# Build backend
echo "🔨 Building backend..."
cd backend
npm ci
npm run build
cd ..

# Build Docker images
echo "🐳 Building Docker images..."
docker-compose -f docker-compose.prod.yml build

# Deploy
echo "🚀 Deploying..."
docker-compose -f docker-compose.prod.yml up -d

# Health check
echo "🏥 Running health check..."
sleep 30
if curl -f https://alerta360.com/health; then
    echo "✅ Deployment successful!"
else
    echo "❌ Health check failed!"
    exit 1
fi

# Cleanup
echo "🧹 Cleaning up..."
docker system prune -f

echo "✅ Deploy complete!"
EOF