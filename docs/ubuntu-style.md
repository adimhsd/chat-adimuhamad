# Ubuntu Yaru Design System & Theme Guide (`style-ubuntu.md`)

Dokumen ini menjadi acuan utama (*single source of truth*) konfigurasi warna, tipografi, komponen UI, dan mekanisme **Light Mode & Dark Mode** berbasis **Ubuntu Yaru Theme** untuk seluruh ekosistem web Adi Muhamad Muhsidi:
- **Landing Page Utama:** `https://adi-muhamad.my.id` (`index.html`)
- **Blog WordPress (Blocksy):** `https://blog.adi-muhamad.my.id`
- **Web App & Layanan Lainnya:** Chatbot RAG (`chat.adi-muhamad.my.id`), Exam AI System (`exam.adi-muhamad.my.id`), dan aplikasi internal lainnya.

---

## 1. Filosofi Desain & Identitas Visual

Desain antarmuka mengadopsi karakter **Ubuntu Yaru Modern (GTK/Libadwaita)** dengan prinsip:
1. **Netral Hangat (*Warm Neutral Grey*):** Menghindari warna gelap bernuansa biru dingin (*cool slate* seperti `#090d16` atau `#0f172a`) dan menghindari putih/hitam ekstrem (`#000000` murni) untuk menjaga kenyamanan mata dan hierarki kedalaman lapisan (*surface elevation*).
2. **Aksen Identitas Ubuntu & Canonical:**
   - **Ubuntu Orange (`#E95420`):** Aksi utama (*primary button*), tautan aktif, ikon aksen, angka statistik, dan highlight interaktif.
   - **Canonical Aubergine (`#77216F`, `#5E2750`, `#2C001E`):** Aksen sekunder, garis kutipan, badge akademik, avatar glow, dan gradien suasana latar belakang.
3. **Konsistensi Mode Gelap & Terang:** Warna brand tetap konsisten, sementara permukaan (*surface*), teks, bayangan (*shadow*), dan warna semantik menyesuaikan agar rasio kontras tetap optimal di kedua mode.

---

## 2. Tipografi & Skala Ukuran Responsif

### Import Google Fonts
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,400&family=Ubuntu+Mono:wght@400;700&display=swap" rel="stylesheet">
```

### Aturan Jenis Font
- **Font Utama (`body`, heading, tombol, paragraf):** `'Ubuntu', -apple-system, BlinkMacSystemFont, sans-serif`
- **Font Monospace (`eyebrow`, `badge`, `label`, `tahun`, potongan tech stack, metadata infra):** `'Ubuntu Mono', monospace`

### Skala Ukuran Desktop vs Mobile (`<= 768px`)

| Token CSS | Fungsi | Desktop (`:root`) | Mobile (`<= 768px`) |
| :--- | :--- | :--- | :--- |
| `--fs-hero-name` | Judul / Nama Utama (`h1`) | `1.75rem` | `1.12rem` |
| `--fs-hero-role` | Daftar peran / jabatan di hero | `1.05rem` | `0.8rem` |
| `--fs-hero-bio` | Paragraf bio utama | `1rem` | `0.78rem` |
| `--fs-section-title` | Judul seksi (`h2`) | `1.75rem` | `1.12rem` |
| `--fs-card-title` | Judul kartu (`h3`) | `1.12rem` | `0.9rem` |
| `--fs-body` | Teks isi kartu, daftar, dan refleksi | `0.92rem` | `0.76rem` |
| `--fs-stat-val` | Angka statistik utama | `1.65rem` | `1.15rem` |
| `--avatar-size` | Ukuran foto profil | `240px` | `145px` |
| `--section-pad` | Padding vertikal antar seksi | `1.6rem` | `0.95rem` |

---

## 3. Token Warna Utama (Brand, Surfaces, Teks & Border)

### A. Warna Identitas & Aksen Utama (Konsisten di Light & Dark)

| Token | Nilai Hex / RGBA | Catatan Penggunaan |
| :--- | :--- | :--- |
| `--color-primary` | `#E95420` | Ubuntu Orange: tombol utama, link hover, eyebrow, stat value |
| `--color-primary-hover` | `#D44615` | Status `:hover` pada tombol/aksi utama |
| `--color-primary-active` | `#C03D10` | Status `:active` / saat ditekan |
| `--color-aubergine` | `#77216F` | Canonical Aubergine terang: aksen sekunder & border quote |
| `--color-aubergine-mid` | `#5E2750` | Aubergine sedang: variasi elemen sekunder |
| `--color-aubergine-dark` | `#2C001E` | Aubergine gelap: gradien ambient, sidebar, atau quote banner |
| `--focus-ring` | `rgba(233, 84, 32, 0.35)` | Ring fokus aksesibilitas pada tombol, link, dan input |

### B. Perbandingan Token Light Mode (`Yaru Light`) vs Dark Mode (`Yaru Dark`)

| Token | Light Mode (`:root`) | Dark Mode (`[data-theme="dark"]`) | Fungsi |
| :--- | :--- | :--- | :--- |
| `--bg-base` / `--bg-dark` | `#FAFAFA` | `#1E1E1E` | Kanvas utama `body` halaman |
| `--bg-surface` | `#FFFFFF` | `#2C2C2C` | Latar konten dasar & media |
| `--bg-elevated` | `#F2F2F2` | `#242424` | Top bar, panel sekunder, area pill/tag |
| `--bg-hover` | `#EAEAEA` | `#363636` | Efek hover pada kartu & elemen interaktif |
| `--bg-navbar` | `rgba(242, 242, 242, 0.9)` | `rgba(36, 36, 36, 0.9)` | Navbar sticky transparan dengan `backdrop-filter: blur(16px)` |
| `--bg-card` | `#FFFFFF` | `#2C2C2C` | Kartu konten, tab, tombol sekunder, map card |
| `--bg-card-hover` | `#EAEAEA` | `#363636` | Efek hover pada `.card` dan `.pub-item` |
| `--bg-tag` | `#F2F2F2` | `#242424` | Tag keahlian, kotak ikon kontak, label tahun |
| `--bg-quote` | `linear-gradient(135deg, rgba(233, 84, 32, 0.07), rgba(119, 33, 111, 0.08))` | `linear-gradient(135deg, rgba(119, 33, 111, 0.24), rgba(44, 0, 30, 0.55))` | Banner kutipan & refleksi filosofi hidup |
| `--text-primary` | `#111111` | `#F7F7F7` | Judul, nama utama, teks prioritas tinggi |
| `--text-secondary` | `#3D3D3D` | `#D4D4D4` | Paragraf bio, daftar peran, tautan navbar |
| `--text-muted` | `#5E5E5E` | `#B0B0B0` | Deskripsi seksi, isi kartu, metadata publikasi |
| `--text-disabled` | `#999999` | `#6E6E6E` | Placeholder input dan teks nonaktif (*disabled*) |
| `--border-subtle` | `#DCDCDC` | `#3D3D3D` | Garis pembatas seksi, border kartu, navbar |
| `--border-highlight` | `rgba(233, 84, 32, 0.5)` | `rgba(233, 84, 32, 0.55)` | Border kartu/tombol saat `:hover` |
| `--shadow-card` | `0 2px 6px rgba(0, 0, 0, 0.06)` | `0 2px 8px rgba(0, 0, 0, 0.35)` | Elevasi halus pada kartu dan tombol toggle |

> **Catatan Ergonomi Kontras Teks:** Token `--text-muted` pada layout kartu dan deskripsi tetap dijaga di `#5E5E5E` (Light) dan `#B0B0B0` (Dark) agar teks paragraf nyaman dibaca, sedangkan warna `#999999` / `#6E6E6E` ditempatkan khusus di `--text-disabled` untuk placeholder dan elemen nonaktif.

---

## 4. Warna Semantik, Status & Badge

| Peran Semantik | Token | Light Mode | Dark Mode | Contoh Penggunaan |
| :--- | :--- | :--- | :--- | :--- |
| **Primary / Orange** | `--accent-cyan` / `--accent-blue` | `#E95420` | `#E95420` | Eyebrow seksi, angka statistik, `.badge-cyan` |
| **Aubergine** | `--accent-indigo` / `--badge-aubergine-text` | `#77216F` | `#77216F` / `#E49CE0` | `.hero-quote`, `.badge-indigo` (teks terang di dark mode) |
| **Success (Hijau)** | `--accent-emerald` | `#0E8420` | `#26A269` | Status aktif, indikator online, `.badge-emerald` |
| **Warning (Amber)** | `--accent-amber` | `#E99B00` | `#F5C211` | Highlight pelatihan/edtech/PWA, `.badge-amber` |
| **Danger / Error** | `--accent-danger` | `#C7162B` | `#E01B24` | Alert error, validasi gagal, tombol destruktif |
| **Info (Biru)** | `--accent-info` | `#19B6EE` | `#3584E4` | Notifikasi informatif & tooltip |

### Gaya Badge Kategori (`.card-badge`)
```css
.badge-cyan {
    background: rgba(233, 84, 32, 0.12);
    color: var(--color-primary);
    border: 1px solid rgba(233, 84, 32, 0.32);
}

.badge-indigo {
    background: rgba(119, 33, 111, 0.14);
    color: var(--badge-aubergine-text);
    border: 1px solid rgba(119, 33, 111, 0.35);
}

.badge-emerald {
    background: rgba(38, 162, 105, 0.12);
    color: var(--accent-emerald);
    border: 1px solid rgba(38, 162, 105, 0.32);
}

.badge-amber {
    background: rgba(233, 155, 0, 0.12);
    color: var(--accent-amber);
    border: 1px solid rgba(233, 155, 0, 0.32);
}
```

---

## 5. Master CSS Variables (Siap Salin)

```css
:root {
    /* Pengaturan Ukuran Responsif (Desktop) */
    --fs-hero-name: 1.75rem;
    --fs-hero-role: 1.05rem;
    --fs-hero-bio: 1rem;
    --fs-section-title: 1.75rem;
    --fs-card-title: 1.12rem;
    --fs-body: 0.92rem;
    --fs-stat-val: 1.65rem;
    --avatar-size: 240px;
    --section-pad: 1.6rem;

    /* Ubuntu Brand & Accent */
    --color-primary: #e95420;
    --color-primary-hover: #d44615;
    --color-primary-active: #c03d10;
    --color-aubergine: #77216f;
    --color-aubergine-mid: #5e2750;
    --color-aubergine-dark: #2c001e;
    --focus-ring: rgba(233, 84, 32, 0.35);

    /* Light Mode Surfaces (Yaru Light) */
    --bg-base: #fafafa;
    --bg-dark: #fafafa;
    --bg-surface: #ffffff;
    --bg-elevated: #f2f2f2;
    --bg-hover: #eaeaea;
    --bg-navbar: rgba(242, 242, 242, 0.9);
    --bg-card: #ffffff;
    --bg-card-hover: #eaeaea;
    --bg-tag: #f2f2f2;
    --bg-quote: linear-gradient(135deg, rgba(233, 84, 32, 0.07), rgba(119, 33, 111, 0.08));

    /* Light Mode Typography & Borders */
    --text-primary: #111111;
    --text-secondary: #3d3d3d;
    --text-muted: #5e5e5e;
    --text-disabled: #999999;
    --border-subtle: #dcdcdc;
    --border-highlight: rgba(233, 84, 32, 0.5);
    --shadow-card: 0 2px 6px rgba(0, 0, 0, 0.06);

    /* Semantic & Mapped Accent Tokens (Light) */
    --accent-cyan: #e95420;
    --accent-blue: #e95420;
    --accent-indigo: #77216f;
    --accent-emerald: #0e8420;
    --accent-amber: #e99b00;
    --accent-danger: #c7162b;
    --accent-info: #19b6ee;
    --badge-aubergine-text: #77216f;
}

@media (max-width: 768px) {
    :root {
        --fs-hero-name: 1.12rem;
        --fs-hero-role: 0.8rem;
        --fs-hero-bio: 0.78rem;
        --fs-section-title: 1.12rem;
        --fs-card-title: 0.9rem;
        --fs-body: 0.76rem;
        --fs-stat-val: 1.15rem;
        --avatar-size: 145px;
        --section-pad: 0.95rem;
    }
}

[data-theme="dark"] {
    /* Dark Mode Surfaces (Warm Dark Grey khas Yaru) */
    --bg-base: #1e1e1e;
    --bg-dark: #1e1e1e;
    --bg-surface: #2c2c2c;
    --bg-elevated: #242424;
    --bg-hover: #363636;
    --bg-navbar: rgba(36, 36, 36, 0.9);
    --bg-card: #2c2c2c;
    --bg-card-hover: #363636;
    --bg-tag: #242424;
    --bg-quote: linear-gradient(135deg, rgba(119, 33, 111, 0.24), rgba(44, 0, 30, 0.55));

    /* Dark Mode Typography & Borders */
    --text-primary: #f7f7f7;
    --text-secondary: #d4d4d4;
    --text-muted: #b0b0b0;
    --text-disabled: #6e6e6e;
    --border-subtle: #3d3d3d;
    --border-highlight: rgba(233, 84, 32, 0.55);
    --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.35);

    /* Semantic & Mapped Accent Tokens (Dark) */
    --accent-cyan: #e95420;
    --accent-blue: #e95420;
    --accent-indigo: #77216f;
    --accent-emerald: #26a269;
    --accent-amber: #f5c211;
    --accent-danger: #e01b24;
    --accent-info: #3584e4;
    --badge-aubergine-text: #e49ce0;
}

body {
    font-family: 'Ubuntu', -apple-system, BlinkMacSystemFont, sans-serif;
    background-color: var(--bg-base);
    background-image:
        radial-gradient(circle at 10% 10%, rgba(233, 84, 32, 0.08), transparent 35%),
        radial-gradient(circle at 90% 25%, rgba(119, 33, 111, 0.1), transparent 35%),
        radial-gradient(circle at 50% 85%, rgba(44, 0, 30, 0.08), transparent 40%);
    color: var(--text-primary);
    line-height: 1.5;
    transition: background-color 0.25s ease, color 0.25s ease;
}
```

---

## 6. Standar Komponen UI (Radius & Pola Bentuk)

Aturan sudut membulat (*border radius*) mengikuti gaya GTK/Yaru modern:
- **Badge kecil & year pill (`.card-badge`, `.pub-year`):** `6px`
- **Tombol, input, tab, link navigasi, tag (`.btn`, `.tab-btn`, `.tag`):** `8px`
- **Kartu, statistik, item daftar, kotak peta, banner kutipan (`.card`, `.stat-card`, `.pub-item`, `.contact-card`, `.map-card`, `.quote-banner`):** `12px`
- **Pill status & theme toggle (`.status-pill`, `.persona-tag`, `.theme-toggle`):** `999px`

### Pola Komponen Kunci
```css
/* Primary Button */
.btn {
    border-radius: 8px;
    border: 1px solid var(--border-subtle);
    background: var(--bg-card);
    color: var(--text-primary);
}
.btn-primary {
    background: var(--color-primary);
    border-color: transparent;
    color: #fff;
    box-shadow: 0 6px 16px -4px rgba(233, 84, 32, 0.45);
}
.btn-primary:hover { background: var(--color-primary-hover); }
.btn-primary:active { background: var(--color-primary-active); }

/* Tab & Filter Aktif */
.tab-btn { border-radius: 8px; }
.tab-btn.active, .tab-btn:hover {
    background: rgba(233, 84, 32, 0.14);
    border-color: var(--color-primary);
    color: var(--text-primary);
}

/* Status Aktif / Online */
.status-pill {
    background: #242424;
    border: 1px solid rgba(38, 162, 105, 0.45);
    color: #26a269;
    border-radius: 999px;
}

/* Persona Tag */
.persona-tag {
    font-family: 'Ubuntu Mono', monospace;
    color: var(--color-primary);
    background: rgba(233, 84, 32, 0.12);
    border: 1px solid rgba(233, 84, 32, 0.32);
    border-radius: 999px;
}
```

---

## 7. Mekanisme Theme Toggle (Light / Dark Mode)

Setel atribut default `data-theme="dark"` langsung pada tag `<html>` agar halaman tidak mengalami *flash of light theme* saat baru dimuat:

```html
<html lang="id" class="scroll-smooth" data-theme="dark">
```

Gunakan skrip berikut untuk membaca preferensi dari `localStorage` dan menyinkronkan tombol toggle:

```html
<button type="button" class="theme-toggle" id="theme-toggle-btn" onclick="toggleTheme()" aria-label="Ganti Tema Terang/Gelap">
    <span id="theme-icon">☀️</span>
    <span id="theme-label">Light</span>
</button>

<script>
    function applyTheme(theme) {
        const root = document.documentElement;
        const icon = document.getElementById('theme-icon');
        const label = document.getElementById('theme-label');
        const resolved = theme === 'light' ? 'light' : 'dark';
        root.setAttribute('data-theme', resolved);
        if (resolved === 'light') {
            if (icon) icon.textContent = '🌙';
            if (label) label.textContent = 'Dark';
        } else {
            if (icon) icon.textContent = '☀️';
            if (label) label.textContent = 'Light';
        }
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        const next = current === 'light' ? 'dark' : 'light';
        localStorage.setItem('adi_lp_theme', next);
        applyTheme(next);
    }

    (function initTheme() {
        const saved = localStorage.getItem('adi_lp_theme') || 'dark';
        applyTheme(saved);
    })();
</script>
```

> **Tips Ekosistem Subdomain:** Jika ingin tema yang dipilih di `adi-muhamad.my.id` ikut terbaca di subdomain lain (`blog.adi-muhamad.my.id`, `chat.adi-muhamad.my.id`, dll.), simpan preferensi tema melalui cookie domain `.adi-muhamad.my.id` selain `localStorage`.

---

## 8. Panduan Integrasi ke Aplikasi Lain

### A. WordPress / Blocksy (`blog.adi-muhamad.my.id`)
Saat menyesuaikan palet warna global di **Blocksy Customizer -> Colors** atau **Additional CSS**:
1. **Base Font:** Pilih **Ubuntu** untuk body & headings, serta **Ubuntu Mono** untuk metadata/kode/badge.
2. **Global Color Palette Mapping (Blocksy):**
   - **Color 1 (Primary Accent):** `#E95420`
   - **Color 2 (Hover Accent):** `#D44615`
   - **Color 3 (Headings / Primary Text):** `#111111` (Light) atau `#F7F7F7` (Dark)
   - **Color 4 (Body Text):** `#3D3D3D` / `#5E5E5E` (Light) atau `#D4D4D4` / `#B0B0B0` (Dark)
   - **Color 5 (Border / Divider):** `#DCDCDC` (Light) atau `#3D3D3D` (Dark)
   - **Color 6 (Surface / Card / Header):** `#FFFFFF` / `#F2F2F2` (Light) atau `#2C2C2C` / `#242424` (Dark)
   - **Color 7 (Site Background):** `#FAFAFA` (Light) atau `#1E1E1E` (Dark)
   - **Color 8 (Secondary Aubergine):** `#77216F` (atau `#2C001E` untuk banner/header gelap).
3. Apabila Blocksy menyediakan **Dark Mode Color Switcher** atau custom toggle JS, gunakan atribut `[data-theme="dark"]` dan warna *Warm Dark Grey* yang sama agar konsisten dengan halaman utama.

### B. Web App React / Next.js + Tailwind CSS
Untuk aplikasi seperti `exam.adi-muhamad.my.id` atau `chat.adi-muhamad.my.id`:
1. Salin blok `:root` dan `[data-theme="dark"]` dari **Bagian 5** ke file `globals.css`.
2. Petakan ke konfigurasi `tailwind.config.js` (atau `@theme` pada Tailwind v4) memakai CSS variables:
   ```js
   theme: {
     extend: {
       fontFamily: {
         sans: ['Ubuntu', 'sans-serif'],
         mono: ['Ubuntu Mono', 'monospace'],
       },
       colors: {
         ubuntu: {
           orange: '#E95420',
           orangeHover: '#D44615',
           orangeActive: '#C03D10',
           aubergine: '#77216F',
           aubergineMid: '#5E2750',
           aubergineDark: '#2C001E',
         },
         surface: {
           base: 'var(--bg-base)',
           card: 'var(--bg-surface)',
           elevated: 'var(--bg-elevated)',
           hover: 'var(--bg-hover)',
         },
         ink: {
           primary: 'var(--text-primary)',
           secondary: 'var(--text-secondary)',
           muted: 'var(--text-muted)',
           disabled: 'var(--text-disabled)',
         },
         line: 'var(--border-subtle)',
       },
     },
   }
   ```
3. Gunakan `darkMode: ['selector', '[data-theme="dark"]']` di Tailwind v3/v4 agar kelas `dark:` sinkron otomatis dengan atribut `data-theme="dark"`.


