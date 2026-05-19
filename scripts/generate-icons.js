// scripts/generate-icons.js
// Jalankan: node scripts/generate-icons.js

import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCE_IMAGE = join(__dirname, '../src/app/icon.png');
const OUTPUT_DIR = join(__dirname, '../public/icons');
const SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512];

async function generateIcons() {
  // Pastikan folder output ada
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✅ Folder dibuat: ${OUTPUT_DIR}`);
  }

  // Cek apakah file sumber ada
  if (!existsSync(SOURCE_IMAGE)) {
    console.error(`❌ File sumber tidak ditemukan: ${SOURCE_IMAGE}`);
    process.exit(1);
  }

  console.log(`🔧 Membaca sumber icon dari: ${SOURCE_IMAGE}`);
  console.log(`📁 Output ke: ${OUTPUT_DIR}`);
  console.log('');

  for (const size of SIZES) {
    const outputFile = join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    try {
      await sharp(SOURCE_IMAGE)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 37, g: 99, b: 235, alpha: 1 }, // bg biru sesuai theme_color
        })
        .png()
        .toFile(outputFile);
      console.log(`✅ Generated: icon-${size}x${size}.png`);
    } catch (err) {
      console.error(`❌ Gagal membuat icon-${size}x${size}.png:`, err.message);
    }
  }

  console.log('\n🎉 Selesai! Semua icon berhasil dibuat.');
  console.log('📌 Jangan lupa copy icon-source.png ke public/icons/ jika belum ada.');
}

generateIcons();
