import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase, isSupabaseConfigured, type MosquitoReport } from './lib/supabase';
import MosquitoAI from './components/MosquitoAI';
import CameraScanner from './components/CameraScanner';
import {
  Crosshair,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  Radio,
  Camera,
  ShieldCheck,
  ShieldAlert,
  Compass,
  Download,
  WifiOff,
  User,
  LogOut,
  Layers,
  Maximize2,
  Minimize2,
  ExternalLink,
  MapPin,
  Copy,
  Check,
  Eye,
  X,
  Volume2,
  VolumeX,
  RefreshCw,
  Activity,
  Zap,
  Trash2,
  Target,
  Edit3,
  ArrowRight,
  Sparkles,
  Grid,
  Bot,
  Table as TableIcon
} from 'lucide-react';
import { type ChatAttachment } from './lib/chatStorage';
import AuthModal from './components/AuthModal';
import LoginPage from './components/LoginPage';
import CleaningReportModal from './components/CleaningReportModal';
import FieldPhotoModal from './components/FieldPhotoModal';
import SanitationDataTable from './components/SanitationDataTable';
import EditReportModal from './components/EditReportModal';
import TelemetryTableModal from './components/TelemetryTableModal';
import FeatureMenuModal from './components/FeatureMenuModal';
import QuickActionSheet from './components/QuickActionSheet';
import { getStoredTelemetry, type TelemetryConfig } from './lib/telemetryStorage';
import {
  BatikKawungPattern,
  BatikMandala,
  BatikCorner,
  BatikDivider
} from './components/BatikDecorations';
import {
  parseReportStatus,
  consolidateReports,
  markReportAsDeleted,
  serializeReportStatus,
  isReportCleaned,
  type ReportMetadata
} from './lib/reportData';
import { getStoredUser, saveStoredUser, type UserProfile } from './lib/authStorage';
import {
  playRadarPing,
  playHazardAlert,
  playSuccessChime,
  playTapSound,
  triggerHaptic,
  isSoundMuted,
  setSoundMuted
} from './lib/soundFx';
import {
  getCachedReports,
  saveCachedReports,
  getPendingOfflineCount,
  flushOfflineQueue,
  enqueueOfflineReport
} from './lib/offlineSync';

// High-visibility animated hazard beacon (Only for ACTIVE UNCLEANED spots)
const redIcon = new L.DivIcon({
  className: 'bg-transparent',
  html: `
    <div class="relative flex items-center justify-center -top-2.5 -left-2.5 w-7 h-7 pointer-events-auto cursor-pointer">
      <div class="absolute w-7 h-7 rounded-full bg-red-500/35 animate-ping"></div>
      <div class="absolute w-5 h-5 rounded-full bg-red-600/50 animate-pulse"></div>
      <div class="relative w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-slate-950 shadow-[0_0_14px_rgba(239,68,68,1)] flex items-center justify-center">
        <div class="w-1 h-1 rounded-full bg-white"></div>
      </div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Green checkmark beacon for cleaned/resolved spots
const greenIcon = new L.DivIcon({
  className: 'bg-transparent',
  html: `
    <div class="relative flex items-center justify-center -top-2.5 -left-2.5 w-7 h-7 pointer-events-auto cursor-pointer">
      <div class="relative w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-950 shadow-[0_0_14px_rgba(16,185,129,0.9)] flex items-center justify-center text-slate-950 text-[11px] font-black">
        ✓
      </div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Cyan glowing user GPS beacon
const userIcon = new L.DivIcon({
  className: 'bg-transparent',
  html: `
    <div class="relative flex items-center justify-center -top-3 -left-3 w-8 h-8 pointer-events-auto">
      <div class="absolute w-8 h-8 rounded-full bg-cyan-400/30 animate-ping"></div>
      <div class="absolute w-5 h-5 rounded-full bg-teal-500/50 animate-pulse"></div>
      <div class="relative w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-400 to-teal-300 border-2 border-white shadow-[0_0_16px_rgba(34,211,238,1)] flex items-center justify-center">
        <div class="w-1.5 h-1.5 rounded-full bg-slate-950"></div>
      </div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Micro-animated mosquito vector with realistic flutter
function AnimatedMosquito({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none ${className}`}>
      <div className="animate-mosquito inline-block">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          className="text-teal-400 drop-shadow-[0_0_10px_rgba(45,212,191,0.7)]"
        >
          {/* Mosquito Body */}
          <ellipse cx="12" cy="12" rx="1.5" ry="4.5" fill="currentColor" transform="rotate(-30 12 12)" />
          <circle cx="9.5" cy="8.5" r="1.5" fill="currentColor" />
          {/* Proboscis */}
          <line x1="8.5" y1="7.5" x2="4.5" y2="3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          {/* Left & Right Wings with flutter animation */}
          <ellipse
            cx="14"
            cy="9"
            rx="5"
            ry="2"
            fill="currentColor"
            fillOpacity="0.6"
            className="animate-wing-left"
            transform="rotate(25 14 9)"
          />
          <ellipse
            cx="10"
            cy="15"
            rx="5"
            ry="2"
            fill="currentColor"
            fillOpacity="0.6"
            className="animate-wing-right"
            transform="rotate(-45 10 15)"
          />
          {/* Legs */}
          <path
            d="M10 11L6 13M12 13L10 17M14 14L15 19"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}

function MapFlyTo({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, Math.max(map.getZoom(), 16), { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

// Automatically fits map viewport to cover all provided reports
function MapFitBounds({
  reports,
  trigger
}: {
  reports: MosquitoReport[];
  trigger: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (trigger > 0 && reports.length > 0) {
      const validPoints = reports
        .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number')
        .map((r) => [r.latitude, r.longitude] as [number, number]);
      if (validPoints.length > 0) {
        const bounds = L.latLngBounds(validPoints);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [trigger, reports, map]);
  return null;
}

// Invalidate Leaflet size when switching back to Radar tab or expanding map
function MapResizer({ activeTab, isExpanded }: { activeTab: string; isExpanded?: boolean }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [activeTab, isExpanded, map]);
  return null;
}

// Tactical Map Telemetry Hook
function MapEventsHUD({ onUpdate }: { onUpdate: (zoom: number, lat: number, lng: number) => void }) {
  const map = useMap();

  useEffect(() => {
    const handleUpdate = () => {
      const c = map.getCenter();
      onUpdate(map.getZoom(), c.lat, c.lng);
    };
    map.on('moveend', handleUpdate);
    map.on('zoomend', handleUpdate);
    handleUpdate();
    return () => {
      map.off('moveend', handleUpdate);
      map.off('zoomend', handleUpdate);
    };
  }, [map, onUpdate]);
  return null;
}

// Custom Cyberpunk Tactical Zoom In/Out Buttons
function MapZoomControls() {
  const map = useMap();
  return (
    <div className="leaflet-bottom leaflet-right !mb-3 !mr-3 z-[1000] flex flex-col gap-1.5 pointer-events-auto">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="w-8 h-8 rounded-xl bg-slate-900/95 hover:bg-slate-800 text-teal-300 border border-teal-500/40 flex items-center justify-center font-bold text-base shadow-[0_4px_15px_rgba(0,0,0,0.5)] hover:border-teal-300 transition-all active:scale-90 cursor-pointer backdrop-blur-md"
        title="Perbesar Peta (+)"
      >
        +
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="w-8 h-8 rounded-xl bg-slate-900/95 hover:bg-slate-800 text-teal-300 border border-teal-500/40 flex items-center justify-center font-bold text-base shadow-[0_4px_15px_rgba(0,0,0,0.5)] hover:border-teal-300 transition-all active:scale-90 cursor-pointer backdrop-blur-md"
        title="Perkecil Peta (-)"
      >
        −
      </button>
    </div>
  );
}

// Calculate distance in meters between two lat/lon points
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'radar' | 'camera' | 'chat' | 'data' | 'account'>(() => {
    if (window.location.search.includes('tab=camera') || window.location.search.includes('tab=vision')) return 'camera';
    if (window.location.search.includes('tab=chat')) return 'chat';
    if (window.location.search.includes('tab=data') || window.location.search.includes('tab=table')) return 'data';
    if (window.location.search.includes('tab=account') || window.location.search.includes('tab=login')) return 'account';
    return 'radar';
  });
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>(undefined);
  const [chatInitialAttachment, setChatInitialAttachment] = useState<ChatAttachment | null>(null);
  const [reports, setReports] = useState<MosquitoReport[]>(() => getCachedReports());
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    return typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
  });
  const [user, setUser] = useState<UserProfile | null>(() => {
    const stored = getStoredUser();
    if (stored) return stored;
    if (window.location.search.includes('demo=true')) {
      const demoUser: UserProfile = {
        id: 'demo-warga-1',
        name: 'Warga Peduli (Demo)',
        email: 'warga.peduli@surabaya.go.id',
        provider: 'demo',
        reportsCount: 4
      };
      saveStoredUser(demoUser);
      return demoUser;
    }
    return null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [mapLayer, setMapLayer] = useState<'dark' | 'satellite' | 'street'>('dark');
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isRadarSweepActive, setIsRadarSweepActive] = useState(true);
  const [isMuted, setIsMuted] = useState(() => isSoundMuted());
  const [pendingOfflineCount, setPendingOfflineCount] = useState(() => getPendingOfflineCount());
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const hasHazardAlertedRef = useRef(false);
  const [mapTelemetry, setMapTelemetry] = useState<{ zoom: number; lat: number; lng: number }>({
    zoom: 12,
    lat: -6.2000,
    lng: 106.8166
  });

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    setSoundMuted(next);
    if (!next) {
      playRadarPing();
      triggerHaptic(25);
    }
  };

  const handleMapTelemetryUpdate = useCallback((zoom: number, lat: number, lng: number) => {
    setMapTelemetry((prev) => {
      if (prev.zoom === zoom && Math.abs(prev.lat - lat) < 0.0001 && Math.abs(prev.lng - lng) < 0.0001) {
        return prev;
      }
      return { zoom, lat, lng };
    });
  }, []);

  const [cleaningReportTarget, setCleaningReportTarget] = useState<MosquitoReport | null>(null);
  const [fieldPhotoTarget, setFieldPhotoTarget] = useState<MosquitoReport | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [copiedReportId, setCopiedReportId] = useState<string | null>(null);
  const [radarViewMode, setRadarViewMode] = useState<'active_danger' | 'cleaned_history'>('active_danger');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);

  const handleSelectReport = (r: MosquitoReport) => {
    const key = r.id || `${r.latitude}-${r.longitude}`;
    setSelectedReportId(key);
    setMapCenter([r.latitude, r.longitude]);
    playTapSound();
    triggerHaptic(20);
  };

  const handleFitAllReports = () => {
    setFitBoundsTrigger((prev) => prev + 1);
    playTapSound();
    triggerHaptic(25);
  };

  const handleCopyCoord = (reportId: string, lat: number, lng: number) => {
    const coordStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(coordStr).catch(() => {});
    }
    setCopiedReportId(reportId);
    playTapSound();
    triggerHaptic(15);
    setTimeout(() => setCopiedReportId(null), 2000);
  };

  // Realtime Data Table & Telemetry Edit States
  const [editingReport, setEditingReport] = useState<MosquitoReport | null>(null);
  const [isTelemetryModalOpen, setIsTelemetryModalOpen] = useState(false);
  const [isFeatureMenuOpen, setIsFeatureMenuOpen] = useState(false);
  const [isQuickActionSheetOpen, setIsQuickActionSheetOpen] = useState(false);
  const [telemetryConfig, setTelemetryConfig] = useState<TelemetryConfig>(() => getStoredTelemetry());

  const handleUpdateReport = useCallback((updated: MosquitoReport) => {
    setReports((prev) => {
      const next = prev.map((r) => {
        if (r.id && updated.id && r.id === updated.id) return updated;
        if (!r.id && r.latitude === updated.latitude && r.longitude === updated.longitude) return updated;
        return r;
      });
      saveCachedReports(next);
      return next;
    });
    setMsg('Data laporan berhasil diperbarui secara realtime!');
    setStatus('success');
    setTimeout(() => {
      setStatus('idle');
      setMsg('');
    }, 3500);
  }, []);

  const handleDeleteReportById = useCallback((deletedId: string) => {
    markReportAsDeleted(deletedId);
    setReports((prev) => {
      const next = prev.filter((r) => r.id !== deletedId);
      saveCachedReports(next);
      return next;
    });
    setMsg('Titik laporan berhasil dihapus dari radar.');
    setStatus('success');
    setTimeout(() => {
      setStatus('idle');
      setMsg('');
    }, 3000);
  }, []);

  const handleQuickToggleClean = useCallback(async (targetReport: MosquitoReport) => {
    playTapSound();
    triggerHaptic(20);
    const isClean = isReportCleaned(targetReport.status);
    const reporterName = user?.name || 'Warga Komunitas';
    const currentMeta = parseReportStatus(targetReport.status);

    let updatedMeta: ReportMetadata;
    if (isClean) {
      // Toggle back to active danger
      updatedMeta = {
        ...currentMeta,
        summary: 'Titik Rawan Genangan Nyamuk (Diaktifkan Kembali)'
      };
      delete updatedMeta.cleanedAction;
      delete updatedMeta.cleanedBy;
      delete updatedMeta.cleanedAt;
      delete updatedMeta.cleanedPhoto;
    } else {
      // Toggle to cleaned
      updatedMeta = {
        ...currentMeta,
        summary: `Dibersihkan: Telah Ditangani & Disterilkan (Oleh: ${reporterName})`,
        cleanedAction: 'Dikuras & Disterilkan Warga',
        cleanedBy: reporterName,
        cleanedAt: new Date().toISOString()
      };
    }

    const updatedStatus = serializeReportStatus(updatedMeta);
    const updatedPayload: MosquitoReport = {
      ...targetReport,
      status: updatedStatus
    };

    // Update locally optimistically
    handleUpdateReport(updatedPayload);

    // Sync to Supabase in real-time
    if (targetReport.id && !targetReport.id.startsWith('offline-')) {
      try {
        await supabase
          .from('reports')
          .update({ status: updatedStatus })
          .eq('id', targetReport.id);
      } catch (err) {
        console.warn('Error updating Supabase status:', err);
      }
    }
  }, [user, handleUpdateReport]);

  const handleQuickClean = async (targetReport: MosquitoReport) => {
    playTapSound();
    triggerHaptic(20);
    const reporterName = user?.name || 'Warga Komunitas';
    const meta: ReportMetadata = {
      summary: `Dibersihkan: Telah Ditangani & Disterilkan (Oleh: ${reporterName})`,
      cleanedAction: 'Dikuras & Disterilkan Warga',
      cleanedBy: reporterName,
      cleanedAt: new Date().toISOString()
    };
    const updatedStatus = serializeReportStatus(meta);
    const targetLat = targetReport.latitude;
    const targetLng = targetReport.longitude;

    try {
      if (isOnline) {
        // Guaranteed cloud persistence: insert resolution record
        await supabase.from('reports').insert({
          latitude: targetLat,
          longitude: targetLng,
          status: updatedStatus
        });
        if (targetReport.id) {
          await supabase.from('reports').update({ status: updatedStatus }).eq('id', targetReport.id);
        }
      }
    } catch (e) {
      console.warn('Quick clean Supabase warning:', e);
    }

    setReports((prev) => {
      const updated = prev.map((r) => {
        const isOverlapping =
          r.id === targetReport.id ||
          (Math.abs(r.latitude - targetLat) < 0.0003 && Math.abs(r.longitude - targetLng) < 0.0003);
        return isOverlapping ? { ...r, status: updatedStatus } : r;
      });
      const resolvedRep: MosquitoReport = {
        ...targetReport,
        id: `clean-${Date.now()}`,
        status: updatedStatus,
        created_at: new Date().toISOString()
      };
      updated.push(resolvedRep);
      saveCachedReports(updated);
      return updated;
    });

    playSuccessChime();
    triggerHaptic([30, 80, 30]);
    setMsg('Titik bahaya berhasil dibersihkan! Titik merah langsung dihilangkan dari radar.');
    setStatus('success');
    setTimeout(() => {
      setStatus('idle');
      setMsg('');
    }, 4000);
  };

  const handleDeleteReport = async (targetReport: MosquitoReport) => {
    if (!window.confirm('Hapus laporan titik ini dari peta radar (misal jika duplikat atau salah penandaan)?')) {
      return;
    }
    playTapSound();
    triggerHaptic([20, 40]);

    if (targetReport.id) {
      markReportAsDeleted(targetReport.id);
    }
    const targetLat = targetReport.latitude;
    const targetLng = targetReport.longitude;

    try {
      if (isOnline && targetReport.id) {
        await supabase.from('reports').delete().eq('id', targetReport.id);
      }
    } catch (e) {
      console.warn('Delete report warning:', e);
    }

    setReports((prev) => {
      const updated = prev.filter(
        (r) =>
          r.id !== targetReport.id &&
          !(Math.abs(r.latitude - targetLat) < 0.0001 && Math.abs(r.longitude - targetLng) < 0.0001)
      );
      saveCachedReports(updated);
      return updated;
    });

    playSuccessChime();
    setMsg('Laporan berhasil dihapus dari radar.');
    setStatus('success');
    setTimeout(() => {
      setStatus('idle');
      setMsg('');
    }, 3500);
  };

  // Progressive enhancement: View Transitions API for buttery smooth tab switching
  const switchTab = useCallback((newTab: 'radar' | 'camera' | 'chat' | 'data' | 'account') => {
    if (newTab === activeTab) return;
    playTapSound();
    triggerHaptic(12);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (document as any).startViewTransition(() => {
        setActiveTab(newTab);
      });
    } else {
      setActiveTab(newTab);
    }
  }, [activeTab]);

  const handleConsultAIFromPhoto = useCallback((data: { photoUrl?: string; summary: string; explanation?: string }) => {
    playTapSound();
    triggerHaptic(20);

    let attachment: ChatAttachment | null = null;
    if (data.photoUrl) {
      let base64 = data.photoUrl;
      if (base64.includes('base64,')) {
        base64 = base64.split('base64,')[1];
      }
      attachment = {
        name: 'hasil_scan_jentik.jpg',
        type: 'image/jpeg',
        size: Math.round(data.photoUrl.length * 0.75),
        previewUrl: data.photoUrl,
        data: base64
      };
    }

    setChatInitialAttachment(attachment);
    setChatInitialPrompt(
      `Halo Pakar AI, saya baru memindai objek dengan hasil: "${data.summary}". Mohon berikan penjelasan mendalam mengenai resiko vektor nyamuknya dan langkah pembasmian paling aman & efektif.`
    );
    switchTab('chat');
  }, [switchTab]);

  const handleManualSync = async () => {
    if (!isOnline) {
      setMsg('Perangkat masih dalam keadaan offline. Tunggu koneksi internet.');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3500);
      return;
    }
    setIsSyncingOffline(true);
    playTapSound();
    triggerHaptic(15);
    try {
      const { synced } = await flushOfflineQueue();
      setPendingOfflineCount(getPendingOfflineCount());
      if (synced > 0) {
        playSuccessChime();
        triggerHaptic([30, 60, 30]);
        setMsg(`${synced} laporan offline berhasil disinkronisasi ke server!`);
        setStatus('success');
        const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: true });
        if (data) {
          setReports(data);
          saveCachedReports(data);
        }
      } else {
        setMsg('Semua data sudah tersinkronisasi.');
        setStatus('idle');
      }
    } finally {
      setIsSyncingOffline(false);
      setTimeout(() => setStatus('idle'), 3500);
    }
  };

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const { synced } = await flushOfflineQueue();
      setPendingOfflineCount(getPendingOfflineCount());
      if (synced > 0) {
        playSuccessChime();
        triggerHaptic([30, 60, 30]);
        setMsg(`${synced} laporan offline berhasil disinkronkan ke server!`);
        setStatus('success');
        setTimeout(() => setStatus('idle'), 4000);
        const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: true });
        if (data) {
          setReports(data);
          saveCachedReports(data);
        }
      }
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Capture PWA install prompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Auto-detect Supabase Auth session (e.g. Google OAuth redirect)
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const profile: UserProfile = {
            id: session.user.id,
            name:
              session.user.user_metadata?.name ||
              session.user.user_metadata?.full_name ||
              session.user.email?.split('@')[0] ||
              'Pengguna Google',
            email: session.user.email || '',
            provider: (session.user.app_metadata?.provider as any) || 'google',
            reportsCount: 1
          };
          setUser(profile);
          saveStoredUser(profile);
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const profile: UserProfile = {
            id: session.user.id,
            name:
              session.user.user_metadata?.name ||
              session.user.user_metadata?.full_name ||
              session.user.email?.split('@')[0] ||
              'Pengguna Google',
            email: session.user.email || '',
            provider: (session.user.app_metadata?.provider as any) || 'google',
            reportsCount: 1
          };
          setUser(profile);
          saveStoredUser(profile);
        }
      });

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        authListener.subscription.unsubscribe();
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
      setInstallPrompt(null);
    }
  };

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: true });
        if (!error && data && data.length > 0) {
          setReports(data);
          saveCachedReports(data);
        }
      } catch {
        // Keep using offline cached reports
      }
    };
    fetchReports();

    const channel = supabase.channel('supabase_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setReports((prev) => {
            const newRep = payload.new as MosquitoReport;
            if (prev.some((r) => r.id === newRep.id)) return prev;
            const updated = [...prev, newRep];
            saveCachedReports(updated);
            return updated;
          });
        } else if (payload.eventType === 'UPDATE') {
          setReports((prev) => {
            const updated = prev.map((r) => (r.id === payload.new.id ? (payload.new as MosquitoReport) : r));
            saveCachedReports(updated);
            return updated;
          });
        } else if (payload.eventType === 'DELETE') {
          setReports((prev) => {
            const updated = prev.filter((r) => r.id !== payload.old.id);
            saveCachedReports(updated);
            return updated;
          });
        }
      })
      .subscribe();

    // Auto-detect user position for proximity alert
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLocateMe = () => {
    if (isLocating) return;
    setIsLocating(true);
    playRadarPing();
    triggerHaptic([20, 50]);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setMapCenter(coords);
        setUserLocation(coords);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleReport = () => {
    const lastReport = localStorage.getItem('lastReport');
    const currentTime = Date.now();
    if (lastReport && currentTime - parseInt(lastReport, 10) < 30000) {
      setStatus('error');
      setMsg('Tunggu 30 detik sebelum melapor lagi.');
      setTimeout(() => setStatus('idle'), 5000);
      return;
    }

    setStatus('loading');
    setMsg('Mencari kordinat GPS...');
    playTapSound();
    triggerHaptic(20);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];

        // Deduplication: prevent creating duplicate red dots at the exact same puddle!
        const existingNearby = activeReports.find(
          (r) => getDistanceInMeters(pos.coords.latitude, pos.coords.longitude, r.latitude, r.longitude) < 25
        );
        if (existingNearby) {
          setMapCenter(coords);
          setUserLocation(coords);
          setStatus('idle');
          setMsg('Titik bahaya di lokasi ini sudah ada di radar! Gunakan tombol "Tandai Bersih" jika sudah ditangani.');
          setTimeout(() => setMsg(''), 5000);
          return;
        }

        const reporterName = user?.name || 'Warga Komunitas';
        const meta: ReportMetadata = {
          summary: `Genangan Air Aktif (Oleh: ${reporterName})`,
          reportedBy: reporterName,
          accuracyMeters: pos.coords.accuracy ? Math.round(pos.coords.accuracy * 10) / 10 : undefined
        };
        const reporterLabel = serializeReportStatus(meta);

        try {
          if (!navigator.onLine) {
            throw new Error('Device is offline');
          }

          const { data, error } = await supabase.from('reports').insert({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            status: reporterLabel
          }).select().single();
          
          if (error) throw error;
          
          const newReport = data as MosquitoReport;
          setReports((prev) => {
            if (prev.some((r) => r.id === newReport.id)) return prev;
            const updated = [...prev, newReport];
            saveCachedReports(updated);
            return updated;
          });

          setMapCenter(coords);
          setUserLocation(coords);
          localStorage.setItem('lastReport', Date.now().toString());
          playSuccessChime();
          triggerHaptic([30, 70, 30]);
          setStatus('success');
          setMsg('Titik genangan berhasil dilaporkan ke server!');
          setTimeout(() => { setStatus('idle'); setMsg(''); }, 5000);
        } catch {
          // Robust offline fallback: store locally in queue
          const offlineReport = enqueueOfflineReport(
            pos.coords.latitude,
            pos.coords.longitude,
            reporterLabel
          );
          setPendingOfflineCount(getPendingOfflineCount());
          setReports((prev) => {
            const updated = [...prev, offlineReport];
            saveCachedReports(updated);
            return updated;
          });
          setMapCenter(coords);
          setUserLocation(coords);
          localStorage.setItem('lastReport', Date.now().toString());
          playSuccessChime();
          triggerHaptic([30, 70, 30]);
          setStatus('success');
          setMsg('Disimpan di memori offline! Laporan akan otomatis dikirim saat ada koneksi.');
          setTimeout(() => { setStatus('idle'); setMsg(''); }, 6000);
        }
      },
      () => {
        setStatus('error');
        setMsg('Akses GPS ditolak. Silakan aktifkan izin lokasi.');
        setTimeout(() => setStatus('idle'), 5000);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handlePinFromCamera = (newReport: MosquitoReport) => {
    setReports((prev) => {
      if (prev.some((r) => r.id === newReport.id)) return prev;
      const updated = [...prev, newReport];
      saveCachedReports(updated);
      return updated;
    });
    setPendingOfflineCount(getPendingOfflineCount());
    setMapCenter([newReport.latitude, newReport.longitude]);
  };

  // Split reports into Active Danger vs Cleaned / Resolved with Spatial Clustering
  // If ANY report in a physical location (30m) is cleaned, the whole location is CLEANED,
  // permanently eliminating duplicate/ghost red hazard circles!
  const { activeReports, cleanedReports } = useMemo(() => {
    return consolidateReports(reports, 30);
  }, [reports]);

  // Nearest active hazard report and distance
  const nearestHazardInfo = useMemo(() => {
    if (!userLocation || activeReports.length === 0) return null;
    let min = Infinity;
    let closest: MosquitoReport | null = null;
    activeReports.forEach((r) => {
      const d = getDistanceInMeters(userLocation[0], userLocation[1], r.latitude, r.longitude);
      if (d < min) {
        min = d;
        closest = r;
      }
    });
    return closest ? { report: closest, distance: min } : null;
  }, [userLocation, activeReports]);

  const nearestDistance = nearestHazardInfo ? nearestHazardInfo.distance : null;
  const nearestActiveReport = nearestHazardInfo && nearestHazardInfo.distance <= 150 ? nearestHazardInfo : null;

  // Dynamic Perimeter Risk Calculation:
  // Semakin dekat ke titik bahaya aktif, persentase risiko semakin tinggi:
  // - < 30m   (Zona Merah Episentrum / Kontak Langsung) : 95% - 100% (BAHAYA KRITIS)
  // - 30-100m (Zona Merah Radius Terbang Nyamuk)       : 80% - 94%  (SIAGA TINGGI)
  // - 100-250m(Zona Oranye Waspada Sekitar)            : 55% - 79%  (WASPADA AKTIF)
  // - 250-500m(Zona Kuning Perimeter Luar)             : 25% - 54%  (PANTAUAN)
  // - > 500m  (Zona Hijau Aman)                        : 5% - 24%   (AMAN TERKENDALI)
  const perimeterRisk = useMemo(() => {
    if (activeReports.length === 0) {
      return {
        percentage: 0,
        statusText: 'AMAN STERIL',
        ringLabel: 'Semua Titik Bersih',
        badgeColor: 'emerald',
        colorClass: 'text-emerald-400',
        bgClass: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
        barColor: 'from-emerald-500 to-teal-400',
        ringRadius: 0,
        level: 'safe' as const,
        description: 'Tidak ada sarang nyamuk aktif di radar. Lingkungan terjaga.'
      };
    }

    if (nearestDistance === null) {
      return {
        percentage: 15,
        statusText: 'PERIMETER STANDBY',
        ringLabel: 'Menunggu GPS',
        badgeColor: 'slate',
        colorClass: 'text-slate-300',
        bgClass: 'bg-slate-800 border-white/10 text-slate-300',
        barColor: 'from-slate-500 to-slate-400',
        ringRadius: 500,
        level: 'standby' as const,
        description: 'Aktifkan sensor GPS untuk membaca perimeter zona bahaya secara presisi.'
      };
    }

    const d = nearestDistance;
    let pct: number;
    let statusText: string;
    let ringLabel: string;
    let colorClass: string;
    let bgClass: string;
    let barColor: string;
    let level: 'critical' | 'alert' | 'warning' | 'caution' | 'safe';
    let desc: string;

    if (d <= 30) {
      // 0 - 30 meter: Kritis (95% - 100%)
      pct = Math.round(100 - (d / 30) * 5);
      statusText = 'ZONA MERAH: KRITIS';
      ringLabel = 'Episentrum Bahaya (<30m)';
      colorClass = 'text-rose-400';
      bgClass = 'bg-rose-500/25 border-rose-500/50 text-rose-200 ring-2 ring-rose-500/30';
      barColor = 'from-rose-600 via-rose-500 to-red-400';
      level = 'critical';
      desc = 'Anda berada tepat di sarang jentik aktif! Segera lindungi diri dan kuras wadah air.';
    } else if (d <= 100) {
      // 30 - 100 meter: Siaga Tinggi (80% - 94%)
      const factor = (d - 30) / 70;
      pct = Math.round(94 - factor * 14);
      statusText = 'ZONA SIAGA TINGGI';
      ringLabel = 'Radius Terbang Nyamuk (~100m)';
      colorClass = 'text-rose-400';
      bgClass = 'bg-rose-500/20 border-rose-500/40 text-rose-300';
      barColor = 'from-rose-500 to-amber-500';
      level = 'alert';
      desc = 'Dalam radius jelajah aktif nyamuk Aedes aegypti. Tingkatkan kewaspadaan gigitan.';
    } else if (d <= 250) {
      // 100 - 250 meter: Waspada Aktif (55% - 79%)
      const factor = (d - 100) / 150;
      pct = Math.round(79 - factor * 24);
      statusText = 'ZONA WASPADA AKTIF';
      ringLabel = 'Perimeter Penyangga (~250m)';
      colorClass = 'text-amber-400';
      bgClass = 'bg-amber-500/20 border-amber-500/40 text-amber-300';
      barColor = 'from-amber-500 to-yellow-400';
      level = 'warning';
      desc = 'Dekat dengan titik genangan air. Cek talang dan bak sekitar rumah.';
    } else if (d <= 500) {
      // 250 - 500 meter: Pantauan Perimeter (25% - 54%)
      const factor = (d - 250) / 250;
      pct = Math.round(54 - factor * 29);
      statusText = 'ZONA PANTAUAN LUAR';
      ringLabel = 'Perimeter Luar (~500m)';
      colorClass = 'text-sky-400';
      bgClass = 'bg-sky-500/15 border-sky-500/30 text-sky-300';
      barColor = 'from-sky-500 to-emerald-400';
      level = 'caution';
      desc = 'Titik bahaya terdeteksi di lingkungan sekitar dalam radius 500 meter.';
    } else {
      // > 500 meter: Aman Terkendali (5% - 24%)
      // Semakin jauh (misal 1km -> 10%, 2km -> 5%)
      const factor = Math.min((d - 500) / 1500, 1);
      pct = Math.max(5, Math.round(24 - factor * 19));
      statusText = 'PERIMETER AMAN';
      ringLabel = 'Jarak Aman (>500m)';
      colorClass = 'text-emerald-400';
      bgClass = 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300';
      barColor = 'from-emerald-500 to-teal-400';
      level = 'safe';
      desc = 'Posisi Anda aman dari radius sarang nyamuk aktif terdaftar.';
    }

    return {
      percentage: pct,
      statusText,
      ringLabel,
      badgeColor: level === 'critical' || level === 'alert' ? 'rose' : level === 'warning' ? 'amber' : level === 'caution' ? 'sky' : 'emerald',
      colorClass,
      bgClass,
      barColor,
      ringRadius: d,
      level,
      description: desc
    };
  }, [activeReports.length, nearestDistance]);

  // Proximity audio alert effect: alert once when entering hazard zone
  useEffect(() => {
    if (nearestDistance !== null && nearestDistance < 200) {
      if (!hasHazardAlertedRef.current) {
        hasHazardAlertedRef.current = true;
        playHazardAlert();
        triggerHaptic([60, 100, 60, 100]);
      }
    } else if (nearestDistance !== null && nearestDistance > 300) {
      hasHazardAlertedRef.current = false;
    }
  }, [nearestDistance]);

  // PWA App Badging API: Show active hazard count on user's device app icon
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
      if (activeReports.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator as any).setAppBadge(activeReports.length).catch(() => {});
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator as any).clearAppBadge().catch(() => {});
      }
    }
  }, [activeReports.length]);

  // MANDATORY AUTH GATEWAY: Users MUST login or signup before accessing any features
  if (!user) {
    return (
      <div className="min-h-screen bg-[#070e0a] dot-matrix-bg batik-kawung-bg text-slate-100 relative overflow-x-hidden overflow-y-auto font-sans selection:bg-emerald-500 selection:text-slate-950 flex flex-col justify-between p-3 sm:p-6 pb-24 md:pb-12 touch-pan-y">
        {/* Background Ambient Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none z-0" />

        {/* Minimal Hero Header */}
        <header className="relative z-10 text-center pt-2 sm:pt-6 max-w-xl mx-auto w-full">
          <div className="flex flex-wrap items-center justify-center gap-1.5 mb-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
              <Radio size={12} className="animate-pulse text-emerald-400" />
              <span>Radar Epidemiologi Zero-G</span>
            </div>
            {installPrompt && !isInstalled && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] sm:text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
              >
                <Download size={11} className="stroke-[2.5]" />
                <span>Pasang PWA</span>
              </button>
            )}
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-emerald-300">
            Zero-G Mosquito
          </h1>
          <p className="mt-1 text-slate-300 text-[11px] sm:text-xs font-medium">
            Radar Pemantau Genangan & AI Vision Detektor Sarang Jentik
          </p>
        </header>

        {/* Auth Gateway Form */}
        <main className="relative z-10 w-full max-w-xl mx-auto my-2 py-2 sm:py-4">
          <LoginPage
            currentUser={null}
            onAuthSuccess={(loggedInUser) => {
              setUser(loggedInUser);
              setActiveTab('radar');
            }}
            onLogout={() => setUser(null)}
            onNavigateToRadar={() => setActiveTab('radar')}
            onNavigateToCamera={() => setActiveTab('camera')}
          />
        </main>

        <footer className="relative z-10 text-center py-4 text-[11px] text-slate-500">
          Zero-G Mosquito PWA • Komunitas Tanggap Demam Berdarah
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060c09] dot-matrix-bg batik-kawung-bg text-slate-100 relative overflow-x-hidden font-sans selection:bg-emerald-500 selection:text-slate-950 pb-28 md:pb-12">
      {/* Background Ambient Radial Highlights (Fixed GPU-Cached Layer, Zero Scroll Overhead) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" style={{ contain: 'strict' }}>
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] transform-gpu" />
        <div className="absolute top-[25%] right-[-10%] w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px] transform-gpu" />
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] transform-gpu" />
      </div>
      
      {/* STICKY TOP PRO NAVIGATION BAR (LINEAR / APPLE STYLE) */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-2xl border-b border-white/[0.08] px-4 py-3 sm:px-6 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-sm shrink-0">
              <Radio size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-tight text-base sm:text-lg">Zero-G Mosquito</span>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Sistem Radar Vektor & Deteksi Dini Jentik Demam Berdarah
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Awwwards Web App Header Style) */}
          <div className="hidden md:flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => switchTab('radar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'radar'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass size={14} />
              <span>Radar Peta</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab('camera')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera size={14} />
              <span>AI Vision</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot size={14} />
              <span>AI Chat</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab('data')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'data'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon size={14} />
              <span>Data Sanitasi</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab('account')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'account'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User size={14} />
              <span>Akun Saya</span>
            </button>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            {/* Offline Detection Indicator */}
            {!isOnline && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold animate-pulse">
                <WifiOff size={13} />
                <span className="hidden sm:inline">Offline</span>
              </div>
            )}

            {/* Pending Offline Sync Flush Trigger */}
            {pendingOfflineCount > 0 && (
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncingOffline || !isOnline}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse active:scale-95 cursor-pointer disabled:opacity-60"
                title={isOnline ? 'Ada laporan tersimpan saat offline. Klik untuk sinkronkan sekarang.' : 'Offline. Akan otomatis disinkronkan saat terhubung.'}
              >
                <RefreshCw size={12} className={isSyncingOffline ? 'animate-spin' : ''} />
                <span>{pendingOfflineCount} Sinkron</span>
              </button>
            )}

            {/* Quick Action Sheet Trigger (Menu Cepat Transparan) */}
            <button
              type="button"
              onClick={() => {
                setIsQuickActionSheetOpen(true);
                playTapSound();
                triggerHaptic(12);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
              title="Buka Menu Cepat (Home, Refresh, Menu, Settings)"
            >
              <Grid size={14} className="text-amber-400" />
              <span>Menu</span>
            </button>

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className={`p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer active:scale-95 ${
                isMuted
                  ? 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              }`}
              title={isMuted ? 'Suara & haptik nonaktif (Klik untuk menyalakan)' : 'Suara & haptik aktif (Klik untuk mute)'}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} className="text-emerald-400" />}
            </button>

            {/* PWA Install Trigger */}
            {installPrompt && !isInstalled && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-[0_2px_10px_rgba(16,185,129,0.3)] cursor-pointer active:scale-95"
                title="Pasang aplikasi Zero-G ke perangkat untuk akses cepat"
              >
                <Download size={13} className="stroke-[2.5]" />
                <span>Pasang App</span>
              </button>
            )}

            {/* User Profile Pill */}
            <button
              type="button"
              onClick={() => switchTab('account')}
              className={`inline-flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-xs text-white transition-all cursor-pointer active:scale-95 ${
                activeTab === 'account'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-slate-900/90 border-white/10 hover:border-white/20'
              }`}
              title="Buka Halaman Akun Saya"
            >
              <div className="w-5 h-5 rounded-lg bg-emerald-400 text-slate-950 font-black flex items-center justify-center text-[10px]">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold max-w-[100px] truncate hidden sm:inline">{user.name}</span>
            </button>

            {/* Quick Logout */}
            <button
              type="button"
              onClick={() => {
                saveStoredUser(null);
                setUser(null);
                playTapSound();
              }}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-xs transition-all cursor-pointer active:scale-95"
              title="Keluar dari Akun (Kunci Aplikasi)"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* TAB 1: RADAR PETA & EDUKASI CHAT */}
        {activeTab === 'radar' && (
          <div key="radar-tab" className="tab-transition space-y-6">
            {/* NUSANTARA LUXURY EDITORIAL HERO BANNER (CORAK BATIK KAWUNG & TEMA INDONESIA MODERN) */}
            <section className="relative rounded-3xl overflow-hidden hero-editorial-card p-6 sm:p-10 md:p-12 border border-emerald-500/25 transition-all group">
              {/* Subtle Ambient Background with Authentic Batik Kawung Vector Pattern */}
              <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <img
                  src="/hero_aerial.jpg"
                  alt="Aerial Forest Canopy Background"
                  className="w-full h-full object-cover object-center opacity-20 scale-105 transition-all duration-1000 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#040907] via-[#040907]/92 to-[#040907]/75" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#040907] via-transparent to-transparent" />
                <BatikKawungPattern opacity={0.14} className="text-emerald-400" />
              </div>
              
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left Column: Big Bold Statement Typography */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Category Pill Tag with Nusantara Heritage Accent */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-emerald-950/90 to-amber-950/60 border border-amber-500/30 text-emerald-300 text-xs font-semibold backdrop-blur-md">
                    <span className="text-amber-400 text-xs">❖</span>
                    <span>Pusaka Sanitasi Nusantara • Radar Komunitas 2026</span>
                  </div>

                  {/* High-Impact Editorial Heading */}
                  <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
                    Melindungi Warga, <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-amber-200 to-emerald-400">
                      Bebas Demam Berdarah
                    </span>
                  </h1>

                  {/* Subtitle / Philosophy Statement */}
                  <p className="text-slate-300 text-sm sm:text-base md:text-lg leading-relaxed max-w-xl font-normal drop-shadow">
                    Kearifan gotong royong pemantauan jentik berpadu dengan ketepatan radar satelit dan kecerdasan buatan AI Vision, melindungi seluruh keluarga dari ancaman demam berdarah.
                  </p>

                  {/* Quick CTAs */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        switchTab('camera');
                        playTapSound();
                      }}
                      className="btn-pro-primary px-5 py-3 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg hover:shadow-emerald-500/25 cursor-pointer active:scale-95"
                    >
                      <Camera size={16} />
                      <span>Buka AI Scanner</span>
                      <ArrowRight size={14} className="stroke-[2.5]" />
                    </button>

                    <button
                      type="button"
                      onClick={handleLocateMe}
                      className="px-5 py-3 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-amber-500/30 text-slate-100 hover:text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md active:scale-95"
                    >
                      <Crosshair size={15} className="text-amber-400" />
                      <span>Pusatkan Radar Saya</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: Modern Cyber-Batik Telemetry Visualizer (No standalone photos!) */}
                <div className="lg:col-span-5 flex flex-col gap-3">
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-500/30 shadow-2xl bg-[#06100b]/90 backdrop-blur-md p-4 group/card">
                    {/* Traditional Golden Hairline Corner Accents */}
                    <BatikCorner className="absolute top-2 left-2 text-amber-400/50" />
                    <BatikCorner className="absolute top-2 right-2 text-amber-400/50 rotate-90" />
                    <BatikCorner className="absolute bottom-2 left-2 text-amber-400/50 -rotate-90" />
                    <BatikCorner className="absolute bottom-2 right-2 text-amber-400/50 rotate-180" />
                    <BatikKawungPattern opacity={0.06} className="text-emerald-400" />

                    {/* Header */}
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                          <Radio size={16} className="animate-pulse" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-white whitespace-nowrap">Zero-G Telemetry</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono whitespace-nowrap">
                              KAWUNG
                            </span>
                          </div>
                          <p className="text-[10px] text-emerald-400 font-mono truncate">Radar Sanitasi Nusantara</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setIsTelemetryModalOpen(true);
                            playTapSound();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                          title="Buka & Update Tabel Data Telemetri Realtime"
                        >
                          <Edit3 size={11} />
                          <span>Update Tabel</span>
                        </button>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border transition-all whitespace-nowrap ${perimeterRisk.bgClass}`}>
                          {perimeterRisk.statusText} • {perimeterRisk.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Interactive Cyber-Batik Radar & Perimeter Mandala Visualizer */}
                    <div className="relative z-10 rounded-xl overflow-hidden my-3 p-4 bg-gradient-to-b from-[#0a1811] to-[#040907] border border-emerald-500/25 flex flex-col items-center justify-center min-h-[190px]">
                      <BatikKawungPattern opacity={0.12} className="text-emerald-300" />
                      
                      {/* Dynamic Multi-ring Perimeter Wave Animation */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                        {perimeterRisk.percentage >= 50 && (
                          <>
                            <div className={`absolute w-44 h-44 rounded-full border border-dashed animate-ping opacity-25 ${
                              perimeterRisk.percentage >= 80 ? 'border-rose-500' : 'border-amber-500'
                            }`} />
                            <div className={`absolute w-36 h-36 rounded-full border opacity-30 animate-pulse ${
                              perimeterRisk.percentage >= 80 ? 'border-rose-400/50' : 'border-amber-400/50'
                            }`} />
                          </>
                        )}
                        <div className="w-28 h-28 rounded-full border border-emerald-500/20" />
                      </div>

                      {/* Rotating Batik Mandala Insignia (Sedulur Papat Limo Pancer) */}
                      <div className="relative flex items-center justify-center py-2">
                        <BatikMandala size={132} className={`${
                          perimeterRisk.percentage >= 80 
                            ? 'text-rose-400/80 drop-shadow-[0_0_20px_rgba(244,63,94,0.35)]' 
                            : perimeterRisk.percentage >= 50 
                            ? 'text-amber-400/80 drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]' 
                            : 'text-emerald-400/80 drop-shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                        } animate-spin-slow`} />
                        
                        {/* Dynamic Perimeter Core Hub with Live Risk Percentage */}
                        <div className={`absolute w-16 h-16 rounded-full bg-slate-950/95 border-2 flex flex-col items-center justify-center shadow-xl transition-all ${
                          perimeterRisk.percentage >= 80
                            ? 'border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.4)]'
                            : perimeterRisk.percentage >= 50
                            ? 'border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.35)]'
                            : 'border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.35)]'
                        }`}>
                          <span className="text-[8px] font-black font-mono tracking-wider text-slate-300">RISIKO ZONA</span>
                          <span className={`text-sm sm:text-base font-black font-mono tracking-tight tabular-nums ${perimeterRisk.colorClass}`}>
                            {perimeterRisk.percentage}%
                          </span>
                          <span className="text-[8px] font-mono text-slate-400 leading-none">
                            {nearestDistance !== null ? `${nearestDistance < 1000 ? `${nearestDistance}m` : `${(nearestDistance / 1000).toFixed(1)}k`}` : 'GPS...'}
                          </span>
                        </div>
                      </div>

                      {/* Perimeter Ring Label & Progress Gauge */}
                      <div className="w-full mt-2 space-y-1.5 relative z-10">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-300 font-medium flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              perimeterRisk.percentage >= 80 ? 'bg-rose-500 animate-ping' : perimeterRisk.percentage >= 50 ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                            }`} />
                            <span>Perimeter: <strong className="text-white">{perimeterRisk.ringLabel}</strong></span>
                          </span>
                          <span className={`font-mono font-bold text-xs ${perimeterRisk.colorClass}`}>
                            {perimeterRisk.statusText}
                          </span>
                        </div>

                        {/* Animated Gradient Perimeter Risk Bar */}
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${perimeterRisk.barColor} transition-all duration-700`}
                            style={{ width: `${perimeterRisk.percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* 4 Cardinal Directions Protection Status */}
                      <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5 text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="truncate">{telemetryConfig.directions[0]?.penjuru}: {telemetryConfig.directions[0]?.status}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-300 justify-end">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span className="truncate">{telemetryConfig.directions[1]?.penjuru}: {telemetryConfig.directions[1]?.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="relative z-10 space-y-2">
                      <p className="text-xs text-slate-300 leading-relaxed">
                        <span className="text-amber-300 font-semibold">Status Lingkungan: </span>
                        {perimeterRisk.description}
                      </p>
                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/5">
                        <span className="text-slate-400">ABJ Nasional: <strong className="text-emerald-400 font-mono">{telemetryConfig.abjNasional.toFixed(1)}%</strong></span>
                        <span className="text-emerald-400 font-mono font-bold">{cleanedReports.length} Titik Bebas Jentik</span>
                      </div>
                    </div>
                  </div>

                  {/* Micro Quote / Stat Strip with Traditional Batik Touch */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="relative p-3 rounded-xl bg-gradient-to-br from-emerald-950/60 to-slate-950 border border-emerald-500/20 backdrop-blur-sm overflow-hidden">
                      <BatikKawungPattern opacity={0.06} className="text-emerald-400" />
                      <p className="text-[10px] uppercase font-bold text-amber-400/90 tracking-wider">Akurasi AI</p>
                      <p className="text-base font-extrabold text-emerald-300 font-mono mt-0.5">Vision 3.5</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">Dual Temporal Check</p>
                    </div>
                    <div className="relative p-3 rounded-xl bg-gradient-to-br from-emerald-950/60 to-slate-950 border border-emerald-500/20 backdrop-blur-sm overflow-hidden">
                      <BatikKawungPattern opacity={0.06} className="text-emerald-400" />
                      <p className="text-[10px] uppercase font-bold text-amber-400/90 tracking-wider">Gotong Royong</p>
                      <p className="text-base font-extrabold text-amber-300 font-mono mt-0.5">100% Warga</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">Sinkronisasi Realtime</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* KPI SITUATIONAL METRIC CARDS (APPLE HEALTH / STRAVA STYLE) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 fade-in-up">
              {/* KPI 1: Active Danger */}
              <div
                onClick={() => {
                  setRadarViewMode('active_danger');
                  playTapSound();
                  triggerHaptic(10);
                }}
                className={`glass-card p-2.5 sm:p-4 rounded-xl sm:rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                  radarViewMode === 'active_danger'
                    ? 'border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)] bg-slate-900/90'
                    : 'hover:border-white/20'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                    Bahaya Aktif
                  </p>
                  <div className="flex items-baseline gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                    <span className="text-lg sm:text-2xl font-bold tracking-tight text-white tabular-nums">
                      {activeReports.length}
                    </span>
                    <span className="text-[10px] sm:text-xs text-rose-400 font-medium truncate">Titik</span>
                  </div>
                </div>
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 items-center justify-center text-rose-400 shrink-0">
                  <ShieldAlert size={20} className={activeReports.length > 0 ? 'animate-pulse' : ''} />
                </div>
              </div>

              {/* KPI 2: Cleaned Reports */}
              <div
                onClick={() => {
                  setRadarViewMode('cleaned_history');
                  playTapSound();
                  triggerHaptic(10);
                }}
                className={`glass-card p-2.5 sm:p-4 rounded-xl sm:rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                  radarViewMode === 'cleaned_history'
                    ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-slate-900/90'
                    : 'hover:border-white/20'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                    Selesai Bersih
                  </p>
                  <div className="flex items-baseline gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                    <span className="text-lg sm:text-2xl font-bold tracking-tight text-white tabular-nums">
                      {cleanedReports.length}
                    </span>
                    <span className="text-[10px] sm:text-xs text-emerald-400 font-medium truncate">Aksi</span>
                  </div>
                </div>
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck size={20} />
                </div>
              </div>

              {/* KPI 3: Proximity & Perimeter Danger Percentage */}
              <div className="glass-card p-2.5 sm:p-4 rounded-xl sm:rounded-2xl flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                    Perimeter Risiko
                  </p>
                  <div className="flex items-baseline gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                    <span className={`text-lg sm:text-2xl font-black tracking-tight tabular-nums ${perimeterRisk.colorClass}`}>
                      {perimeterRisk.percentage}%
                    </span>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-mono truncate">
                      {nearestDistance !== null
                        ? nearestDistance < 10
                          ? '<10m'
                          : nearestDistance < 1000
                          ? `${nearestDistance}m`
                          : `${(nearestDistance / 1000).toFixed(1)}k`
                        : '---'}
                    </span>
                  </div>
                  <div className="mt-1">
                    <span
                      className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full inline-block truncate ${perimeterRisk.bgClass}`}
                    >
                      {perimeterRisk.statusText.split(':')[0]}
                    </span>
                  </div>
                </div>
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 items-center justify-center text-sky-400 shrink-0">
                  <Compass size={20} className={perimeterRisk.percentage >= 50 ? 'animate-spin-slow' : ''} />
                </div>
              </div>
            </div>

            {/* Dynamic Proximity Alert Banner (Perimeter Risk Indicator) */}
            {nearestDistance !== null && nearestDistance < 500 && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                {nearestDistance < 200 ? (
                  <div className="glass-card border-rose-500/40 p-4 rounded-2xl flex items-center justify-between gap-4 text-xs shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                        <ShieldAlert size={20} className="text-rose-400 animate-ping" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-rose-300 text-sm">
                            {perimeterRisk.statusText} ({nearestDistance < 10 ? 'Episentrum < 10m' : `~${nearestDistance}m`})
                          </p>
                          <span className="px-2 py-0.5 rounded-full bg-rose-500 text-slate-950 font-black text-[10px] font-mono">
                            {perimeterRisk.percentage}% RISIKO
                          </span>
                        </div>
                        <p className="text-slate-300 mt-0.5 leading-relaxed">
                          {perimeterRisk.description}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLocateMe}
                      className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-semibold shrink-0 cursor-pointer transition-all"
                    >
                      Pusatkan Peta
                    </button>
                  </div>
                ) : (
                  <div className="glass-card border-amber-500/40 p-4 rounded-2xl flex items-center justify-between gap-4 text-xs shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                        <AlertTriangle size={20} className="text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-amber-300 text-sm">
                            {perimeterRisk.statusText} (~{nearestDistance}m)
                          </p>
                          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] font-mono">
                            {perimeterRisk.percentage}% RISIKO
                          </span>
                        </div>
                        <p className="text-slate-300 mt-0.5 leading-relaxed">
                          {perimeterRisk.description}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLocateMe}
                      className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-semibold shrink-0 cursor-pointer transition-all"
                    >
                      Lihat Radar
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="flex flex-col gap-6">
              {/* Radar Map Card */}
              <div 
                className="p-1 bg-gradient-to-b from-emerald-500/15 via-slate-900/70 to-slate-950 border border-emerald-500/20 rounded-3xl shadow-2xl relative overflow-hidden transition-[height] duration-300 ease-in-out"
                style={{ height: isMapExpanded ? '600px' : '430px' }}
              >
                {/* Floating Mosquito Hovering over Radar */}
                <AnimatedMosquito className="absolute bottom-12 left-6 z-20 opacity-30 hover:opacity-90 transition-opacity" />

                {/* Atmospheric Circular Radar Sweep Layer */}
                {isRadarSweepActive && (
                  <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-[1.25rem]">
                    <div className="w-[750px] h-[750px] absolute -top-[160px] -left-[160px] rounded-full border border-emerald-500/10 animate-radar-sweep pointer-events-none opacity-25 bg-[conic-gradient(from_0deg,rgba(16,185,129,0.18)_0deg,rgba(16,185,129,0)_60deg,transparent_360deg)]" />
                    {/* Tactical Grid Crosshairs */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(2,6,23,0.3)_100%)] pointer-events-none" />
                  </div>
                )}

                {/* TOP FLOATING CONTROLS HUD */}
                <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                  {/* Left: Live Counter + Radar Mode + Layer Switcher */}
                  <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
                    {/* Live Counter Badge */}
                    <div className="flex items-center gap-2 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg text-xs">
                      {radarViewMode === 'active_danger' ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                          <span className="font-semibold text-slate-200 text-[11px] sm:text-xs">
                            {activeReports.length} Titik Bahaya Aktif
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="font-semibold text-emerald-300 text-[11px] sm:text-xs">
                            {cleanedReports.length} Selesai Dibersihkan
                          </span>
                        </>
                      )}
                    </div>

                    {/* Mode Selector: Bahaya Aktif vs Riwayat Bersih */}
                    <div className="flex items-center p-0.5 bg-slate-950/90 backdrop-blur-md rounded-xl border border-white/10 shadow-lg text-[10px] font-semibold">
                      <button
                        type="button"
                        onClick={() => {
                          setRadarViewMode('active_danger');
                          playTapSound();
                          triggerHaptic(10);
                        }}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          radarViewMode === 'active_danger'
                            ? 'bg-rose-500 text-white font-bold shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Tampilkan hanya titik bahaya yang belum dibersihkan"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                        <span>Bahaya ({activeReports.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRadarViewMode('cleaned_history');
                          playTapSound();
                          triggerHaptic(10);
                        }}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          radarViewMode === 'cleaned_history'
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Tampilkan riwayat titik yang sudah berhasil dibersihkan warga"
                      >
                        <CheckCircle2 size={11} className={radarViewMode === 'cleaned_history' ? 'text-slate-950' : 'text-emerald-400'} />
                        <span>Bersih ({cleanedReports.length})</span>
                      </button>
                    </div>

                    {/* Map Layer Selector Pills */}
                    <div className="flex items-center p-0.5 bg-slate-950/90 backdrop-blur-md rounded-xl border border-white/10 shadow-lg text-[10px] font-semibold">
                      <Layers size={11} className="text-emerald-400 ml-2 mr-1 shrink-0 hidden sm:inline" />
                      <button
                        type="button"
                        onClick={() => {
                          setMapLayer('dark');
                          playTapSound();
                          triggerHaptic(10);
                        }}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          mapLayer === 'dark'
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Tampilan Radar Gelap Sci-Fi"
                      >
                        🌙 Dark
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMapLayer('satellite');
                          playTapSound();
                          triggerHaptic(10);
                        }}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          mapLayer === 'satellite'
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Citra Satelit Asli HD (Esri)"
                      >
                        🛰️ Satelit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMapLayer('street');
                          playTapSound();
                          triggerHaptic(10);
                        }}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          mapLayer === 'street'
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Peta Jalan Detail (OpenStreetMap)"
                      >
                        🗺️ Jalan
                      </button>
                    </div>
                  </div>

                  {/* Right: Radar Sweep Toggle + Locate Me + Expand / Fullscreen Toggle */}
                  <div className="flex items-center gap-1.5 pointer-events-auto ml-auto">
                    {/* Radar Sweep Animation Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isRadarSweepActive;
                        setIsRadarSweepActive(next);
                        if (next) playRadarPing();
                        else playTapSound();
                        triggerHaptic(15);
                      }}
                      className={`p-2 rounded-xl border shadow-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                        isRadarSweepActive
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-slate-950/90 border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                      title={isRadarSweepActive ? 'Matikan Sapuan Animasi Radar' : 'Aktifkan Sapuan Animasi Radar'}
                    >
                      <Activity size={15} className={isRadarSweepActive ? 'animate-pulse' : ''} />
                    </button>

                    {/* Locate Me Button */}
                    <button
                      type="button"
                      onClick={handleLocateMe}
                      disabled={isLocating}
                      className="bg-slate-950/90 hover:bg-slate-800 text-emerald-400 p-2 rounded-xl border border-emerald-500/30 shadow-lg hover:border-emerald-400 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                      title="Pusatkan Radar ke Posisi Saya"
                    >
                      <Navigation size={15} className={isLocating ? 'animate-spin' : ''} />
                    </button>

                    {/* Fit All Spots in Viewport Button */}
                    <button
                      type="button"
                      onClick={handleFitAllReports}
                      className="bg-slate-950/90 hover:bg-slate-800 text-sky-400 p-2 rounded-xl border border-sky-500/30 shadow-lg hover:border-sky-400 transition-all cursor-pointer active:scale-95 flex items-center justify-center"
                      title="Lihat & Muat Semua Titik di Layar"
                    >
                      <Target size={15} />
                    </button>

                    {/* Expand/Collapse Map Height */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMapExpanded(!isMapExpanded);
                        playTapSound();
                        triggerHaptic(10);
                      }}
                      className="bg-slate-950/90 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 p-2 rounded-xl border border-white/10 shadow-lg transition-all cursor-pointer active:scale-95"
                      title={isMapExpanded ? 'Kecilkan Peta' : 'Perluas Peta (Immersive View)'}
                    >
                      {isMapExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                    </button>
                  </div>
                </div>

                {/* BOTTOM FLOATING TELEMETRY HUD */}
                <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
                  <div className="bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg text-[10px] text-emerald-400/90 font-mono flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      GPS: {mapTelemetry.lat.toFixed(4)}, {mapTelemetry.lng.toFixed(4)}
                    </span>
                    <span className="text-slate-500">|</span>
                    <span className="font-bold text-white">ZOOM {mapTelemetry.zoom}x</span>
                  </div>
                </div>

                {/* Leaflet Map without Default Ugly Controls */}
                <MapContainer
                  attributionControl={false}
                  zoomControl={false}
                  maxZoom={20}
                  minZoom={4}
                  style={{ height: '100%', width: '100%', borderRadius: '1.25rem' }}
                  center={[-6.2000, 106.8166]}
                  zoom={12}
                  className="z-0 border border-white/5"
                >
                  <MapFlyTo center={mapCenter} />
                  <MapFitBounds
                    reports={radarViewMode === 'active_danger' ? activeReports : cleanedReports}
                    trigger={fitBoundsTrigger}
                  />
                  <MapResizer activeTab={activeTab} isExpanded={isMapExpanded} />
                  <MapEventsHUD onUpdate={handleMapTelemetryUpdate} />
                  <MapZoomControls />

                  {/* Dynamic High-Resolution Tile Layers (Max Zoom 20 without missing tile error) */}
                  {/* High-Definition 100% Watermark-Free Esri & OpenStreetMap Tile Layers */}
                  {mapLayer === 'dark' && (
                    <>
                      <TileLayer 
                        key="esri-dark-base"
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                        maxZoom={19}
                        maxNativeZoom={16}
                      />
                      <TileLayer 
                        key="esri-dark-ref"
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                        maxZoom={19}
                        maxNativeZoom={16}
                        opacity={0.85}
                      />
                    </>
                  )}
                  {mapLayer === 'satellite' && (
                    <>
                      <TileLayer 
                        key="esri-satellite"
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        maxZoom={19}
                        maxNativeZoom={18}
                      />
                      <TileLayer 
                        key="esri-satellite-labels"
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                        maxZoom={19}
                        maxNativeZoom={18}
                        opacity={0.9}
                      />
                    </>
                  )}
                  {mapLayer === 'street' && (
                    <TileLayer 
                      key="osm-streets"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      maxZoom={19}
                      maxNativeZoom={19}
                    />
                  )}

                  {/* User GPS Location Marker & Range Circle */}
                  {userLocation && (
                    <>
                      <Circle
                        center={userLocation}
                        radius={60}
                        pathOptions={{
                          color: '#22d3ee',
                          fillColor: '#22d3ee',
                          fillOpacity: 0.12,
                          weight: 1.5,
                          dashArray: '3 3'
                        }}
                      />
                      <Marker position={userLocation} icon={userIcon}>
                        <Popup>
                          <div className="text-slate-100 p-2 text-xs space-y-1">
                            <p className="font-bold text-cyan-400 flex items-center gap-1.5">
                              <MapPin size={13} />
                              <span>Posisi Anda Saat Ini</span>
                            </p>
                            <p className="text-[11px] text-slate-300">
                              Sensor GPS aktif untuk deteksi zona bahaya terdekat.
                            </p>
                            <p className="text-[10px] text-slate-400 pt-1 border-t border-white/10 font-mono">
                              {userLocation[0].toFixed(5)}, {userLocation[1].toFixed(5)}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    </>
                  )}

                  {/* ACTIVE HAZARDS: Only uncleaned spots appear as red points and cast hazard radius */}
                  {radarViewMode === 'active_danger' &&
                    activeReports.map((r) => {
                      const repKey = r.id || `${r.latitude}-${r.longitude}`;
                      const isSelected = selectedReportId === repKey;

                      return (
                        <div key={repKey}>
                          {/* Graduated Multi-Tier Hazard Perimeters */}
                          {/* Tier 1: Episentrum Sarang (30m - Risiko 95-100%) */}
                          <Circle
                            center={[r.latitude, r.longitude]}
                            radius={30}
                            pathOptions={{
                              color: '#dc2626',
                              fillColor: '#ef4444',
                              fillOpacity: 0.35,
                              weight: 2
                            }}
                          />

                          {/* Tier 2: Radius Jelajah Nyamuk (100m - Risiko 80-94%) */}
                          <Circle
                            center={[r.latitude, r.longitude]}
                            radius={100}
                            pathOptions={{
                              color: '#f43f5e',
                              fillColor: '#f43f5e',
                              fillOpacity: 0.16,
                              weight: 1.5,
                              dashArray: '4 4'
                            }}
                          />

                          {/* Tier 3: Perimeter Waspada Lingkungan (250m - Risiko 55-79%) */}
                          <Circle
                            center={[r.latitude, r.longitude]}
                            radius={250}
                            pathOptions={{
                              color: '#f59e0b',
                              fillColor: '#f59e0b',
                              fillOpacity: 0.07,
                              weight: 1,
                              dashArray: '2 6'
                            }}
                          />

                          {/* Selected Spot High-Visibility Highlight Ring */}
                          {isSelected && (
                            <Circle
                              center={[r.latitude, r.longitude]}
                              radius={220}
                              pathOptions={{
                                color: '#38bdf8',
                                fillColor: '#38bdf8',
                                fillOpacity: 0.22,
                                weight: 2,
                                dashArray: '3 3'
                              }}
                            />
                          )}

                          <Marker
                            position={[r.latitude, r.longitude]}
                            icon={redIcon}
                            eventHandlers={{
                              click: () => setSelectedReportId(repKey)
                            }}
                          >
                          <Popup>
                            {(() => {
                              const meta = parseReportStatus(r.status);
                              const repKey = r.id || `${r.latitude}-${r.longitude}`;
                              const isCopied = copiedReportId === repKey;

                              const distToSpot = userLocation ? getDistanceInMeters(userLocation[0], userLocation[1], r.latitude, r.longitude) : null;
                              let spotRiskPct = 95;
                              if (distToSpot !== null) {
                                if (distToSpot <= 30) spotRiskPct = Math.round(100 - (distToSpot / 30) * 5);
                                else if (distToSpot <= 100) spotRiskPct = Math.round(94 - ((distToSpot - 30) / 70) * 14);
                                else if (distToSpot <= 250) spotRiskPct = Math.round(79 - ((distToSpot - 100) / 150) * 24);
                                else if (distToSpot <= 500) spotRiskPct = Math.round(54 - ((distToSpot - 250) / 250) * 29);
                                else spotRiskPct = Math.max(5, Math.round(24 - Math.min((distToSpot - 500) / 1500, 1) * 19));
                              }

                              return (
                                <div className="text-slate-100 p-2.5 text-xs max-w-[270px] space-y-2.5">
                                  {/* Header */}
                                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                                    <p className="font-bold text-red-400 flex items-center gap-1 text-[11px]">
                                      <AlertTriangle size={13} />
                                      <span>Titik Rawan Nyamuk</span>
                                    </p>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-rose-300 font-bold border border-red-500/30">
                                      {distToSpot !== null ? `${spotRiskPct}% Risiko (~${distToSpot < 1000 ? `${distToSpot}m` : `${(distToSpot/1000).toFixed(1)}k`})` : 'Perimeter Bahaya'}
                                    </span>
                                  </div>

                                  {/* Field Ground Condition Photo */}
                                  {meta.fieldPhoto ? (
                                    <div className="relative rounded-xl overflow-hidden border border-teal-500/30 bg-black/50 group">
                                      <img
                                        src={meta.fieldPhoto}
                                        alt="Kondisi Lapangan"
                                        className="w-full h-28 object-cover cursor-pointer hover:scale-105 transition-transform"
                                        onClick={() => setLightboxPhoto(meta.fieldPhoto || null)}
                                      />
                                      <div
                                        onClick={() => setLightboxPhoto(meta.fieldPhoto || null)}
                                        className="absolute bottom-1 right-1 bg-slate-950/85 backdrop-blur-sm text-teal-300 px-1.5 py-0.5 rounded-md text-[9px] font-medium flex items-center gap-1 cursor-pointer border border-white/10"
                                      >
                                        <Eye size={10} />
                                        <span>Perbesar Foto</span>
                                      </div>
                                      <div className="absolute top-1 left-1 bg-red-950/85 backdrop-blur-sm text-red-300 px-1.5 py-0.5 rounded-md text-[8px] font-bold border border-red-500/30">
                                        Foto Lapangan
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-2 rounded-xl bg-slate-950/40 border border-dashed border-white/10 text-center">
                                      <p className="text-[10px] text-slate-400">Belum ada foto kondisi lapangan</p>
                                    </div>
                                  )}

                                  {/* Physical Landmark / Patokan Lingkungan */}
                                  {meta.landmark && (
                                    <div className="p-2 rounded-xl bg-teal-950/50 border border-teal-500/30 text-teal-200 text-[11px] flex items-start gap-1.5">
                                      <Compass size={13} className="text-teal-400 shrink-0 mt-0.5" />
                                      <div>
                                        <span className="font-bold text-teal-300">Patokan: </span>
                                        <span>{meta.landmark}</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Status Summary */}
                                  <p className="font-medium text-slate-200 leading-snug">
                                    {meta.summary || r.status || 'Genangan air aktif terdeteksi'}
                                  </p>

                                  {/* High-Precision Real Coordinates & GPS Accuracy */}
                                  <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10 space-y-1">
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="text-slate-400 font-mono">KOORD ASLI GPS:</span>
                                      {meta.accuracyMeters && (
                                        <span className="text-[9px] text-emerald-400 font-mono">
                                          ±{meta.accuracyMeters}m (Presisi)
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono text-[11px] text-teal-300 font-bold">
                                        {r.latitude.toFixed(6)}, {r.longitude.toFixed(6)}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyCoord(repKey, r.latitude, r.longitude)}
                                        className="text-[10px] flex items-center gap-1 text-slate-300 hover:text-teal-300 bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded transition-all cursor-pointer border border-white/5"
                                        title="Salin Koordinat ke Clipboard"
                                      >
                                        {isCopied ? (
                                          <>
                                            <Check size={10} className="text-emerald-400" />
                                            <span className="text-emerald-400 font-bold">Tersalin</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy size={10} />
                                            <span>Salin</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    {r.created_at && (
                                      <div className="text-[9px] text-slate-500 pt-0.5 border-t border-white/5">
                                        Waktu: {new Date(r.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                      </div>
                                    )}
                                  </div>

                                  {/* Direct Google Maps Actions */}
                                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        window.open(
                                          `https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}`,
                                          '_blank'
                                        )
                                      }
                                      className="py-1.5 px-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                                    >
                                      <Navigation size={11} />
                                      <span>Rute G-Maps</span>
                                      <ExternalLink size={9} />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        window.open(
                                          `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`,
                                          '_blank'
                                        )
                                      }
                                      className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[10px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
                                    >
                                      <MapPin size={11} />
                                      <span>Cari di Peta</span>
                                      <ExternalLink size={9} />
                                    </button>
                                  </div>

                                  {/* Primary Action: 1-Klik Tandai Bersih & Tuntas */}
                                  <button
                                    type="button"
                                    onClick={() => handleQuickClean(r)}
                                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
                                  >
                                    <Zap size={14} className="fill-slate-950" />
                                    <span>1-Klik Tandai Bersih & Tuntas</span>
                                  </button>

                                  <div className="grid grid-cols-2 gap-1.5">
                                    {/* Action: Lapor Lengkap + Foto Bukti */}
                                    <button
                                      type="button"
                                      onClick={() => setCleaningReportTarget(r)}
                                      className="py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                                    >
                                      <ShieldCheck size={12} className="text-emerald-400" />
                                      <span>Lapor + Foto</span>
                                    </button>

                                    {/* Action: Add / Update Field Photo */}
                                    <button
                                      type="button"
                                      onClick={() => setFieldPhotoTarget(r)}
                                      className="py-1.5 px-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-300 text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                                    >
                                      <Camera size={12} />
                                      <span>Foto Lapangan</span>
                                    </button>
                                  </div>

                                  {/* Action: Hapus Laporan / Batalkan Titik */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteReport(r)}
                                    className="w-full py-1.5 px-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-[10px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
                                  >
                                    <Trash2 size={11} />
                                    <span>Hapus Titik (Salah / Duplikat)</span>
                                  </button>
                                </div>
                              );
                            })()}
                          </Popup>
                        </Marker>
                      </div>
                    );
                  })}

                  {/* CLEANED / RESOLVED SPOTS: Green checkmark markers (History) */}
                  {radarViewMode === 'cleaned_history' &&
                    cleanedReports.map((r) => (
                      <div key={r.id || `cln-${r.latitude}-${r.longitude}`}>
                        {/* Safe Clear Area Circle */}
                        <Circle
                          center={[r.latitude, r.longitude]}
                          radius={100}
                          pathOptions={{
                            color: '#10b981',
                            fillColor: '#10b981',
                            fillOpacity: 0.1,
                            weight: 1.5,
                            dashArray: '3 3'
                          }}
                        />
                        <Marker position={[r.latitude, r.longitude]} icon={greenIcon}>
                          <Popup>
                            {(() => {
                              const meta = parseReportStatus(r.status);
                              const repKey = r.id || `${r.latitude}-${r.longitude}`;
                              const isCopied = copiedReportId === repKey;

                              return (
                                <div className="text-slate-100 p-2.5 text-xs max-w-[270px] space-y-2.5">
                                  {/* Header */}
                                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                                    <p className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                                      <ShieldCheck size={13} />
                                      <span>Area Bebas Jentik</span>
                                    </p>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                                      Tuntas
                                    </span>
                                  </div>

                                  {/* Cleaned or Field Photo */}
                                  {(meta.cleanedPhoto || meta.fieldPhoto) && (
                                    <div className="relative rounded-xl overflow-hidden border border-emerald-500/30 bg-black/50 group">
                                      <img
                                        src={meta.cleanedPhoto || meta.fieldPhoto}
                                        alt="Bukti Hasil Bersih"
                                        className="w-full h-28 object-cover cursor-pointer hover:scale-105 transition-transform"
                                        onClick={() => setLightboxPhoto(meta.cleanedPhoto || meta.fieldPhoto || null)}
                                      />
                                      <div
                                        onClick={() => setLightboxPhoto(meta.cleanedPhoto || meta.fieldPhoto || null)}
                                        className="absolute bottom-1 right-1 bg-slate-950/85 backdrop-blur-sm text-emerald-300 px-1.5 py-0.5 rounded-md text-[9px] font-medium flex items-center gap-1 cursor-pointer border border-white/10"
                                      >
                                        <Eye size={10} />
                                        <span>Perbesar Foto</span>
                                      </div>
                                      <div className="absolute top-1 left-1 bg-emerald-950/85 backdrop-blur-sm text-emerald-300 px-1.5 py-0.5 rounded-md text-[8px] font-bold border border-emerald-500/30">
                                        {meta.cleanedPhoto ? 'Hasil Bersih' : 'Foto Lapangan'}
                                      </div>
                                    </div>
                                  )}

                                  {/* Physical Landmark / Patokan Lingkungan */}
                                  {meta.landmark && (
                                    <div className="p-2 rounded-xl bg-teal-950/50 border border-teal-500/30 text-teal-200 text-[11px] flex items-start gap-1.5">
                                      <Compass size={13} className="text-teal-400 shrink-0 mt-0.5" />
                                      <div>
                                        <span className="font-bold text-teal-300">Patokan: </span>
                                        <span>{meta.landmark}</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Cleaned Action & Note */}
                                  <div className="space-y-1">
                                    <p className="font-semibold text-emerald-300 text-xs">
                                      {meta.cleanedAction || 'Telah dibersihkan'}
                                    </p>
                                    {meta.cleanedNote && (
                                      <p className="text-[11px] text-slate-300 italic">
                                        &ldquo;{meta.cleanedNote}&rdquo;
                                      </p>
                                    )}
                                    {meta.cleanedBy && (
                                      <p className="text-[10px] text-slate-400">
                                        Dibersihkan oleh: <span className="text-slate-200 font-semibold">{meta.cleanedBy}</span>
                                      </p>
                                    )}
                                  </div>

                                  {/* High-Precision GPS Coordinates */}
                                  <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10 space-y-1">
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="text-slate-400 font-mono">KOORD ASLI GPS:</span>
                                      {meta.accuracyMeters && (
                                        <span className="text-[9px] text-emerald-400 font-mono">
                                          ±{meta.accuracyMeters}m
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono text-[11px] text-teal-300 font-bold">
                                        {r.latitude.toFixed(6)}, {r.longitude.toFixed(6)}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyCoord(repKey, r.latitude, r.longitude)}
                                        className="text-[10px] flex items-center gap-1 text-slate-300 hover:text-teal-300 bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded transition-all cursor-pointer border border-white/5"
                                        title="Salin Koordinat ke Clipboard"
                                      >
                                        {isCopied ? (
                                          <>
                                            <Check size={10} className="text-emerald-400" />
                                            <span className="text-emerald-400 font-bold">Tersalin</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy size={10} />
                                            <span>Salin</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Direct Google Maps Actions */}
                                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        window.open(
                                          `https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}`,
                                          '_blank'
                                        )
                                      }
                                      className="py-1.5 px-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                                    >
                                      <Navigation size={11} />
                                      <span>Rute G-Maps</span>
                                      <ExternalLink size={9} />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        window.open(
                                          `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`,
                                          '_blank'
                                        )
                                      }
                                      className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[10px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
                                    >
                                      <MapPin size={11} />
                                      <span>Cari di Peta</span>
                                      <ExternalLink size={9} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                          </Popup>
                        </Marker>
                      </div>
                    ))}
                </MapContainer>
              </div>

              {/* SHORTCUT BANNER KE HALAMAN DATA SANITASI */}
              <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-emerald-500/20 shadow-xl relative overflow-hidden">
                <BatikKawungPattern opacity={0.05} className="text-emerald-400 pointer-events-none" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <TableIcon size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Tabel Data Sanitasi & Laporan</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                        {reports.length} Titik
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Lihat rincian lengkap titik bahaya, foto lapangan, dan verifikasi pembersihan warga.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => switchTab('data')}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 shrink-0 relative z-10"
                >
                  <span>Buka Halaman Data</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Professional Civic Action Card with Batik Motif: Lapor Temuan Genangan Air */}
              <div className="rounded-2xl p-5 sm:p-6 relative overflow-hidden space-y-4 bg-gradient-to-br from-[#0c2016] via-[#07150f] to-[#040a07] border border-amber-500/25 shadow-2xl">
                <BatikKawungPattern opacity={0.08} className="text-emerald-400" />
                <BatikCorner className="absolute top-2.5 left-2.5 text-amber-400/40" />
                <BatikCorner className="absolute top-2.5 right-2.5 text-amber-400/40 rotate-90" />
                <BatikCorner className="absolute bottom-2.5 left-2.5 text-amber-400/40 -rotate-90" />
                <BatikCorner className="absolute bottom-2.5 right-2.5 text-amber-400/40 rotate-180" />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>Pelaporan Cepat Komunitas</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Lapor Temuan Titik Genangan Air
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed max-w-xl">
                      Temukan ember, selokan tersumbat, atau ban bekas berair? Tandai koordinat GPS ke radar warga agar dapat segera ditangani bersama.
                    </p>
                  </div>
                </div>

                {/* Contextual Nearby Hazard Alert & Direct Clean Action */}
                {nearestActiveReport ? (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-amber-300">
                            Titik Bahaya Terdeteksi di Lokasi Anda (~{nearestActiveReport.distance}m)
                          </p>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                            Aktif di Radar
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                          Genangan air tercatat aktif di titik ini. Jika sudah dikuras atau ditangani, klik tombol di bawah untuk langsung menghilangkan titik merah dari radar!
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleQuickClean(nearestActiveReport.report)}
                        className="btn-pro-primary py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.98]"
                      >
                        <Zap size={14} className="fill-slate-950" />
                        <span>1-Klik Tandai Bersih & Tuntas</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCleaningReportTarget(nearestActiveReport.report)}
                        className="py-2.5 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-300 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                      >
                        <Camera size={14} />
                        <span>Lapor Lengkap + Bukti Foto</span>
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Action Buttons: 1-Tap GPS vs Camera AI Vision */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Primary: 1-Tap GPS Instant Report */}
                  <button
                    type="button"
                    onClick={handleReport}
                    disabled={status === 'loading'}
                    className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm active:scale-[0.98] select-none ${
                      status === 'loading'
                        ? 'bg-slate-800 text-slate-400 cursor-wait border border-white/10'
                        : status === 'success'
                        ? 'bg-emerald-600 text-white border border-emerald-400/40 shadow-sm'
                        : status === 'error'
                        ? 'bg-rose-600 text-white border border-rose-400/40'
                        : nearestActiveReport
                        ? 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200'
                        : 'btn-pro-primary'
                    }`}
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-slate-300" />
                        <span>Mengirim Koordinat GPS...</span>
                      </>
                    ) : status === 'success' ? (
                      <>
                        <CheckCircle2 size={16} className="text-white" />
                        <span>Tersimpan di Radar Warga!</span>
                      </>
                    ) : status === 'error' ? (
                      <>
                        <AlertTriangle size={16} className="text-white" />
                        <span>Gagal Mengirim — Coba Lagi</span>
                      </>
                    ) : (
                      <>
                        <Crosshair size={16} className={nearestActiveReport ? 'text-rose-400' : 'text-slate-950 stroke-[2.5]'} />
                        <span>{nearestActiveReport ? 'Lapor Titik Bahaya Tambahan' : 'Lapor Sekarang (1-Tap GPS)'}</span>
                      </>
                    )}
                  </button>

                  {/* Secondary: Switch to AI Scanner */}
                  <button
                    type="button"
                    onClick={() => {
                      switchTab('camera');
                      playTapSound();
                    }}
                    className="py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-500/30 text-slate-200 hover:text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <Camera size={16} className="text-emerald-400" />
                    <span>Pindai Foto / Video AI Scanner</span>
                  </button>
                </div>

                {/* Status Message Toast */}
                {msg && (
                  <div
                    className={`text-xs font-medium px-3.5 py-2 rounded-xl border animate-in fade-in flex items-center gap-2 ${
                      status === 'error'
                        ? 'bg-rose-950/70 border-rose-500/40 text-rose-200'
                        : 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
                    }`}
                  >
                    {status === 'error' ? (
                      <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                    ) : (
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    )}
                    <span>{msg}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Shortcut ke Halaman AI Konsultasi */}
            <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-teal-500/20 shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                  <Bot size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Tanya Pakar Entomologi AI</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono font-bold">
                      GEMINI 3.5
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Konsultasi pencegahan DBD, abate, dan penanganan genangan air secara personal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => switchTab('chat')}
                className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 shrink-0"
              >
                <span>Mulai Konsultasi</span>
                <ArrowRight size={14} />
              </button>
            </div>
            </div>

            {/* AGROVERDE-STYLE MISSION MANIFESTO & CIVIC IMPACT SECTION */}
            <section className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#091510] to-[#040907] border border-emerald-500/20 p-6 sm:p-10 text-center space-y-6">
              <div className="max-w-2xl mx-auto space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold">
                  <Sparkles size={12} className="text-emerald-400" />
                  <span>Komitmen Zero-G Mosquito • PWA Komunitas</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  Mewujudkan Lingkungan Bebas Jentik, Menjaga Masa Depan Keluarga.
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                  Sinergi pemetaan real-time berbasis partisipasi warga dan analisis kecerdasan buatan untuk memastikan setiap sudut pemukiman terlindungi dari ancaman Demam Berdarah Dengue (DBD).
                </p>
              </div>

              {/* 3 Value Bento Pillars (Agroverde Style) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
                <div className="bento-card p-4 rounded-2xl border border-white/5 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 font-bold text-xs">
                    01
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Deteksi Presisi Tinggi</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    AI Vision memverifikasi foto wadah dan motilitas jentik hidup dalam hitungan detik dengan akurasi terkalibrasi.
                  </p>
                </div>

                <div className="bento-card p-4 rounded-2xl border border-white/5 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 font-bold text-xs">
                    02
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Transparansi Kolektif</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Seluruh titik bahaya dan bukti pembersihan terbuka bagi seluruh warga RT/RW tanpa sekat birokrasi.
                  </p>
                </div>

                <div className="bento-card p-4 rounded-2xl border border-white/5 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 font-bold text-xs">
                    03
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Aksi Cepat Tanggap</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    1-Klik tandai bersih seketika menghilangkan titik merah dari radar setelah genangan dikuras atau disterilkan.
                  </p>
                </div>
              </div>

              {/* NUSANTARA CIVIC HERITAGE BANNER (CORAK BATIK KAWUNG TRADISIONAL MODERN) */}
              <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 shadow-2xl bg-gradient-to-br from-[#0c2217] via-[#07160e] to-[#040907] p-6 sm:p-8 text-left group">
                {/* Authentic Batik Kawung Watermark Pattern */}
                <BatikKawungPattern opacity={0.12} className="text-amber-400" />

                {/* Golden Hairline Corner Flourishes */}
                <BatikCorner className="absolute top-3 left-3 text-amber-400/50" />
                <BatikCorner className="absolute top-3 right-3 text-amber-400/50 rotate-90" />
                <BatikCorner className="absolute bottom-3 left-3 text-amber-400/50 -rotate-90" />
                <BatikCorner className="absolute bottom-3 right-3 text-amber-400/50 rotate-180" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                      <span>❖</span>
                      <span>Pusaka Sanitasi Nusantara • Gotong Royong Digital</span>
                      <span>❖</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug">
                      Menjaga Kemurnian Air, <br className="hidden sm:inline" />
                      <span className="batik-gold-text">Melindungi Generasi Bangsa</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                      Memadukan tradisi kearifan gotong royong warga desa & kelurahan dengan kecerdasan buatan terdepan. Mewujudkan Indonesia sehat bebas Demam Berdarah Dengue.
                    </p>
                  </div>

                  {/* Cultural Health Movement Badges */}
                  <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0 self-stretch sm:self-auto justify-center">
                    <div className="p-3 rounded-xl bg-black/50 border border-emerald-500/30 backdrop-blur-md flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                        3M+
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Protokol Kesehatan</p>
                        <p className="text-xs font-bold text-emerald-300">Kuras, Tutup, Daur Ulang</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-black/50 border border-amber-500/30 backdrop-blur-md flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold text-xs">
                        G1R1J
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Gerakan Nasional</p>
                        <p className="text-xs font-bold text-amber-300">1 Rumah 1 Jumantik</p>
                      </div>
                    </div>
                  </div>
                </div>

                <BatikDivider className="mt-6 opacity-60" />
              </div>

              {/* Bottom Editorial Footer Note */}
              <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
                <span>© 2026 Zero-G Mosquito PWA. Seluruh Hak Cipta Dilindungi.</span>
                <span className="flex items-center gap-3">
                  <span className="text-emerald-400 font-medium">Bebas Genangan • Warga Sehat</span>
                  <span>•</span>
                  <span>Standar WHO & Kemenkes</span>
                </span>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: AI CAMERA & VIDEO VISION SCANNER */}
        {activeTab === 'camera' && (
          <div key="camera-tab" className="tab-transition py-2">
            <div className="text-center max-w-md mx-auto mb-4 sm:mb-6 px-2">
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
                <Camera size={20} className="text-emerald-400 shrink-0" />
                <span className="leading-tight">AI Vision Sarang & Jentik</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
                Pindai wadah genangan air via Foto Galeri atau Kamera HP untuk mendeteksi larva jentik secara otomatis.
              </p>
            </div>

            <CameraScanner
              currentUser={user}
              onPinToRadar={handlePinFromCamera}
              onNavigateToRadar={() => switchTab('radar')}
              onConsultAI={handleConsultAIFromPhoto}
            />
          </div>
        )}

        {/* TAB 3: DEDICATED AI CONSULTATION & CHAT ASSISTANT */}
        {activeTab === 'chat' && (
          <div key="chat-tab" className="tab-transition py-2 space-y-4">
            <div className="text-center max-w-md mx-auto mb-2 px-2">
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
                <Bot size={22} className="text-emerald-400 shrink-0" />
                <span>Konsultasi Pakar AI Entomologi</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
                Tanya jawab interaktif dengan Gemini AI seputar pencegahan DBD, abate, sanitasi, dan analisa foto.
              </p>
            </div>

            <MosquitoAI
              initialPrompt={chatInitialPrompt}
              initialAttachment={chatInitialAttachment}
              onClearInitial={() => {
                setChatInitialPrompt(undefined);
                setChatInitialAttachment(null);
              }}
            />
          </div>
        )}

        {/* TAB 4: DEDICATED DATA SANITASI & TITIK BAHAYA */}
        {activeTab === 'data' && (
          <div key="data-tab" className="tab-transition py-2 space-y-4">
            <div className="text-center max-w-md mx-auto mb-2 px-2">
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
                <TableIcon size={20} className="text-emerald-400 shrink-0" />
                <span>Pusat Data Sanitasi & Titik Bahaya</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
                Pantau seluruh titik bahaya aktif, riwayat pembersihan warga, koordinat GPS, dan verifikasi lapangan.
              </p>
            </div>

            <SanitationDataTable
              reports={reports}
              userLocation={userLocation}
              selectedReportId={selectedReportId}
              onSelectReport={handleSelectReport}
              onEditReport={(r) => {
                setEditingReport(r);
                playTapSound();
              }}
              onQuickToggleClean={handleQuickToggleClean}
              onViewPhoto={(r) => {
                const meta = parseReportStatus(r.status);
                const img = meta.fieldPhoto || meta.cleanedPhoto;
                if (img) {
                  setLightboxPhoto(img);
                  playTapSound();
                }
              }}
              onCopyCoord={handleCopyCoord}
              copiedReportId={copiedReportId}
              initialExpanded={true}
            />
          </div>
        )}

        {/* TAB 5: DEDICATED HALAMAN LOGIN & AKUN SAYA (TOKOPEDIA-STYLE) */}
        {activeTab === 'account' && (
          <div key="account-tab" className="tab-transition py-2">
            <LoginPage
              currentUser={user}
              onAuthSuccess={(loggedInUser) => {
                setUser(loggedInUser);
                setIsAuthModalOpen(false);
              }}
              onLogout={() => {
                setUser(null);
                setIsAuthModalOpen(false);
              }}
              onNavigateToRadar={() => switchTab('radar')}
              onNavigateToCamera={() => switchTab('camera')}
            />
          </div>
        )}
      </div>

      {/* MOBILE-FIRST PWA FLOATING BOTTOM NAVIGATION BAR (APPLE / LINEAR DESIGN - MOBILE ONLY) */}
      <nav className="md:hidden fixed bottom-3 left-2 right-2 z-50 bg-slate-950/90 backdrop-blur-2xl border border-white/[0.08] px-2 py-1.5 flex items-center justify-around max-w-md mx-auto rounded-2xl shadow-[0_20px_45px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)]">
        <button
          type="button"
          onClick={() => switchTab('radar')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 border ${
            activeTab === 'radar'
              ? 'text-emerald-300 font-bold bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/[0.04]'
          }`}
        >
          <Compass size={17} className={activeTab === 'radar' ? 'text-emerald-400' : ''} />
          <span className="text-[9px] tracking-tight font-semibold">Radar</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('camera')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 border ${
            activeTab === 'camera'
              ? 'text-emerald-300 font-bold bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/[0.04]'
          }`}
        >
          <div className="relative">
            <Camera size={17} className={activeTab === 'camera' ? 'text-emerald-400' : ''} />
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="text-[9px] tracking-tight font-semibold">Vision</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('chat')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 border ${
            activeTab === 'chat'
              ? 'text-emerald-300 font-bold bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/[0.04]'
          }`}
        >
          <Bot size={17} className={activeTab === 'chat' ? 'text-emerald-400' : ''} />
          <span className="text-[9px] tracking-tight font-semibold">AI Chat</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('data')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 border ${
            activeTab === 'data'
              ? 'text-emerald-300 font-bold bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/[0.04]'
          }`}
        >
          <TableIcon size={17} className={activeTab === 'data' ? 'text-emerald-400' : ''} />
          <span className="text-[9px] tracking-tight font-semibold">Data</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('account')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 border ${
            activeTab === 'account'
              ? 'text-emerald-300 font-bold bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/[0.04]'
          }`}
        >
          {user ? (
            <div className="w-4 h-4 rounded-full bg-emerald-400 text-slate-950 font-black flex items-center justify-center text-[8px] shadow-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <User size={17} className={activeTab === 'account' ? 'text-emerald-400' : ''} />
          )}
          <span className="text-[9px] tracking-tight font-semibold">
            {user ? 'Akun' : 'Masuk'}
          </span>
        </button>
      </nav>

      {/* Tokopedia-Inspired Auth & User Profile Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={user}
        onAuthSuccess={(loggedInUser) => setUser(loggedInUser)}
        onLogout={() => setUser(null)}
      />

      {/* Community Cleaning & Hazard Elimination Modal */}
      <CleaningReportModal
        isOpen={cleaningReportTarget !== null}
        onClose={() => setCleaningReportTarget(null)}
        report={cleaningReportTarget}
        currentUser={user}
        onSuccess={(updatedReport) => {
          const targetLat = updatedReport.latitude;
          const targetLng = updatedReport.longitude;

          setReports((prev) => {
            const updated = prev.map((r) => {
              const isOverlapping =
                r.id === updatedReport.id ||
                (Math.abs(r.latitude - targetLat) < 0.0003 && Math.abs(r.longitude - targetLng) < 0.0003);
              return isOverlapping ? { ...r, status: updatedReport.status } : r;
            });
            if (!updated.some((r) => r.id === updatedReport.id)) {
              updated.push(updatedReport);
            }
            saveCachedReports(updated);
            return updated;
          });
          playSuccessChime();
          triggerHaptic([30, 80, 30]);
          setMsg('Titik bahaya berhasil dibersihkan! Titik merah telah dihapus dari radar aktif.');
          setStatus('success');
          setTimeout(() => {
            setStatus('idle');
            setMsg('');
          }, 4000);
        }}
      />

      {/* Field Ground Photo & Landmark Metadata Modal */}
      <FieldPhotoModal
        isOpen={fieldPhotoTarget !== null}
        onClose={() => setFieldPhotoTarget(null)}
        report={fieldPhotoTarget}
        currentUser={user}
        onSuccess={(updatedReport) => {
          setReports((prev) => {
            const updated = prev.map((r) => (r.id === updatedReport.id ? updatedReport : r));
            saveCachedReports(updated);
            return updated;
          });
          playSuccessChime();
          triggerHaptic([30, 80, 30]);
          setMsg('Foto kondisi lapangan dan data patokan berhasil diperbarui!');
          setStatus('success');
          setTimeout(() => setStatus('idle'), 4000);
        }}
      />

      {/* Fullscreen Photo Lightbox Preview */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setLightboxPhoto(null)}
        >
          <div className="relative max-w-xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxPhoto(null)}
              className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
            <img
              src={lightboxPhoto}
              alt="Foto Lapangan Full"
              className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}
      {/* Realtime Report Editor Modal */}
      {editingReport && (
        <EditReportModal
          report={editingReport}
          currentUserName={user?.name}
          onClose={() => setEditingReport(null)}
          onUpdated={handleUpdateReport}
          onDeleted={handleDeleteReportById}
        />
      )}

      {/* Realtime Telemetry & ABJ Target Editor Modal */}
      {isTelemetryModalOpen && (
        <TelemetryTableModal
          currentConfig={telemetryConfig}
          onClose={() => setIsTelemetryModalOpen(false)}
          onSave={(updatedCfg) => setTelemetryConfig(updatedCfg)}
        />
      )}

      {/* Quick Action Sheet Popup (Frosted Glass Menu: Home, Refresh, Menu, Settings) */}
      <QuickActionSheet
        isOpen={isQuickActionSheetOpen}
        onClose={() => setIsQuickActionSheetOpen(false)}
        position="bottom"
        onNavigateHome={() => switchTab('radar')}
        onRefreshData={() => {
          handleManualSync();
          handleFitAllReports();
        }}
        onOpenFullMenu={() => setIsFeatureMenuOpen(true)}
        onOpenSettings={() => switchTab('account')}
        isRadarSweepActive={isRadarSweepActive}
        onToggleRadarSweep={() => {
          const next = !isRadarSweepActive;
          setIsRadarSweepActive(next);
          if (next) playRadarPing();
          else playTapSound();
          triggerHaptic(15);
        }}
        isMuted={isMuted}
        onToggleSound={toggleSound}
      />

      {/* Central Feature Table Menu Modal (Tabel Menu Lengkap Semua Fitur) */}
      <FeatureMenuModal
        isOpen={isFeatureMenuOpen}
        onClose={() => setIsFeatureMenuOpen(false)}
        activeTab={activeTab}
        onNavigateTab={(tab) => switchTab(tab)}
        onOpenTelemetryTable={() => {
          setIsTelemetryModalOpen(true);
        }}
        onLocateMe={handleLocateMe}
        onFitAllReports={handleFitAllReports}
        onReportIncident={handleReport}
        isRadarSweepActive={isRadarSweepActive}
        onToggleRadarSweep={() => {
          const next = !isRadarSweepActive;
          setIsRadarSweepActive(next);
          if (next) playRadarPing();
          else playTapSound();
          triggerHaptic(15);
        }}
        isMuted={isMuted}
        onToggleSound={toggleSound}
        mapLayer={mapLayer}
        onChangeMapLayer={(layer) => setMapLayer(layer)}
        activeReportsCount={activeReports.length}
        cleanedReportsCount={cleanedReports.length}
        riskPercentage={perimeterRisk.percentage}
        userName={user?.name}
        onManualSync={handleManualSync}
        pendingOfflineCount={pendingOfflineCount}
        isOnline={isOnline}
      />
    </div>
  );
}

