#!/bin/bash

##############################################
# Blog Assistant - Shutdown Script
# Usage: bash stop.sh
##############################################

set -e

echo "🛑 Blog Assistant - Docker Shutdown Script"
echo "=========================================="

# Check Docker
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found"
    exit 1
fi

# Stop services gracefully
echo "⏸️  Stopping services (graceful shutdown)..."
docker-compose down

# Remove stopped containers
echo "🧹 Cleaning up..."
docker system prune -f --filter "status=exited" > /dev/null

echo ""
echo "=========================================="
echo "✅ Blog Assistant stopped"
echo "=========================================="
echo ""
echo "📊 Remaining containers:"
docker ps --filter "name=chatbot" -a || echo "   None"
echo ""
echo "💾 Data persisted in: postgres_data volume"
echo ""
echo "🚀 To restart:"
echo "   bash start.sh"
echo ""
echo "☠️  To remove data (irreversible):"
echo "   docker-compose down -v"
echo ""
