# 🚀 Blog Assistant - Docker Deployment Guide

## Arsitektur

```
┌─────────────────────────────────────────────────────┐
│           Cloudflare Tunnel (Public)                │
│    chat.adi-muhamad.my.id → localhost:3000          │
└────────────┬────────────────────────────────────────┘
             │
      ┌──────▼─────────┐
      │  Docker Host   │
      │                │
      ├─ Next.js App   │ (port 3000, private)
      │  (Container)   │
      │                │
      └──────┬─────────┘
             │
      ┌──────▼──────────────────┐
      │  Docker Network         │
      │  (chatbot-network)      │
      │                         │
      ├─ PostgreSQL + pgvector │ (port 5432, internal)
      │                         │
      └─────────────────────────┘
```

---

## 📋 Prerequisites

1. **Docker** & **Docker Compose** (minimal: v20.10)
   ```bash
   docker --version
   docker-compose --version
   ```

2. **Cloudflare Tunnel** sudah setup
   - Tunnel ID: `3fe6820f-8c27-490e-bcea-67da52227312`
   - Domain: `chat.adi-muhamad.my.id` (already tunneled)

3. **OpenAI API Key** 
   - ✅ Sudah di `.env.local`

---

## 🏗️ Setup Instructions

### 1. Clone Repository
```bash
cd /media/adi/Data/Firebase/chat-bot
git clone https://github.com/adimhsd/chatbot-bisnisdigital.git
cd chatbot-bisnisdigital
```

### 2. Prepare Environment Variables
```bash
# Already set in .env.local with your credentials
# Check if needed to update:
cat .env.local
```

### 3. Build & Start Services
```bash
# Build Docker images
docker-compose build

# Start all services (PostgreSQL + Next.js app)
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

---

## 📦 Service Details

### PostgreSQL (pgvector enabled)
- **Container name**: `chatbot_postgres`
- **Port (internal)**: 5432
- **Database**: `chatbot_db`
- **User**: `postgres`
- **Password**: `123`
- **Volumes**: `postgres_data` (persistent data)
- **Health check**: Every 10 seconds

### Next.js Application
- **Container name**: `chatbot_app`
- **Port (exposed)**: 3000
- **Environment**: Production
- **Health check**: `/api/health` every 30 seconds

---

## 🔧 Common Commands

### Start All Services
```bash
docker-compose up -d
```

### Stop All Services
```bash
docker-compose down
```

### Stop & Remove Data (⚠️ Warning: deletes DB)
```bash
docker-compose down -v
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
```

### Execute Commands in Container
```bash
# Into app container
docker exec -it chatbot_app sh

# Into PostgreSQL container
docker exec -it chatbot_postgres psql -U postgres -d chatbot_db
```

### Rebuild After Code Changes
```bash
docker-compose build app
docker-compose up -d app
```

---

## 📚 Data Ingestion

### Ingest Blog Posts (from local file)
```bash
# First, make sure app container is running
docker exec chatbot_app node ingest-postgres.js \
  --file /path/to/blog-post.txt \
  --source "Blog Post Title"
```

### Ingest Blog Posts (from URL)
```bash
docker exec chatbot_app node ingest-postgres.js \
  --url https://example.com/blog-post.txt \
  --source "Blog Post Title"
```

### Ingest Directory of Documents
```bash
docker exec chatbot_app node ingest-postgres.js \
  --dir /path/to/blog-posts \
  --source "Blog Collection"
```

### Custom Chunk Size
```bash
docker exec chatbot_app node ingest-postgres.js \
  --file blog-post.txt \
  --source "Blog Post" \
  --chunk-size 2000
```

---

## 🌐 Cloudflare Tunnel Setup

### Check Tunnel Status
```bash
cloudflare-cli tunnel list
# or check via dashboard: https://dash.cloudflare.com/account/cfd_tunnel
```

### If Tunnel Not Active
```bash
# Install cloudflared if not already installed
curl -L --output cloudflared.tgz https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.tgz
tar -xzf cloudflared.tgz

# Run tunnel
./cloudflared tunnel run 3fe6820f-8c27-490e-bcea-67da52227312

# Or in background (requires auth token)
./cloudflared tunnel login
./cloudflared tunnel run --credentials-file ~/.cloudflared/cert.pem 3fe6820f-8c27-490e-bcea-67da52227312
```

### Verify Access
Open browser and go to: https://chat.adi-muhamad.my.id

---

## 🔍 Monitoring

### Database Health
```bash
# Check if PostgreSQL is responding
docker exec chatbot_postgres pg_isready -U postgres -d chatbot_db
```

### API Health Check
```bash
curl https://chat.adi-muhamad.my.id/api/health
```

### View Database Tables
```bash
docker exec -it chatbot_postgres psql -U postgres -d chatbot_db -c "
  SELECT tablename FROM pg_tables WHERE schemaname='public';
"
```

### Count Ingested Documents
```bash
docker exec -it chatbot_postgres psql -U postgres -d chatbot_db -c "
  SELECT source, COUNT(*) as chunk_count FROM documents GROUP BY source;
"
```

---

## 🐛 Troubleshooting

### PostgreSQL Not Starting
```bash
# Check logs
docker-compose logs postgres

# Verify pgvector installation
docker exec chatbot_postgres psql -U postgres -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### App Container Crashes
```bash
# View logs
docker-compose logs app

# Check if port 3000 is already in use
lsof -i :3000

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Cannot Connect to Database from App
```bash
# Verify network
docker network ls | grep chatbot

# Check connectivity from app container
docker exec chatbot_app npm run ping-db
```

### OpenAI API Errors
```bash
# Verify API key in .env.local
cat .env.local | grep OPENAI_API_KEY

# Check API key validity
curl https://api.openai.com/v1/embeddings \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input": "test", "model": "text-embedding-3-small"}'
```

---

## 📈 Performance Tuning

### PostgreSQL Connection Pool
Adjust in `src/lib/postgres.ts`:
```typescript
const pool = new Pool({
  max: 20,  // max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Docker Resource Limits
Edit `docker-compose.yml`:
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '1'
          memory: 512M
```

### PostgreSQL Indexes
Check in `init.sql`:
```sql
-- IVFFLAT index for vector similarity (already created)
CREATE INDEX idx_documents_embedding ON documents 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

## 📝 Maintenance

### Daily
- Monitor logs: `docker-compose logs -f`
- Check health: `curl https://chat.adi-muhamad.my.id/api/health`

### Weekly
- Backup PostgreSQL data
- Review API usage in OpenAI dashboard

### Monthly
- Update container images: `docker pull node:20-alpine`
- Update dependencies: `npm update`
- Clean Docker system: `docker system prune -a`

### Backup PostgreSQL Data
```bash
# Create backup
docker exec chatbot_postgres pg_dump -U postgres chatbot_db > backup-$(date +%Y%m%d).sql

# Restore from backup
docker exec -i chatbot_postgres psql -U postgres chatbot_db < backup-20250514.sql
```

---

## 🎯 Next Steps

1. ✅ Deploy with `docker-compose up -d`
2. ✅ Verify access at https://chat.adi-muhamad.my.id
3. ✅ Ingest blog posts with `ingest-postgres.js`
4. ✅ Test chat at https://chat.adi-muhamad.my.id
5. ✅ Monitor logs and performance

---

**Last Updated**: May 14, 2026  
**Version**: 1.0.0
