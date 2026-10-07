import { useEffect, useRef } from 'react';
import {
  Home,
  RefreshCw,
  Menu,
  Settings,
  Activity,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { playTapSound, triggerHaptic } from '../lib/soundFx';
import { BatikKawungPattern, BatikCorner } from './BatikDecorations';

export interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'bottom' | 'top';
  onNavigateHome: () => void;
  onRefreshData: () => void;
  onOpenFullMenu: () => void;
  onOpenSettings: () => void;
  isRadarSweepActive: boolean;
  onToggleRadarSweep: () => void;
  isMuted: boolean;
  onToggleSound: () => void;
}

export default function QuickActionSheet({
  isOpen,
  onClose,
  position = 'bottom',
  onNavigateHome,
  onRefreshData,
  onOpenFullMenu,
  onOpenSettings,
  isRadarSweepActive,
  onToggleRadarSweep,
  isMuted,
  onToggleSound
}: QuickActionSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAction = (fn: () => void) => {
    playTapSound();
    triggerHaptic(12);
    fn();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Frosted Glass Floating Card (Exactly inspired by user's reference mockup) */}
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm rounded-[28px] relative overflow-hidden p-5 shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.25)] border border-white/20 transition-all ${
          position === 'top' ? 'sm:mt-16 animate-in slide-in-from-top-4' : 'mb-16 sm:mb-0 animate-in slide-in-from-bottom-4'
        } bg-gradient-to-b from-[#0e271a]/95 via-[#081810]/95 to-[#040c08]/95 backdrop-blur-2xl text-white`}
      >
        {/* Subtle Kawung Batik Watermark & Corner Accents */}
        <BatikKawungPattern opacity={0.08} className="text-emerald-300 pointer-events-none" />
        <BatikCorner className="absolute top-2.5 left-2.5 text-amber-400/40 pointer-events-none" />
        <BatikCorner className="absolute top-2.5 right-2.5 text-amber-400/40 rotate-90 pointer-events-none" />

        {/* Header Drag Handle / Close Button */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Menu Cepat Nusantara
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* THE 4 PRIMARY ACTIONS (Matches User Mockup: Home, Refresh, Menu, Settings) */}
        <div className="py-2.5 space-y-1 relative z-10">
          {/* 1. Home (Radar Peta) */}
          <button
            type="button"
            onClick={() => handleAction(onNavigateHome)}
            className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl hover:bg-white/10 active:scale-98 transition-all text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all shrink-0">
              <Home size={19} />
            </div>
            <div className="flex-1">
              <span className="text-sm font-semibold tracking-wide text-white block">Home</span>
              <span className="text-[10px] text-slate-400">Kembali ke Radar Peta Utama</span>
            </div>
          </button>

          {/* 2. Refresh (Sinkronisasi Data Realtime) */}
          <button
            type="button"
            onClick={() => handleAction(onRefreshData)}
            className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl hover:bg-white/10 active:scale-98 transition-all text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-slate-950 transition-all shrink-0">
              <RefreshCw size={19} />
            </div>
            <div className="flex-1">
              <span className="text-sm font-semibold tracking-wide text-white block">Refresh</span>
              <span className="text-[10px] text-slate-400">Muat Ulang Koordinat & Server</span>
            </div>
          </button>

          {/* 3. Menu (Buka Semua Fitur Lengkap) */}
          <button
            type="button"
            onClick={() => handleAction(onOpenFullMenu)}
            className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl hover:bg-white/10 active:scale-98 transition-all text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shrink-0">
              <Menu size={19} />
            </div>
            <div className="flex-1">
              <span className="text-sm font-semibold tracking-wide text-white block">Menu</span>
              <span className="text-[10px] text-slate-400">Direktori Semua Fitur & Tabel Lengkap</span>
            </div>
          </button>

          {/* 4. Settings (Pengaturan & Profil Pengguna) */}
          <button
            type="button"
            onClick={() => handleAction(onOpenSettings)}
            className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl hover:bg-white/10 active:scale-98 transition-all text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-slate-950 transition-all shrink-0">
              <Settings size={19} />
            </div>
            <div className="flex-1">
              <span className="text-sm font-semibold tracking-wide text-white block">Settings</span>
              <span className="text-[10px] text-slate-400">Pengaturan Sensor, Suara, & Akun</span>
            </div>
          </button>
        </div>

        {/* QUICK SENSORY & RADAR TOGGLES IN FOOTER */}
        <div className="pt-2.5 border-t border-white/10 grid grid-cols-2 gap-2 relative z-10">
          <button
            type="button"
            onClick={onToggleRadarSweep}
            className={`py-1.5 px-2.5 rounded-xl text-[11px] font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              isRadarSweepActive
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            <Activity size={12} />
            <span>Radar: {isRadarSweepActive ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            className={`py-1.5 px-2.5 rounded-xl text-[11px] font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              !isMuted
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            {!isMuted ? <Volume2 size={12} /> : <VolumeX size={12} />}
            <span>Audio: {!isMuted ? 'ON' : 'MUTE'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
