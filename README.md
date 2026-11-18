# 🚀 Sontoloyo AI - Personal RAG Chatbot

**Personal AI Assistant untuk Blog & Ekosistem Adi Muhamad (Open-Source Educational Template)**  
**Tech Stack**: Next.js 16 + Tailwind CSS v4 (Ubuntu Yaru Design System) + PostgreSQL (`pgvector`) + OpenAI GPT-4o mini + Cloudflare Turnstile + Docker + Cloudflare Tunnel

---

## ✨ Fitur Utama

- 🤖 **RAG (Retrieval Augmented Generation)** — Menjawab pertanyaan berdasarkan knowledge base vektor di PostgreSQL `pgvector` (`text-embedding-3-small`)
- 🎨 **Ubuntu Yaru Design System** — Menggunakan palet *Warm Neutral Grey*, aksen **Ubuntu Orange (`#E95420`)**, **Canonical Aubergine (`#77216F`)**, font **Ubuntu & Ubuntu Mono**, serta toggle **Yaru Dark & Light Mode** yang tersinkron lintas subdomain
- 💬 **Real-time Streaming Chat & Starter Prompts** — Respons streaming GPT-4o mini dengan kartu sambutan interaktif, markdown formatting, serta shortcut **`Enter`** untuk mengirim pesan dan **`Shift + Enter`** untuk baris baru
- 🧠 **Web UI Import & Vector Embedding (`/admin/dashboard`)** — Tab **Knowledge Base (Vector DB)** di Admin Dashboard untuk menempel teks atau mengunggah file `.txt`/`.md`, mengatur *chunk size* & *overlap*, men-generate embedding langsung ke `pgvector`, serta menginspeksi/menghapus chunks
- 🛡️ **Admin Console & Cloudflare Turnstile** — Halaman login (`/admin`) terproteksi bot via **Cloudflare Turnstile** + verifikasi server-side (`siteverify`), dilengkapi riwayat chat, pencarian, pagination, statistik token, dan export JSON
- 🐳 **Docker Production Ready** — Multi-stage build Next.js pada port **`3001`** (`network_mode: host`) dan PostgreSQL 16 `pgvector` pada port **`127.0.0.1:5433`** dengan auto-recovery (`restart: unless-stopped`)

---

## 📊 Arsitektur Produksi

```text
Internet User
    │
    ▼
Cloudflare Edge & Tunnel (chat.adi-muhamad.my.id)
    │
    ▼  http://127.0.0.1:3001
┌──────────────────────────────────────────────────────────┐
│  chatbot_app (Next.js 16 · network_mode: host · :3001)   │
│  ├── UI Chat & Starter Prompts (Ubuntu Yaru Dark/Light)  │
│  ├── Admin Console (/admin) + Cloudflare Turnstile       │
│  ├── Web UI Knowledge Base & Vector Embedding            │
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
├── docs/                                     # Dokumentasi & panduan terpusat
│   ├── SERVER_ARCHITECTURE_AND_PORTS.md      # Peta arsitektur & port multi-aplikasi
│   ├── Tutorial-Embedding-Vector-Database.md # Tutorial lengkap embedding ke pgvector
│   ├── ubuntu-style.md                       # Panduan desain Ubuntu Yaru (Light/Dark)
│   ├── DEPLOYMENT_QUICK_START.md             # Panduan deploy cepat
│   ├── DOCKER_SETUP.md                       # Panduan konfigurasi Docker
│   ├── CLOUDFLARE_SETUP.md                   # Panduan Cloudflare Tunnel
│   ├── CONFIG_SUMMARY.md                     # Ringkasan konfigurasi
│   ├── Profil-Adi-Muhamad.md                 # Contoh data profil (Markdown)
│   └── Profil-Adi-Muhamad.txt                # Contoh data profil (Teks)
├── public/
│   ├── icons/                                # Ikon PWA berbagai resolusi
│   └── manifest.json                         # Manifest PWA (#E95420 / #1E1E1E)
├── scripts/
│   └── generate-icons.js                     # Generator ikon PWA
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── page.tsx                      # Login Admin + Cloudflare Turnstile
│   │   │   └── dashboard/page.tsx            # Dashboard (Riwayat Chat & Knowledge Base Vector DB)
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   ├── login/route.ts            # Auth admin + verifikasi Turnstile server-side
│   │   │   │   ├── knowledge/route.ts        # CRUD & Embedding teks ke PostgreSQL pgvector
│   │   │   │   ├── history/route.ts          # Query riwayat chat & pencarian
│   │   │   │   └── export/route.ts           # Export riwayat chat ke JSON
│   │   │   ├── chat/route.ts                 # Streaming RAG Chat API
│   │   │   └── health/route.ts               # Health check endpoint
│   │   ├── globals.css                       # Token warna, tipografi & komponen Ubuntu Yaru
│   │   ├── layout.tsx                        # Root layout, Google Fonts Ubuntu, PWA meta
│   │   └── page.tsx                          # Halaman utama chatbot
│   ├── components/
│   │   ├── ChatInput.tsx                     # Input pesan (Enter kirim, Shift+Enter baris baru)
│   │   ├── ChatWindow.tsx                    # Window percakapan, markdown & starter prompts
│   │   └── Navbar.tsx                        # Navbar sticky glass, status pill & theme toggle
│   └── lib/
│       ├── auth.ts                           # Helper autentikasi sesi admin berbasis env
│       ├── postgres.ts                       # Pool & query PostgreSQL pgvector
│       ├── rag.ts                            # Text chunking, embedding & similarity search
│       └── theme.ts                          # Sinkronisasi tema Light/Dark lintas subdomain
├── backup_db_sontoloyo.sql                   # Backup SQL awal (schema + contoh embeddings)
├── docker-compose.yml                        # Orkestrasi chatbot_app (:3001) & chatbot_postgres (:5433)
├── Dockerfile                                # Multi-stage Docker build (Node 20)
├── ingest-postgres.js                        # CLI script untuk ingest dokumen ke pgvector
├── init.sql                                  # Schema database dasar
├── start.sh                                  # Script otomatis build, start, & cek healthcheck
└── stop.sh                                   # Script menghentikan kontainer dengan aman (data tetap tersimpan)
```

---

## 🎯 Panduan Deployment (Untuk Fork / Mahasiswa)

### 1. Clone & Siapkan Environment Variables (`.env.local`)
Salin `.env.local.template` menjadi `.env.local` lalu isi kunci/password Anda sendiri. File `.env.local` otomatis diabaikan oleh `.gitignore` agar kredensial pribadi tidak pernah ikut ter-push ke GitHub.

```bash
cp .env.local.template .env.local
```

Isi variabel utama di `.env.local`:

```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_OPENAI_MODEL=gpt-4o-mini

# PostgreSQL (Host port 5433 untuk menghindari bentrok port 5432)
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_postgres_password_here
POSTGRES_DB=chatbot_db
DATABASE_URL=postgresql://postgres:your_postgres_password_here@localhost:5433/chatbot_db

# Aplikasi
PORT=3001
NODE_ENV=production
NEXT_PUBLIC_APP_NAME="Sontoloyo AI"
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# Cloudflare Turnstile Bot Detection (/admin) - Opsional (kosongkan jika tidak dipakai)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Admin Console Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_strong_admin_password
ADMIN_SESSION_SECRET=your_random_session_secret
```

### 2. Fungsi `start.sh` & `stop.sh`
- **`start.sh`** (`bash start.sh`): Script otomatisasi untuk menyalakan project. Script ini mengecek Docker & `.env.local` (membuat dari template jika belum ada), menjalankan `docker-compose build` & `up -d`, menunggu PostgreSQL dan Next.js siap (`http://localhost:3001/api/health`), lalu menampilkan ringkasan URL.
- **`stop.sh`** (`bash stop.sh`): Script otomatisasi untuk mematikan kontainer secara aman (`docker-compose down`) dan membersihkan kontainer yang sudah berhenti. **Volume database `postgres_data` tidak dihapus**, sehingga data chat dan embedding tetap aman saat dinyalakan kembali.

### 3. Build & Jalankan Kontainer

```bash
# Menggunakan script startup
bash start.sh

# Atau langsung via Docker Compose V2
docker compose build app && docker compose up -d
```

- **Local Web App**: `http://localhost:3001`
- **Admin Console**: `http://localhost:3001/admin`
- **Health Check**: `http://localhost:3001/api/health`

---

## 📚 Cara Menambahkan Teks & Embedding ke Vector Database

Tersedia dua cara mudah (panduan selengkapnya ada di [`docs/Tutorial-Embedding-Vector-Database.md`](docs/Tutorial-Embedding-Vector-Database.md)):

### Cara 1: Via Web UI Admin Dashboard (Direkomendasikan)
1. Buka **`/admin`** dan login ke **Admin Console**.
2. Pilih tab **`Knowledge Base (Vector DB)`**.
3. Isi **Nama Sumber / Topik**, lalu tempel teks langsung atau klik **`Muat File .txt / .md`**.
4. Atur **Chunk Size** (`1000`) & **Overlap** (`200`), lalu klik **`Proses Embedding & Simpan ke DB Vektor`**.

### Cara 2: Via CLI (`ingest-postgres.js`)
```bash
# Ingest satu file teks/markdown dari folder docs
docker exec chatbot_app node ingest-postgres.js \
  --file /app/docs/Profil-Adi-Muhamad.txt \
  --source "Profil Adi Muhamad"

# Ingest seluruh dokumen di folder docs
docker exec chatbot_app node ingest-postgres.js \
  --dir /app/docs \
  --source "Knowledge Base"
```

---

## 📖 API Reference

| Endpoint | Method | Fungsi |
| :--- | :---: | :--- |
| `/api/health` | `GET` | Status kesehatan API & koneksi PostgreSQL |
| `/api/chat` | `POST` | Streaming chat RAG dengan retrieval Top-K dari `pgvector` |
| `/api/admin/login` | `POST` / `DELETE` | Login admin (validasi Turnstile server-side + cookie `admin_session`) / Logout |
| `/api/admin/knowledge` | `GET` / `POST` / `DELETE` | Daftar sumber/chunks vektor, import & generate embedding, serta hapus dokumen |
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
- [`docs/Tutorial-Embedding-Vector-Database.md`](docs/Tutorial-Embedding-Vector-Database.md) — Tutorial lengkap embedding teks ke `pgvector` (Web UI & CLI)
- [`docs/SERVER_ARCHITECTURE_AND_PORTS.md`](docs/SERVER_ARCHITECTURE_AND_PORTS.md) — Peta arsitektur server & alokasi port
- [`docs/ubuntu-style.md`](docs/ubuntu-style.md) — Panduan Design System Ubuntu Yaru
- [`docs/DEPLOYMENT_QUICK_START.md`](docs/DEPLOYMENT_QUICK_START.md) — Panduan setup cepat
- [`docs/DOCKER_SETUP.md`](docs/DOCKER_SETUP.md) — Dokumentasi Docker & Compose
- [`docs/CLOUDFLARE_SETUP.md`](docs/CLOUDFLARE_SETUP.md) — Konfigurasi Cloudflare Tunnel
- [`docs/CONFIG_SUMMARY.md`](docs/CONFIG_SUMMARY.md) — Referensi konfigurasi proyek
