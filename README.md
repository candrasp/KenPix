# Kenpix

Kenpix adalah aplikasi desktop berbasis **Tauri + Vite + TypeScript** untuk **mengonversi gambar ke berbagai format** dengan tampilan modern dan ringan. Aplikasi ini dirancang agar proses konversi cepat, mudah dipakai, dan tetap nyaman digunakan seperti aplikasi desktop pada umumnya.

## Tentang Project

Project ini fokus pada kebutuhan utama konversi gambar:

- Drag and drop file gambar ke area utama
- Pilih format output seperti `PNG`, `JPG`, `JPEG`, `WEBP`, dan `AVIF`
- Atur lokasi penyimpanan hasil konversi
- Lihat riwayat file yang sudah dikonversi
- Buka folder output dengan cepat dari riwayat

Karena menggunakan **Tauri**, aplikasi ini tetap ringan dibanding aplikasi desktop yang dibangun dengan browser engine penuh.

## Keunggulan

- **Ringan dan cepat**  
  Tauri membuat ukuran aplikasi lebih efisien dan performanya responsif.

- **Antarmuka modern**  
  Desain gelap dengan gaya glassmorphism, ikon Lucide, dan layout yang rapi membuat aplikasi terasa profesional.

- **Mudah digunakan**  
  Alur penggunaan sederhana: pilih file, pilih format, lalu konversi.

- **Dukungan banyak format**  
  Mendukung beberapa format gambar populer untuk kebutuhan sehari-hari.

- **Manajemen output yang fleksibel**  
  Pengguna bisa memilih folder penyimpanan hasil konversi sesuai kebutuhan.

- **Riwayat konversi tersimpan lokal**  
  Riwayat file tersimpan di `localStorage`, sehingga mudah melacak hasil konversi sebelumnya tanpa database tambahan.

- **Cocok untuk desktop app**  
  Integrasi dengan fitur Tauri memungkinkan akses ke dialog folder, path file, dan interaksi sistem operasi.

## Fitur Utama

- Drag and drop file gambar
- Pemilihan format output
- Progress saat proses konversi berjalan
- Tombol batal saat konversi
- Halaman pengaturan
- Riwayat konversi
- Buka folder hasil konversi dari history

## Teknologi yang Digunakan

- **Tauri**
- **TypeScript**
- **Vite**
- **Tailwind CSS v4**
- **Lucide Icons**
- **Rust** untuk backend Tauri

## Struktur Project Singkat

- `src/` - kode frontend aplikasi
- `src-tauri/` - kode backend Tauri dan konfigurasi native
- `public/` - aset publik
- `index.html` - entry point aplikasi

## Menjalankan Project

### 1. Install dependency

```bash
npm install
```

### 2. Jalankan mode development

```bash
npm run dev
```

### 3. Build aplikasi

```bash
npm run build
```

### 4. Jalankan Tauri

```bash
npm run tauri
```

## Catatan

- Riwayat konversi disimpan secara lokal di browser storage aplikasi.
- Lokasi output default dapat diubah melalui halaman **Settings**.
- File hasil konversi akan disimpan ke subfolder sesuai format yang dipilih.

## Lisensi

Belum ditentukan.
