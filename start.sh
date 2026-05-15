#!/bin/bash

##############################################
# Blog Assistant - Startup Script
# Usage: bash start.sh
##############################################

set -e

echo "🚀 Blog Assistant - Docker Startup Script"
echo "=========================================="

# Check Docker
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install Docker first."
    exit 1
fi

echo "✓ Docker found"

# Check environment file
if [ ! -f .env.local ]; then
    echo "❌ .env.local not found"
    echo "   Creating from template..."
    cp .env.local.template .env.local
    echo "   ℹ️  Please review and update .env.local with your settings"
fi

echo "✓ Environment file exists"

# Build images
echo ""
echo "🔨 Building Docker images..."
docker-compose build

# Start services
echo ""
echo "▶️  Starting services..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
RETRY_LIMIT=30
RETRY=0
until [ $RETRY -ge $RETRY_LIMIT ]; do
    if docker-compose exec -T postgres pg_isready -U postgres -d chatbot_db &>/dev/null; then
        echo "✓ PostgreSQL is ready"
        break
    fi
    RETRY=$((RETRY + 1))
    echo "   Attempt $RETRY/$RETRY_LIMIT..."
    sleep 2
done

if [ $RETRY -ge $RETRY_LIMIT ]; then
    echo "❌ PostgreSQL failed to start"
    docker-compose logs postgres
    exit 1
fi

# Wait for app to be ready
echo ""
echo "⏳ Waiting for Next.js app to be ready..."
RETRY=0
until [ $RETRY -ge $RETRY_LIMIT ]; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "✓ Next.js app is ready"
        break
    fi
    RETRY=$((RETRY + 1))
    echo "   Attempt $RETRY/$RETRY_LIMIT..."
    sleep 2
done

if [ $RETRY -ge $RETRY_LIMIT ]; then
    echo "⚠️  App startup timeout - check logs with: docker-compose logs app"
fi

# Summary
echo ""
echo "=========================================="
echo "✅ Blog Assistant is running!"
echo "=========================================="
echo ""
echo "📊 Services Status:"
docker-compose ps
echo ""
echo "🌐 Access URLs:"
echo "   Local API:  http://localhost:3000"
echo "   Public:     https://chat.adi-muhamad.my.id"
echo "   Health:     http://localhost:3000/api/health"
echo ""
echo "📚 Data Ingestion:"
echo "   docker exec chatbot_app node ingest-postgres.js --file path/to/file.txt --source \"Blog Post\""
echo ""
echo "📖 Logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Stop services:"
echo "   bash stop.sh"
echo ""
