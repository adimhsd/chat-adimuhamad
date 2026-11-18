# 🧠 Tutorial Lengkap: Menambahkan Teks & Embedding ke Vector Database (`pgvector`)

Panduan ini disusun untuk membantu mahasiswa dan pengembang yang mem-fork proyek **Sontoloyo AI** memahami cara kerja *Retrieval-Augmented Generation (RAG)* sekaligus mengisi pengetahuan (*knowledge base*) ke dalam PostgreSQL `pgvector`.

---

## 1. Konsep Singkat: Bagaimana Teks Menjadi Pengetahuan Chatbot?

1. **Text Chunking (Pemotongan Teks)**: Dokumen panjang dipecah menjadi potongan kecil (*chunks*), misalnya `1000` karakter dengan *overlap* `200` karakter agar konteks kalimat di perbatasan antar-chunk tidak terputus.
2. **Embedding Generation**: Setiap chunk dikirim ke model OpenAI **`text-embedding-3-small`** untuk diubah menjadi vektor angka berdimensi **1536**.
3. **Vector Storage (`pgvector`)**: Teks dan vektor disimpan ke tabel `documents` di PostgreSQL.
4. **Similarity Search (Saat Chat)**: Pertanyaan pengguna juga diubah menjadi vektor 1536 dimensi, lalu dicari top-K dokumen paling mirip menggunakan operator cosine distance (`embedding <=> query_embedding`).

---

## 2. Cara 1 — Import & Embedding Langsung via Web UI Admin (Paling Mudah)

Anda tidak perlu membuka terminal jika ingin menambahkan artikel, FAQ, atau materi kuliah:

1. Buka halaman Admin di browser: **`http://localhost:3001/admin`** (atau `https://chat.adi-muhamad.my.id/admin`).
2. Login menggunakan email & password admin yang diatur di `.env.local` (dan selesaikan verifikasi Cloudflare Turnstile jika diaktifkan).
3. Klik tab **`Knowledge Base (Vector DB)`**.
4. Pada panel **Import & Embed Dokumen**:
   - **Nama Sumber / Topik**: Isi judul unik, misalnya `Materi Bisnis Digital Pertemuan 1`.
   - **Konten Teks**: Tempelkan teks langsung di textarea **atau** klik tombol **`Muat File .txt / .md`** untuk membaca isi file dari komputer Anda secara otomatis.
   - **Chunk Size & Overlap**: Standar optimal adalah `1000` karakter dan overlap `200` karakter.
   - **Mode Simpan**:
     - `Timpa (replace)`: Menghapus chunk lama dengan nama sumber yang sama sebelum memasukkan yang baru (cocok untuk update artikel).
     - `Tambah (append)`: Menambahkan chunk baru di belakang chunk yang sudah ada pada sumber yang sama.
5. Klik **`Proses Embedding & Simpan ke DB Vektor`**.
6. Tunggu beberapa detik hingga muncul notifikasi sukses. Anda juga bisa klik ikon **👁️ (Lihat Chunks)** atau **🗑️ (Hapus)** pada tabel dokumen di sebelah kanan.

---

## 3. Cara 2 — Import & Embedding via CLI (`ingest-postgres.js`)

Cara ini cocok untuk mengimpor banyak file sekaligus atau dokumen berukuran sangat besar (>150 chunks).

> **Prasyarat**: Kontainer `chatbot_postgres` dan `chatbot_app` sudah berjalan (`bash start.sh`), serta `OPENAI_API_KEY` valid di `.env.local`.

### A. Dari Satu File (`.txt` atau `.md`)
```bash
docker exec chatbot_app node ingest-postgres.js \
  --file /app/docs/Profil-Adi-Muhamad.txt \
  --source "Profil Adi Muhamad"
```

### B. Dari Seluruh File di Satu Folder
```bash
docker exec chatbot_app node ingest-postgres.js \
  --dir /app/docs \
  --source "Koleksi Pengetahuan Blog"
```

### C. Dari URL Publik
```bash
docker exec chatbot_app node ingest-postgres.js \
  --url https://example.com/artikel.txt \
  --source "Artikel Eksternal"
```

### D. Dengan Custom Chunk Size
```bash
docker exec chatbot_app node ingest-postgres.js \
  --file /app/docs/Profil-Adi-Muhamad.md \
  --source "Profil Singkat" \
  --chunk-size 800
```

> **Catatan**: Jika menjalankan `node ingest-postgres.js` langsung di host (tanpa Docker), pastikan Node.js terpasang dan `POSTGRES_HOST=localhost`, `POSTGRES_PORT=5433` sudah sesuai di `.env.local`.

---

## 4. Cara 3 — Backup & Restore SQL (`pg_dump` / `psql`)

Jika Anda ingin memindahkan database vektor tanpa memakan kuota embedding OpenAI ulang:

### Membuat Backup
```bash
docker exec chatbot_postgres pg_dump -U postgres -d chatbot_db > backup_db_sontoloyo.sql
```

### Me-restore Backup
```bash
cat backup_db_sontoloyo.sql | docker exec -i chatbot_postgres psql -U postgres -d chatbot_db
```

---

## 5. Verifikasi & Struktur Tabel Database

### Cek Jumlah Dokumen per Sumber
```bash
docker exec chatbot_postgres psql -U postgres -d chatbot_db -c \
  "SELECT source, COUNT(*) AS total_chunks, SUM(LENGTH(content)) AS total_chars FROM documents GROUP BY source;"
```

### Skema Tabel `documents` (`init.sql`)
```sql
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  source VARCHAR(255) NOT NULL,
  embedding vector(1536),
  chunk_index INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. Tips & Troubleshooting

- **Ukuran Chunk Optimal**: Gunakan `800–1200` karakter agar setiap potongan cukup fokus untuk cosine similarity, tetapi tidak kehilangan konteks paragraf.
- **Re-ingestion Otomatis**: Mode *Replace* (dan script `ingest-postgres.js`) otomatis menghapus entri lama dengan `source` yang sama agar tidak terjadi duplikasi jawaban.
- **Error `OPENAI_API_KEY`**: Pastikan API key valid dan memiliki saldo/kuota aktif pada platform OpenAI.
- **Database Tidak Terkoneksi**: Pastikan container `chatbot_postgres` berstatus `healthy` (`docker compose ps`).
