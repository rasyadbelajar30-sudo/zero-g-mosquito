// File: src/lib/telemetryStorage.ts

export interface TelemetryDirectionInfo {
  id: string;
  penjuru: string;
  label: string;
  status: 'Terkendali' | 'Bebas Jentik' | 'Waspada' | 'Siaga';
  abjScore: number;
  catatan: string;
}

export interface TelemetryConfig {
  abjNasional: number;
  overallStatus: 'STATUS AMAN' | 'STATUS WASPADA' | 'STATUS SIAGA';
  directions: TelemetryDirectionInfo[];
}

export const DEFAULT_TELEMETRY: TelemetryConfig = {
  abjNasional: 98.4,
  overallStatus: 'STATUS AMAN',
  directions: [
    {
      id: 'utara-timur',
      penjuru: 'Utara - Timur',
      label: 'Kawasan Perumahan & Pemukiman',
      status: 'Terkendali',
      abjScore: 98.6,
      catatan: 'Drainase lancar, pemantauan Jumantik rutin mingguan'
    },
    {
      id: 'selatan-barat',
      penjuru: 'Selatan - Barat',
      label: 'Kawasan Kebun & Saluran Air',
      status: 'Bebas Jentik',
      abjScore: 99.1,
      catatan: 'Tidak ada ember terbuka, wadah air tertutup rapat'
    },
    {
      id: 'barat-utara',
      penjuru: 'Barat - Utara',
      label: 'Fasilitas Umum & Sekolah',
      status: 'Terkendali',
      abjScore: 97.8,
      catatan: 'Pemeriksaan rutin bak toilet dan dispenser air'
    },
    {
      id: 'timur-selatan',
      penjuru: 'Timur - Selatan',
      label: 'Area Pasar & Pertokoan',
      status: 'Waspada',
      abjScore: 95.2,
      catatan: 'Perlu kuras talang air & penertiban ban bekas'
    }
  ]
};

const STORAGE_KEY = 'zerog_telemetry_custom';

export function getStoredTelemetry(): TelemetryConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TELEMETRY;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_TELEMETRY;
  }
}

export function saveStoredTelemetry(cfg: TelemetryConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}
