// File: src/components/FeatureMenuModal.tsx

import {
  Compass,
  Camera,
  User,
  Table as TableIcon,
  Activity,
  Layers,
  Volume2,
  VolumeX,
  RefreshCw,
  PlusCircle,
  X,
  MapPin,
  Sparkles,
  Bot
} from 'lucide-react';
import { BatikKawungPattern, BatikCorner } from './BatikDecorations';
import { playTapSound, triggerHaptic } from '../lib/soundFx';

export interface FeatureMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'radar' | 'camera' | 'chat' | 'data' | 'account';
  onNavigateTab: (tab: 'radar' | 'camera' | 'chat' | 'data' | 'account') => void;
  onOpenTelemetryTable: () => void;
  onLocateMe: () => void;
  onFitAllReports: () => void;
  onReportIncident: () => void;
  isRadarSweepActive: boolean;
  onToggleRadarSweep: () => void;
  isMuted: boolean;
  onToggleSound: () => void;
  mapLayer: 'dark' | 'satellite' | 'street';
  onChangeMapLayer: (layer: 'dark' | 'satellite' | 'street') => void;
  activeReportsCount: number;
  cleanedReportsCount: number;
  riskPercentage: number;
  userName?: string;
  onManualSync: () => void;
  pendingOfflineCount: number;
  isOnline: boolean;
}

export default function FeatureMenuModal({
  isOpen,
  onClose,
  activeTab,
  onNavigateTab,
  onOpenTelemetryTable,
  onLocateMe,
  onFitAllReports,
  onReportIncident,
  isRadarSweepActive,
  onToggleRadarSweep,
  isMuted,
  onToggleSound,
  mapLayer,
  onChangeMapLayer,
  activeReportsCount,
  cleanedReportsCount,
  riskPercentage,
  userName,
  onManualSync,
  pendingOfflineCount,
  isOnline
}: FeatureMenuModalProps) {
  if (!isOpen) return null;

  const handleAction = (cb: () => void, closeAfter = true) => {
    playTapSound();
    triggerHaptic(15);
    cb();
    if (closeAfter) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-3xl bg-gradient-to-b from-[#0a1811] via-[#05100a] to-[#020604] border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.25)] p-5 sm:p-7 space-y-6 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Authentic Batik Kawung Watermark & Gold Corners */}
        <BatikKawungPattern opacity={0.08} className="text-emerald-300 pointer-events-none" />
        <BatikCorner className="absolute top-3 left-3 text-amber-400/50 pointer-events-none" />
        <BatikCorner className="absolute top-3 right-3 text-amber-400/50 rotate-90 pointer-events-none" />
        <BatikCorner className="absolute bottom-3 left-3 text-amber-400/50 -rotate-90 pointer-events-none" />
        <BatikCorner className="absolute bottom-3 right-3 text-amber-400/50 rotate-180 pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-start justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold tracking-wider uppercase mb-1">
              <Sparkles size={11} className="text-amber-400" />
              <span>Direktori Pusat Fitur PWA</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Tabel Menu & Akses Navigasi Cepat</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {userName ? `Selamat bertugas, ${userName}. ` : ''}Kelola radar, kamera AI, lapisan peta, telemetri, dan sinkronisasi dalam satu layar kendali.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="Tutup Menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Quick Status Strip */}
        <div className="relative z-10 grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-950/80 border border-white/10 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Bahaya Terpantau</span>
            <p className="font-bold font-mono text-rose-400 text-sm">{activeReportsCount} Titik</p>
          </div>
          <div className="space-y-0.5 border-x border-white/10 px-2 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Area Disterilkan</span>
            <p className="font-bold font-mono text-emerald-400 text-sm">{cleanedReportsCount} Aksi</p>
          </div>
          <div className="space-y-0.5 text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Risiko Perimeter</span>
            <p className="font-bold font-mono text-amber-300 text-sm">{riskPercentage}%</p>
          </div>
        </div>

        {/* SECTION 1: Navigasi Utama Aplikasi */}
        <div className="relative z-10 space-y-2.5">
          <h3 className="text-xs uppercase font-mono font-bold text-amber-300 tracking-wider flex items-center gap-1.5">
            <Compass size={13} />
            <span>1. Modul Utama Sistem</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {/* Tab 1: Radar Map */}
            <button
              type="button"
              onClick={() => handleAction(() => onNavigateTab('radar'))}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 group ${
                activeTab === 'radar'
                  ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                  : 'bg-slate-950/60 border-white/10 hover:border-white/20 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Compass size={16} />
                </div>
                {activeTab === 'radar' && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950">
                    AKTIF
                  </span>
                )}
              </div>
              <div>
                <p className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors">
                  Radar Peta Vektor
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Pemetaan GPS realtime, lingkaran perimeter bahaya, & data lapangan.
                </p>
              </div>
            </button>

            {/* Tab 2: AI Scanner */}
            <button
              type="button"
              onClick={() => handleAction(() => onNavigateTab('camera'))}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 group ${
                activeTab === 'camera'
                  ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                  : 'bg-slate-950/60 border-white/10 hover:border-white/20 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Camera size={16} />
                </div>
                {activeTab === 'camera' && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950">
                    AKTIF
                  </span>
                )}
              </div>
              <div>
                <p className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                  AI Scanner Jentik
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Kamera visi komputer & deteksi motilitas larva dari galeri/HP.
                </p>
              </div>
            </button>

            {/* Tab 3: AI Consultation & Chat */}
            <button
              type="button"
              onClick={() => handleAction(() => onNavigateTab('chat'))}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 group ${
                activeTab === 'chat'
                  ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                  : 'bg-slate-950/60 border-white/10 hover:border-white/20 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <Bot size={16} />
                </div>
                {activeTab === 'chat' && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950">
                    AKTIF
                  </span>
                )}
              </div>
              <div>
                <p className="font-bold text-xs text-white group-hover:text-teal-300 transition-colors">
                  Konsultasi AI Gemini
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Tanya jawab pakar entomologi, tips abate, & diagnosa foto.
                </p>
              </div>
            </button>

            {/* Tab 4: Data Sanitasi */}
            <button
              type="button"
              onClick={() => handleAction(() => onNavigateTab('data'))}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 group ${
                activeTab === 'data'
                  ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                  : 'bg-slate-950/60 border-white/10 hover:border-white/20 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <TableIcon size={16} />
                </div>
                {activeTab === 'data' && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950">
                    AKTIF
                  </span>
                )}
              </div>
              <div>
                <p className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors">
                  Data Sanitasi & Laporan
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Tabel pemantauan titik bahaya, aksi bersih, & verifikasi.
                </p>
              </div>
            </button>

            {/* Tab 5: Account & Profile */}
            <button
              type="button"
              onClick={() => handleAction(() => onNavigateTab('account'))}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 group ${
                activeTab === 'account'
                  ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                  : 'bg-slate-950/60 border-white/10 hover:border-white/20 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <User size={16} />
                </div>
                {activeTab === 'account' && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950">
                    AKTIF
                  </span>
                )}
              </div>
              <div>
                <p className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors">
                  Profil & Tim Warga
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Identitas Jumantik, riwayat aksi, dan status keanggotaan.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* SECTION 2: Operasional Radar & Kontrol Lapangan */}
        <div className="relative z-10 space-y-2.5">
          <h3 className="text-xs uppercase font-mono font-bold text-amber-300 tracking-wider flex items-center gap-1.5">
            <Activity size={13} />
            <span>2. Operasional Radar & Lapangan</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Action 1: Lapor Titik Baru */}
            <button
              type="button"
              onClick={() => handleAction(onReportIncident)}
              className="p-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 text-left transition-all cursor-pointer flex flex-col gap-1.5 active:scale-95"
            >
              <PlusCircle size={16} className="text-rose-400" />
              <span className="font-bold text-xs">Lapor Sarang</span>
              <span className="text-[10px] text-slate-400 leading-tight">Tandai koordinat GPS genangan</span>
            </button>

            {/* Action 2: Update Tabel Telemetri */}
            <button
              type="button"
              onClick={() => handleAction(onOpenTelemetryTable)}
              className="p-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 text-left transition-all cursor-pointer flex flex-col gap-1.5 active:scale-95"
            >
              <TableIcon size={16} className="text-amber-400" />
              <span className="font-bold text-xs">Edit Telemetri</span>
              <span className="text-[10px] text-slate-400 leading-tight">Ubah data 4 penjuru & ABJ</span>
            </button>

            {/* Action 3: Pusatkan GPS */}
            <button
              type="button"
              onClick={() => handleAction(onLocateMe)}
              className="p-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-200 text-left transition-all cursor-pointer flex flex-col gap-1.5 active:scale-95"
            >
              <MapPin size={16} className="text-sky-400" />
              <span className="font-bold text-xs">Lokasi Saya</span>
              <span className="text-[10px] text-slate-400 leading-tight">Fokuskan radar ke posisi GPS</span>
            </button>

            {/* Action 4: Tampilkan Semua Titik */}
            <button
              type="button"
              onClick={() => handleAction(onFitAllReports)}
              className="p-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-200 text-left transition-all cursor-pointer flex flex-col gap-1.5 active:scale-95"
            >
              <Layers size={16} className="text-emerald-400" />
              <span className="font-bold text-xs">Semua Titik</span>
              <span className="text-[10px] text-slate-400 leading-tight">Fit seluruh titik dalam layar</span>
            </button>
          </div>
        </div>

        {/* SECTION 3: Preferensi Lapisan Peta & Sensor */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
          {/* Map Layer Switcher */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 space-y-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Gaya Lapisan Peta Radar
            </span>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => onChangeMapLayer('dark')}
                className={`py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer ${
                  mapLayer === 'dark'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                Dark Radar
              </button>
              <button
                type="button"
                onClick={() => onChangeMapLayer('satellite')}
                className={`py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer ${
                  mapLayer === 'satellite'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                Satelit
              </button>
              <button
                type="button"
                onClick={() => onChangeMapLayer('street')}
                className={`py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer ${
                  mapLayer === 'street'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                Jalanan
              </button>
            </div>
          </div>

          {/* Sensory & Sync Toggles */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 space-y-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Pengaturan Sensor & Audio
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={onToggleRadarSweep}
                className={`py-1.5 px-2.5 rounded-lg border flex items-center justify-center gap-1.5 transition-all cursor-pointer font-semibold ${
                  isRadarSweepActive
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <Activity size={12} />
                <span>Sapuan: {isRadarSweepActive ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={onToggleSound}
                className={`py-1.5 px-2.5 rounded-lg border flex items-center justify-center gap-1.5 transition-all cursor-pointer font-semibold ${
                  !isMuted
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                {!isMuted ? <Volume2 size={12} /> : <VolumeX size={12} />}
                <span>Audio: {!isMuted ? 'ON' : 'MUTE'}</span>
              </button>
            </div>

            {/* Offline sync button if pending */}
            {pendingOfflineCount > 0 && (
              <button
                type="button"
                onClick={onManualSync}
                disabled={!isOnline}
                className="w-full mt-1.5 py-1.5 px-3 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={12} className="animate-spin" />
                <span>Sinkronkan {pendingOfflineCount} Laporan Tertunda</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10 text-[11px] text-slate-400">
          <span>Zero-G Mosquito PWA • Edisi Jumantik Nusantara</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-white font-semibold transition-all cursor-pointer"
          >
            Tutup Menu
          </button>
        </div>
      </div>
    </div>
  );
}
