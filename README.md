# 🚀 Sontoloyo AI - Personal RAG Chatbot

**Personal AI Assistant untuk Blog & Ekosistem Adi Muhamad**  
**Tech Stack**: Next.js 16 + Tailwind CSS v4 (Ubuntu Yaru Design System) + PostgreSQL (`pgvector`) + OpenAI GPT-4o mini + Cloudflare Turnstile + Docker + Cloudflare Tunnel

---

## ✨ Fitur Utama

- 🤖 **RAG (Retrieval Augmented Generation)** — Menjawab pertanyaan berdasarkan knowledge base vektor di PostgreSQL `pgvector` (`text-embedding-3-small`)
- 🎨 **Ubuntu Yaru Design System** — Menggunakan palet *Warm Neutral Grey*, aksen **Ubuntu Orange (`#E95420`)**, **Canonical Aubergine (`#77216F`)**, font **Ubuntu & Ubuntu Mono**, serta toggle **Yaru Dark & Light Mode** yang tersinkron lintas subdomain `.adi-muhamad.my.id`
- 💬 **Real-time Streaming Chat & Starter Prompts** — Respons streaming GPT-4o mini dengan kartu sambutan interaktif, markdown formatting, serta shortcut **`Enter`** untuk mengirim pesan dan **`Shift + Enter`** untuk baris baru
- 🛡️ **Admin Console & Cloudflare Turnstile** — Halaman login (`/admin`) terproteksi bot via **Cloudflare Turnstile** + verifikasi server-side (`siteverify`), dilengkapi dashboard riwayat chat (`/admin/dashboard`), pencarian, pagination, statistik token, dan export JSON
- 🐳 **Docker Production Ready** — Multi-stage build Next.js pada port **`3001`** (`network_mode: host`) dan PostgreSQL 16 `pgvector` pada port **`127.0.0.1:5433`** dengan auto-recovery (`restart: unless-stopped`)

---

## 📊 Arsitektur Produksi

```text
Internet User
    │
    ▼
Cloudflare Edge & Tunnel (LXC 100 · chat.adi-muhamad.my.id)
    │
    ▼  http://192.168.1.102:3001
┌──────────────────────────────────────────────────────────┐
│  chatbot_app (Next.js 16 · network_mode: host · :3001)   │
│  ├── UI Chat & Starter Prompts (Ubuntu Yaru Dark/Light)  │
│  ├── Admin Console (/admin) + Cloudflare Turnstile       │
│  ├── OpenAI GPT-4o mini (Chat) & Embeddings              │
│  └── PostgreSQL Client (localhost:5433)                  │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼  127.0.0.1:5433 -> 5432
┌──────────────────────────────────────────────────────────┐
│  chatbot_postgres (pgvector/pgvector:pg16)               │
│  ├── documents (chunks + vector 1536 dimensi)            │
│  ├── chat_history (riwayat percakapan & token usage)     │
│  └── ingest_metadata (riwayat ingest dokumen)            │
└──────────────────────────────────────────────────────────┘
```

---

## 📁 Struktur Direktori Proyek

```text
chat-adimuhamad/
├── docs/                                   # Dokumentasi & knowledge base terpusat
│   ├── SERVER_ARCHITECTURE_AND_PORTS.md    # Peta arsitektur & port multi-aplikasi VM 102
│   ├── ubuntu-style.md                     # Panduan desain Ubuntu Yaru (Light/Dark)
│   ├── DEPLOYMENT_QUICK_START.md           # Panduan deploy cepat
│   ├── DOCKER_SETUP.md                     # Panduan konfigurasi Docker
│   ├── CLOUDFLARE_SETUP.md                 # Panduan Cloudflare Tunnel
│   ├── CONFIG_SUMMARY.md                   # Ringkasan konfigurasi
│   ├── Profil-Adi-Muhamad.md               # Sumber data profil (Markdown)
│   ├── Profil-Adi-Muhamad.txt              # Sumber data profil (Teks)
│   └── Tutorial-Embedding-Vector-Database.txt
├── public/
│   ├── icons/                              # Ikon PWA berbagai resolusi
│   └── manifest.json                       # Manifest PWA (#E95420 / #1E1E1E)
├── scripts/
│   └── generate-icons.js                   # Generator ikon PWA
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── page.tsx                    # Login Admin + Cloudflare Turnstile
│   │   │   └── dashboard/page.tsx          # Dashboard riwayat chat, statistik & export
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   ├── login/route.ts          # Auth admin + verifikasi Turnstile server-side
│   │   │   │   ├── history/route.ts        # Query riwayat chat & pencarian
│   │   │   │   └── export/route.ts         # Export riwayat chat ke JSON
│   │   │   ├── chat/route.ts               # Streaming RAG Chat API
│   │   │   └── health/route.ts             # Health check endpoint
│   │   ├── globals.css                     # Token warna, tipografi & komponen Ubuntu Yaru
│   │   ├── layout.tsx                      # Root layout, Google Fonts Ubuntu, PWA meta
│   │   └── page.tsx                        # Halaman utama chatbot
│   ├── components/
│   │   ├── ChatInput.tsx                   # Input pesan (Enter kirim, Shift+Enter baris baru)
│   │   ├── ChatWindow.tsx                  # Window percakapan, markdown & starter prompts
│   │   └── Navbar.tsx                      # Navbar sticky glass, status pill & theme toggle
│   └── lib/
│       ├── auth.ts                         # Helper autentikasi sesi admin
│       ├── postgres.ts                     # Pool & query PostgreSQL pgvector
│       ├── rag.ts                          # Embedding & vector similarity search
│       └── theme.ts                        # Sinkronisasi tema Light/Dark lintas subdomain
├── backup_db_sontoloyo.sql                 # Backup SQL awal (schema + embeddings)
├── docker-compose.yml                      # Orkestrasi chatbot_app (:3001) & chatbot_postgres (:5433)
├── Dockerfile                              # Multi-stage Docker build (Node 20)
├── ingest-postgres.js                      # CLI script untuk ingest dokumen ke pgvector
├── init.sql                                # Schema database dasar
├── start.sh                                # Script startup Docker
└── stop.sh                                 # Script shutdown Docker
```

---

## 🎯 Panduan Deployment

### 1. Siapkan Environment Variables (`.env.local`)
Salin template lalu sesuaikan nilainya (file `.env.local` otomatis diabaikan oleh Git):

```bash
cp .env.local.template .env.local
```

Variabel utama yang digunakan di `.env.local`:

```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_OPENAI_MODEL=gpt-4o-mini

# PostgreSQL (Host VM port 5433 untuk mencegah bentrok port 5432)
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_USER=postgres
POSTGRES_PASSWORD=K9mP5vX2wQ9zL4tY6eW8aN3
POSTGRES_DB=chatbot_db
DATABASE_URL=postgresql://postgres:K9mP5vX2wQ9zL4tY6eW8aN3@localhost:5433/chatbot_db

# Aplikasi
PORT=3001
NODE_ENV=production
NEXT_PUBLIC_APP_NAME="Sontoloyo AI"
NEXT_PUBLIC_SITE_URL=https://chat.adi-muhamad.my.id

# Cloudflare Turnstile Bot Detection (/admin)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key_here
TURNSTILE_SECRET_KEY=your_turnstile_secret_key_here
```

### 2. Build & Jalankan Kontainer

```bash
# Menggunakan script startup
bash start.sh

# Atau langsung via Docker Compose
docker compose build app && docker compose up -d
```

- **Local Web App**: `http://localhost:3001`
- **Admin Console**: `http://localhost:3001/admin`
- **Health Check**: `http://localhost:3001/api/health`
- **Public URL**: `https://chat.adi-muhamad.my.id`

---

## 📚 Data Ingestion ke Vector Database

```bash
# Ingest satu file teks/markdown dari folder docs
docker exec chatbot_app node ingest-postgres.js \
  --file /app/docs/Profil-Adi-Muhamad.txt \
  --source "Profil Adi Muhamad"

# Ingest seluruh dokumen di folder docs
docker exec chatbot_app node ingest-postgres.js \
  --dir /app/docs \
  --source "Knowledge Base"

# Ingest dari URL eksternal
docker exec chatbot_app node ingest-postgres.js \
  --url https://example.com/artikel.txt \
  --source "Artikel Eksternal"
```

---

## 📖 API Reference

| Endpoint | Method | Fungsi |
| :--- | :---: | :--- |
| `/api/health` | `GET` | Status kesehatan API & koneksi PostgreSQL |
| `/api/chat` | `POST` | Streaming chat RAG dengan retrieval Top-K dari `pgvector` |
| `/api/admin/login` | `POST` / `DELETE` | Login admin (validasi Turnstile server-side + cookie `admin_session`) / Logout |
| `/api/admin/history` | `GET` | Mengambil riwayat chat dengan pagination & filter pencarian (`?page=1&limit=15&search=`) |
| `/api/admin/export` | `GET` | Mengunduh seluruh riwayat chat dalam format JSON |

---

## 📊 Monitoring & Backup Database

```bash
# Cek status kontainer & kesehatan
docker compose ps
curl -s http://localhost:3001/api/health

# Melihat log aplikasi & database
docker compose logs -f app
docker compose logs -f postgres

# Cek statistik dokumen & chat di PostgreSQL
docker exec chatbot_postgres psql -U postgres -d chatbot_db -c \
  "SELECT source, COUNT(*) FROM documents GROUP BY source;"
docker exec chatbot_postgres psql -U postgres -d chatbot_db -c \
  "SELECT COUNT(*) AS total_chat FROM chat_history;"

# Backup & Restore database
docker exec chatbot_postgres pg_dump -U postgres -d chatbot_db > backup_db_sontoloyo.sql
cat backup_db_sontoloyo.sql | docker exec -i chatbot_postgres psql -U postgres -d chatbot_db
```

---

## 📁 Dokumentasi Lengkap (`docs/`)

Seluruh panduan teknis dan referensi konfigurasi tersimpan terpusat di dalam folder [`docs/`](docs/):
- [`docs/SERVER_ARCHITECTURE_AND_PORTS.md`](docs/SERVER_ARCHITECTURE_AND_PORTS.md) — Peta arsitektur server & alokasi port VM 102
- [`docs/ubuntu-style.md`](docs/ubuntu-style.md) — Panduan Design System Ubuntu Yaru
- [`docs/DEPLOYMENT_QUICK_START.md`](docs/DEPLOYMENT_QUICK_START.md) — Panduan setup cepat
- [`docs/DOCKER_SETUP.md`](docs/DOCKER_SETUP.md) — Dokumentasi Docker & Compose
- [`docs/CLOUDFLARE_SETUP.md`](docs/CLOUDFLARE_SETUP.md) — Konfigurasi Cloudflare Tunnel
- [`docs/CONFIG_SUMMARY.md`](docs/CONFIG_SUMMARY.md) — Referensi konfigurasi proyek
