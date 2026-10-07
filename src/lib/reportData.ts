// File: src/lib/reportData.ts

import { type MosquitoReport } from './supabase';

export interface ReportMetadata {
  summary: string;
  fieldPhoto?: string;         // base64 Data URL of field/ground condition photo
  landmark?: string;           // Physical landmark/patokan fisik di sekitar
  accuracyMeters?: number;     // GPS Accuracy (e.g. 3.2m)
  reportedBy?: string;         // Name of user who reported
  cleanedAction?: string;      // Action taken to clean (e.g. "Dikuras & Dibalik")
  cleanedNote?: string;        // Custom note from cleaner
  cleanedBy?: string;          // Name of user who cleaned
  cleanedPhoto?: string;       // base64 Data URL of cleaned verification photo
  cleanedAt?: string;          // ISO date string
}

export interface LocationCluster {
  representative: MosquitoReport;
  reports: MosquitoReport[];
  isCleaned: boolean;
  count: number;
}

/**
 * Checks if a report or status string is considered cleaned / resolved / safe
 */
export function isReportCleaned(status?: string): boolean {
  if (!status) return false;
  const trimmed = status.trim();

  // If JSON format
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.cleanedAction || parsed.cleanedAt || parsed.cleanedBy) return true;
      if (parsed.summary) {
        const sum = String(parsed.summary).toLowerCase();
        // Negative guards: never consider "belum dibersihkan" or "bahaya" as cleaned
        if (
          sum.includes('belum') ||
          sum.includes('tidak') ||
          sum.includes('pending') ||
          sum.includes('bahaya') ||
          sum.includes('danger')
        ) {
          return false;
        }
        return (
          sum.includes('bersih') ||
          sum.includes('selesai') ||
          sum.includes('cleaned') ||
          sum.includes('resolved') ||
          sum.includes('teratasi') ||
          sum.includes('aman')
        );
      }
    } catch {
      // fallback to string check
    }
  }

  const s = trimmed.toLowerCase();
  // Negative guards for plain string:
  // e.g. "Belum dibersihkan", "belum selesai", "tidak bersih", "pending", "bahaya"
  if (
    s.includes('belum') ||
    s.includes('tidak') ||
    s.includes('pending') ||
    s.includes('bahaya') ||
    s.includes('danger')
  ) {
    return false;
  }

  return (
    s.includes('bersih') ||
    s.includes('selesai') ||
    s.includes('cleaned') ||
    s.includes('resolved') ||
    s.includes('teratasi') ||
    s.includes('aman')
  );
}

/**
 * Parses raw status string into structured ReportMetadata
 */
export function parseReportStatus(status?: string): ReportMetadata {
  if (!status) {
    return { summary: 'Status: Genangan air aktif terdeteksi' };
  }

  // 1. Try JSON parsing
  if (status.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(status);
      return {
        summary: parsed.summary || 'Titik Rawan Nyamuk',
        fieldPhoto: parsed.fieldPhoto,
        landmark: parsed.landmark,
        accuracyMeters: parsed.accuracyMeters,
        reportedBy: parsed.reportedBy,
        cleanedAction: parsed.cleanedAction,
        cleanedNote: parsed.cleanedNote,
        cleanedBy: parsed.cleanedBy,
        cleanedPhoto: parsed.cleanedPhoto,
        cleanedAt: parsed.cleanedAt
      };
    } catch {
      // not valid json, fall through to legacy parsing
    }
  }

  // 2. Legacy string parsing:
  // e.g. "Dibersihkan: Dikuras & Dibalik - Catatan (Oleh: Budi)"
  if (status.startsWith('Dibersihkan:')) {
    const withoutPrefix = status.replace('Dibersihkan:', '').trim();
    let cleanedBy = '';
    let mainAction = withoutPrefix;

    const byMatch = withoutPrefix.match(/\(Oleh:\s*([^)]+)\)/);
    if (byMatch) {
      cleanedBy = byMatch[1].trim();
      mainAction = withoutPrefix.replace(byMatch[0], '').trim();
    }

    return {
      summary: status,
      cleanedAction: mainAction,
      cleanedBy
    };
  }

  return {
    summary: status
  };
}

/**
 * Serializes structured ReportMetadata into JSON string for Supabase storage
 */
export function serializeReportStatus(meta: ReportMetadata): string {
  return JSON.stringify(meta);
}

/**
 * Compresses an image file, blob, or dataURL onto an HTML Canvas
 * to a lightweight, mobile-friendly JPEG (max 480px, quality 0.65, ~15-25KB)
 */
export async function compressImageToDataUrl(
  input: File | Blob | string,
  maxWidth = 480,
  maxHeight = 480,
  quality = 0.65
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(typeof input === 'string' ? input : '');
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    img.onerror = () => {
      reject(new Error('Gagal memuat gambar untuk kompresi'));
    };

    if (typeof input === 'string') {
      img.src = input;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(input);
    }
  });
}

/**
 * Calculates haversine distance in meters between two lat/lng coordinates
 */
export function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

const DELETED_REPORTS_KEY = 'zero_g_deleted_reports_v1';

export function getDeletedReportIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_REPORTS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function markReportAsDeleted(id: string) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const current = getDeletedReportIds();
    current.add(id);
    localStorage.setItem(DELETED_REPORTS_KEY, JSON.stringify(Array.from(current)));
  } catch {
    // ignore
  }
}

/**
 * Checks if a report is dummy/testing junk (e.g. 0,0 coordinates, test payloads, out of range)
 */
export function isJunkReport(report: MosquitoReport): boolean {
  if (!report) return true;
  // 1. Invalid coordinates or (0,0) null island
  if (
    typeof report.latitude !== 'number' ||
    typeof report.longitude !== 'number' ||
    isNaN(report.latitude) ||
    isNaN(report.longitude) ||
    (Math.abs(report.latitude) < 0.0001 && Math.abs(report.longitude) < 0.0001)
  ) {
    return true;
  }

  // 2. Coordinates outside Indonesia bounding box (Lat: -12 to 7, Lng: 94 to 142)
  if (
    report.latitude < -12 ||
    report.latitude > 7 ||
    report.longitude < 94 ||
    report.longitude > 142
  ) {
    return true;
  }

  // 3. Junk or legacy test strings in status/summary
  if (report.status) {
    const raw = report.status.toLowerCase().trim();
    if (
      raw === 'pending' ||
      raw === 'verified' ||
      raw.includes('test_insert') ||
      raw.includes('30kb payload') ||
      raw.includes('dummy') ||
      raw.includes('asdasd') ||
      raw.includes('testing payload') ||
      raw.includes('human subject')
    ) {
      return true;
    }
  }

  // 4. Legacy development mock reports created prior to 2026-10-06
  if (report.created_at) {
    try {
      const createdAtTime = new Date(report.created_at).getTime();
      // Oct 6, 2026 00:00:00 UTC = 1791244800000
      if (createdAtTime < 1791244800000) {
        return true;
      }
    } catch {
      // ignore
    }
  }

  return false;
}

/**
 * Consolidates raw reports by spatial proximity (30m threshold).
 * If multiple reports exist at the same physical puddle/location,
 * they are grouped into a single entity. If ANY report in that cluster
 * is marked as cleaned / safe, the ENTIRE cluster is treated as CLEANED,
 * preventing duplicate "ghost" red hazard markers from lingering on the radar.
 */
export function consolidateReports(
  reports: MosquitoReport[],
  proximityMeters = 30
): {
  activeReports: MosquitoReport[];
  cleanedReports: MosquitoReport[];
  clusters: LocationCluster[];
} {
  const deletedIds = getDeletedReportIds();
  const validReports = reports.filter(
    (r) => r.id && !deletedIds.has(r.id) && !isJunkReport(r)
  );

  // Sort reports newest first
  const sorted = [...validReports].sort((a, b) => {
    const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tB - tA;
  });

  const clusters: LocationCluster[] = [];

  for (const rep of sorted) {
    let matchedCluster: LocationCluster | null = null;
    for (const cluster of clusters) {
      const dist = getDistanceInMeters(
        rep.latitude,
        rep.longitude,
        cluster.representative.latitude,
        cluster.representative.longitude
      );
      if (dist <= proximityMeters) {
        matchedCluster = cluster;
        break;
      }
    }

    if (matchedCluster) {
      matchedCluster.reports.push(rep);
      matchedCluster.count = matchedCluster.reports.length;
      if (isReportCleaned(rep.status)) {
        matchedCluster.isCleaned = true;
        // Promote the cleaned report as representative so clean details and photos show
        if (!isReportCleaned(matchedCluster.representative.status)) {
          matchedCluster.representative = rep;
        }
      }
    } else {
      clusters.push({
        representative: rep,
        reports: [rep],
        isCleaned: isReportCleaned(rep.status),
        count: 1
      });
    }
  }

  const activeReports: MosquitoReport[] = [];
  const cleanedReports: MosquitoReport[] = [];

  for (const c of clusters) {
    if (c.isCleaned) {
      cleanedReports.push(c.representative);
    } else {
      activeReports.push(c.representative);
    }
  }

  return { activeReports, cleanedReports, clusters };
}

/**
 * Estimates human-friendly neighborhood / city region from GPS coordinates
 */
export function estimateLocationName(lat: number, lng: number): string {
  // Jabodetabek key regions
  if (lat > -6.19 && lat < -6.14 && lng > 106.81 && lng < 106.85) return 'Gambir, Jakarta Pusat';
  if (lat > -6.23 && lat < -6.19 && lng > 106.83 && lng < 106.87) return 'Manggarai / Tebet, Jakarta Selatan';
  if (lat > -6.36 && lat < -6.29 && lng > 106.85 && lng < 106.92) return 'Ciracas / Cipayung, Jakarta Timur';
  if (lat > -6.22 && lat < -6.16 && lng > 106.74 && lng < 106.80) return 'Kebon Jeruk, Jakarta Barat';
  if (lat > -6.44 && lat < -6.37 && lng > 106.92 && lng < 106.99) return 'Cibubur / Cikeas';
  if (lat > -6.28 && lat < -6.20 && lng > 106.94 && lng < 107.03) return 'Pondok Gede / Bekasi Barat';
  if (lat > -6.32 && lat < -6.24 && lng > 106.78 && lng < 106.85) return 'Pasar Minggu / Cilandak, Jaksel';
  if (lat > -6.15 && lat < -6.10 && lng > 106.86 && lng < 106.94) return 'Kelapa Gading, Jakarta Utara';
  if (lat > -6.26 && lat < -6.18 && lng > 106.60 && lng < 106.70) return 'Tangerang Kota / Serpong';

  // East Java key regions
  if (lat > -7.34 && lat < -7.23 && lng > 112.70 && lng < 112.82) return 'Surabaya, Jawa Timur';

  // Fallback
  return `Wilayah (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}
