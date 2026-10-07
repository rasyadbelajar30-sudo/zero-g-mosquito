# 🦟 Zero-G Mosquito — Radar & AI Epidemiologi

> **Sistem Pemantauan Epidemiologi Cerdas, Radar Titik Genangan Realtime & AI Vision Deteksi Sarang Jentik Nyamuk (PWA Ready)**

[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-8E75B2?logo=google&logoColor=white)](https://ai.google.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime_PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![PWA](https://img.shields.io/badge/PWA-Installable-blueviolet)](https://web.dev/progressive-web-apps/)

---

## 🌟 Fitur Utama

### 1. 🛰️ Radar Genangan & Geofencing Proximity
- **Peta Interaktif Realtime**: Pemetaan titik genangan air menggunakan **Leaflet** & data sinkronisasi WebSocket via **Supabase Realtime**.
- **Zona Bahaya 150m**: Lingkaran radius jangkauan terbang nyamuk *Aedes aegypti* / *Anopheles*.
- **Early Warning System (EWS)**: Banner peringatan otomatis saat pengguna berada dalam radius bahaya (<200m / <500m).
- **1-Tap Quick Report**: Lapor titik genangan baru dengan koordinat presisi GPS perangkat.

### 2. 🔬 AI Vision Multimodal Scanner (Foto & Video)
- **Dual Scanning Mode**: Analisis melalui foto diam atau perekaman video 3 detik untuk deteksi motilitas (gerakan aktif jentik).
- **AI Heuristic Breakdown**: Penilaian 5 faktor risiko: wadah penampungan, stagnansi air, deteksi jentik hidup, lingkungan sekitar, dan sampah/debris.
- **Kamera Enhancer**: Kontrol rasio aspek (1:1, 4:3, 16:9), auto torch/flashlight, dan canvas digital post-processing.
- **Pin Langsung ke Radar**: Hasil temuan risiko bahaya tinggi dapat langsung dipasang ke peta publik secara instan.

### 3. 🤖 Zero-G AI Assistant (Gemini Multimodal & Web Grounding)
- **Penjelajahan Internet**: Terintegrasi langsung dengan informasi terkini melalui Google Search Grounding.
- **Multimodal Upload & Clipboard Support**:
  - Upload berkas gambar, video, dan dokumen.
  - **Copy-Paste Instan (`Ctrl + V`)**: Copy gambar langsung dari internet atau tangkapan layar (Snipping Tool / PrintScreen).
  - Drag & Drop berkas langsung ke kartu chat.
- **Manajemen Riwayat Sesi**: Setiap percakapan tersimpan otomatis dengan judul dinamis dan isolasi konteks per sesi.
- **Quick Tone Modifiers**: Tombol sekali klik untuk meminta ringkasan padat, tebal (bold), analisis mendalam, atau prediksi tren jangka panjang.

### 4. 📱 Progressive Web App (PWA) & Offline Ready
- **Installable Native App**: Tombol *"Pasang Aplikasi"* otomatis muncul di Android / iOS / Chrome / Desktop.
- **Offline Resilience**: Deteksi status jaringan otomatis (`Online / Offline`) dengan cache Service Worker aktif.
- **Sleek UI/UX Motion**: Transisi halaman mulus menggunakan **View Transitions API**, animasi scroll bertingkat (*Scroll-driven reveal*), dan tema *Cyberpunk Glassmorphism*.

---

## 🚀 Panduan Memulai Cepat

### Prasyarat
- [Node.js](https://nodejs.org/) (versi 18 ke atas disarankan)
- npm atau pnpm

### 1. Kloning Repositori
```bash
git clone https://github.com/username/zero-g-mosquito.git
cd zero-g-mosquito
```

### 2. Pasang Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Salin file `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```
Lengkapi variabel berikut di dalam `.env.local`:
```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini API
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 4. Setup Database Supabase
Jalankan query SQL berikut pada Supabase SQL Editor Anda:
```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE reports;
```

### 5. Jalankan Server Pengembangan
```bash
npm run dev
```
Buka browser di `http://localhost:5173`.

---

## 🏗️ Struktur Proyek

```
src/
├── components/
│   ├── BatikDecorations.tsx   # Ornamen Batik Kawung, Mandala, corner vector & loading scanner
│   ├── CameraScanner.tsx      # Kamera AI multimodal & video analisis jentik (clean optical)
│   ├── EditReportModal.tsx    # Modal edit status & foto pembersihan titik realtime
│   ├── FeatureMenuModal.tsx   # Modal menu direktori fitur lengkap
│   ├── LoginPage.tsx          # Autentikasi multi-provider (Google, Yahoo, Email, WA OTP, Guest)
│   ├── MosquitoAI.tsx         # Asisten AI chat multimodal & Google Search Grounding
│   ├── QuickActionSheet.tsx   # Menu cepat 4-tombol frosted glass (Home, Refresh, Menu, Settings)
│   ├── SanitationDataTable.tsx# Tabel data sanitasi & titik bahaya (accordion dropdown realtime)
│   └── TelemetryTableModal.tsx# Modal tabel telemetry & risiko perimeter
├── lib/
│   ├── authStorage.ts         # Manajemen sesi akun lokal & multi-provider
│   ├── chatStorage.ts         # Penyimpanan sesi percakapan & riwayat AI
│   ├── imageEnhancer.ts       # Canvas image enhancement & auto-contrast
│   ├── offlineSync.ts         # Offline report queue & background sync
│   ├── reportData.ts          # Metadata serializer, kalkulasi perimeter & helper sanitasi
│   ├── soundFx.ts             # Web Audio API sintetis haptics & sound effects
│   └── supabase.ts            # Klien Supabase PostgreSQL & realtime websocket
├── App.tsx                    # Radar GIS Leaflet, geofencing perimeter & orkestrasi PWA
├── index.css                  # View transitions API, batik utilities & styling
└── main.tsx                   # Root entrypoint & Service Worker PWA registration
```

---

## 🛠️ Build & Produksi

Untuk membuat bundle produksi yang dioptimalkan:
```bash
npm run build
```
Bundle akan di-split secara efisien ke dalam chunk:
- `vendor-maps` (Leaflet)
- `vendor-gemini` (Google Gen AI)
- `vendor-supabase` (Supabase Client)
- `vendor-react` (React & Scheduler)

---

## 📄 Lisensi
Didistribusikan di bawah lisensi MIT. Silakan gunakan untuk inisiatif kesehatan masyarakat dan riset epidemiologi.
