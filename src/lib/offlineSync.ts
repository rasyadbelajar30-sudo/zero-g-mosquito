// File: src/lib/offlineSync.ts

import { supabase, type MosquitoReport } from './supabase';

const CACHE_REPORTS_KEY = 'zero_g_cached_reports';
const OFFLINE_QUEUE_KEY = 'zero_g_offline_queue';

export interface QueuedOfflineReport {
  id: string; // temporary local id
  action: 'insert' | 'update';
  payload: MosquitoReport;
  timestamp: number;
}

/**
 * Save fetched reports to local cache for offline rendering
 */
export function saveCachedReports(reports: MosquitoReport[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_REPORTS_KEY, JSON.stringify(reports));
  } catch (err) {
    console.warn('Gagal menyimpan cache offline reports:', err);
  }
}

/**
 * Retrieve cached reports when offline or network fails
 */
export function getCachedReports(): MosquitoReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CACHE_REPORTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MosquitoReport[];
  } catch {
    return [];
  }
}

/**
 * Enqueue a report for later sync when internet connection is restored
 */
export function enqueueOfflineReport(
  reportOrLat: MosquitoReport | number,
  actionOrLng?: 'insert' | 'update' | number,
  status?: string
): MosquitoReport {
  let report: MosquitoReport;
  let action: 'insert' | 'update' = 'insert';

  if (typeof reportOrLat === 'number') {
    report = {
      id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      latitude: reportOrLat,
      longitude: (actionOrLng as number) || 0,
      status: status || 'Belum dibersihkan'
    };
  } else {
    report = {
      ...reportOrLat,
      id: reportOrLat.id || `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    };
    if (typeof actionOrLng === 'string' && (actionOrLng === 'insert' || actionOrLng === 'update')) {
      action = actionOrLng;
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const queue = getOfflineQueue();
      const item: QueuedOfflineReport = {
        id: report.id!,
        action,
        payload: report,
        timestamp: Date.now()
      };
      queue.push(item);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.warn('Gagal enqueue offline report:', err);
    }
  }

  return report;
}

export function getOfflineQueue(): QueuedOfflineReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedOfflineReport[];
  } catch {
    return [];
  }
}

export function getOfflineQueueCount(): number {
  return getOfflineQueue().length;
}

export const getPendingOfflineCount = (): number => getOfflineQueueCount();

/**
 * Flush and sync all pending offline reports to Supabase
 */
export async function flushOfflineQueue(): Promise<{ synced: number; failed: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remainingQueue: QueuedOfflineReport[] = [];

  for (const item of queue) {
    try {
      if (item.action === 'insert') {
        const { error } = await supabase.from('reports').insert({
          latitude: item.payload.latitude,
          longitude: item.payload.longitude,
          status: item.payload.status
        });
        if (error) throw error;
        synced++;
      } else if (item.action === 'update' && item.payload.id) {
        const { error } = await supabase
          .from('reports')
          .update({
            status: item.payload.status
          })
          .eq('id', item.payload.id);
        if (error) throw error;
        synced++;
      }
    } catch (err) {
      console.warn('Gagal sync offline item:', err);
      failed++;
      remainingQueue.push(item);
    }
  }

  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
  } catch {
    // Ignore
  }

  return { synced, failed };
}
