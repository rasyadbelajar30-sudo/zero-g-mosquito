// File: src/components/SanitationDataTable.tsx

import { useState, useMemo, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Edit3,
  LocateFixed,
  Camera,
  Copy,
  Check,
  Table as TableIcon,
  LayoutGrid,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { type MosquitoReport } from '../lib/supabase';
import {
  parseReportStatus,
  isReportCleaned,
  estimateLocationName,
  isJunkReport,
  getDeletedReportIds
} from '../lib/reportData';
import { playTapSound, triggerHaptic } from '../lib/soundFx';
import { BatikKawungPattern, BatikCorner } from './BatikDecorations';

interface SanitationDataTableProps {
  reports: MosquitoReport[];
  userLocation: [number, number] | null;
  selectedReportId: string | null;
  onSelectReport: (report: MosquitoReport) => void;
  onEditReport: (report: MosquitoReport) => void;
  onQuickToggleClean: (report: MosquitoReport) => void;
  onViewPhoto: (report: MosquitoReport) => void;
  onCopyCoord: (reportId: string, lat: number, lng: number) => void;
  copiedReportId: string | null;
  initialExpanded?: boolean;
}

export default function SanitationDataTable({
  reports,
  userLocation,
  selectedReportId,
  onSelectReport,
  onEditReport,
  onQuickToggleClean,
  onViewPhoto,
  onCopyCoord,
  copiedReportId,
  initialExpanded = false
}: SanitationDataTableProps) {
  // Accordion drop state: collapsed by default or openable on demand
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'danger' | 'cleaned'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'distance'>('newest');
  const [viewFormat, setViewFormat] = useState<'table' | 'cards'>('table');

  // Filter out anomalies / dummy junk from the active list
  const sanitizedReports = useMemo(() => {
    const deletedIds = getDeletedReportIds();
    return reports.filter((r) => !isJunkReport(r) && !(r.id && deletedIds.has(r.id)));
  }, [reports]);

  // Distance helper
  const calculateDistance = useCallback((lat: number, lng: number) => {
    if (!userLocation) return null;
    const R = 6371e3;
    const φ1 = (userLocation[0] * Math.PI) / 180;
    const φ2 = (lat * Math.PI) / 180;
    const Δφ = ((lat - userLocation[0]) * Math.PI) / 180;
    const Δλ = ((lng - userLocation[1]) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }, [userLocation]);

  // Perimeter Risk Percentage calculation helper
  const getSpotPerimeterRisk = useCallback((dist: number | null, isClean: boolean) => {
    if (isClean) {
      return { percentage: 0, label: '0% Steril', badgeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' };
    }
    if (dist === null) {
      return { percentage: 80, label: 'Siaga', badgeClass: 'bg-rose-500/15 border-rose-500/30 text-rose-300' };
    }
    if (dist <= 30) {
      const pct = Math.round(100 - (dist / 30) * 5);
      return { percentage: pct, label: `${pct}% Kritis`, badgeClass: 'bg-rose-500/25 border-rose-500/50 text-rose-200' };
    }
    if (dist <= 100) {
      const pct = Math.round(94 - ((dist - 30) / 70) * 14);
      return { percentage: pct, label: `${pct}% Siaga`, badgeClass: 'bg-rose-500/20 border-rose-500/40 text-rose-300' };
    }
    if (dist <= 250) {
      const pct = Math.round(79 - ((dist - 100) / 150) * 24);
      return { percentage: pct, label: `${pct}% Waspada`, badgeClass: 'bg-amber-500/20 border-amber-500/40 text-amber-300' };
    }
    if (dist <= 500) {
      const pct = Math.round(54 - ((dist - 250) / 250) * 29);
      return { percentage: pct, label: `${pct}% Pantauan`, badgeClass: 'bg-sky-500/15 border-sky-500/30 text-sky-300' };
    }
    const pct = Math.max(5, Math.round(24 - Math.min((dist - 500) / 1500, 1) * 19));
    return { percentage: pct, label: `${pct}% Aman`, badgeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' };
  }, []);

  // Filter & Search
  const filteredReports = useMemo(() => {
    return sanitizedReports
      .filter((r) => {
        const isClean = isReportCleaned(r.status);
        if (filterMode === 'danger' && isClean) return false;
        if (filterMode === 'cleaned' && !isClean) return false;

        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const meta = parseReportStatus(r.status);
        const locName = estimateLocationName(r.latitude, r.longitude).toLowerCase();
        const landmark = (meta.landmark || '').toLowerCase();
        const summary = (meta.summary || '').toLowerCase();
        const reporter = (meta.reportedBy || meta.cleanedBy || '').toLowerCase();

        return (
          locName.includes(q) ||
          landmark.includes(q) ||
          summary.includes(q) ||
          reporter.includes(q) ||
          `${r.latitude},${r.longitude}`.includes(q)
        );
      })
      .sort((a, b) => {
        if (sortOrder === 'distance' && userLocation) {
          const distA = calculateDistance(a.latitude, a.longitude) ?? 999999;
          const distB = calculateDistance(b.latitude, b.longitude) ?? 999999;
          return distA - distB;
        }
        if (sortOrder === 'oldest') {
          return (a.created_at || '').localeCompare(b.created_at || '');
        }
        // default: newest
        return (b.created_at || '').localeCompare(a.created_at || '');
      });
  }, [sanitizedReports, filterMode, searchQuery, sortOrder, userLocation, calculateDistance]);

  const totalCount = sanitizedReports.length;
  const dangerCount = sanitizedReports.filter((r) => !isReportCleaned(r.status)).length;
  const cleanedCount = sanitizedReports.filter((r) => isReportCleaned(r.status)).length;

  return (
    <div className="glass-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 space-y-4 relative overflow-hidden border border-emerald-500/20 shadow-2xl transition-all">
      {/* Authentic Batik Background Accent */}
      <BatikKawungPattern opacity={0.06} className="text-emerald-400 pointer-events-none" />
      <BatikCorner className="absolute top-2.5 left-2.5 text-amber-400/40 pointer-events-none" />
      <BatikCorner className="absolute top-2.5 right-2.5 text-amber-400/40 rotate-90 pointer-events-none" />
      <BatikCorner className="absolute bottom-2.5 left-2.5 text-amber-400/40 -rotate-90 pointer-events-none" />
      <BatikCorner className="absolute bottom-2.5 right-2.5 text-amber-400/40 rotate-180 pointer-events-none" />

      {/* COMPACT ACCORDION BAR (Header always visible, click anywhere to Drop/Collapse) */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setIsExpanded(!isExpanded);
            playTapSound();
            triggerHaptic(10);
          }}
          className="flex-1 w-full sm:w-auto text-left flex items-start sm:items-center justify-between gap-3 group/header cursor-pointer select-none"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2 group-hover/header:text-emerald-300 transition-colors">
                <span>Tabel Data Sanitasi & Titik Bahaya</span>
              </h3>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold">
                REALTIME
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-slate-300">
                {totalCount} titik valid terpantau
              </span>
              <span className="text-slate-500 text-xs">•</span>
              <span className="text-[10px] text-rose-300 font-semibold bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.2 rounded-full">
                {dangerCount} Bahaya
              </span>
              <span className="text-[10px] text-emerald-300 font-semibold bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">
                {cleanedCount} Bebas
              </span>
            </div>
          </div>

          {/* Dropdown Toggle Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-emerald-300 text-xs font-semibold group-hover/header:bg-emerald-500 group-hover/header:text-slate-950 transition-all shrink-0">
            <span>{isExpanded ? 'Tutup Tabel' : 'Buka Tabel'}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </button>

        {/* View Switcher (Only visible when expanded) */}
        {isExpanded && (
          <div className="flex items-center gap-1.5 self-stretch sm:self-auto bg-slate-950/80 p-1 rounded-xl border border-white/10 shrink-0 animate-in fade-in duration-200">
            <button
              type="button"
              onClick={() => {
                setViewFormat('table');
                playTapSound();
              }}
              className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewFormat === 'table'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon size={13} />
              <span>Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewFormat('cards');
                playTapSound();
              }}
              className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewFormat === 'cards'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid size={13} />
              <span>Kartu</span>
            </button>
          </div>
        )}
      </div>

      {/* EXPANDABLE BODY CONTENT (DROPDOWN) */}
      {isExpanded && (
        <div className="space-y-4 pt-2 border-t border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Note info */}
          <p className="text-[11px] text-slate-300 leading-relaxed relative z-10">
            Tampilan dropdown hemat ruang. Klik tombol <span className="text-amber-300 font-semibold">Edit</span> untuk langsung meng-update data, atau centang tombol status untuk beralih antara Bahaya & Bersih.
          </p>

      {/* Filter & Search Toolbar */}
      <div className="relative z-10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari wilayah, patokan fisik, pelapor, atau status..."
            className="w-full bg-slate-950/80 border border-white/10 focus:border-emerald-400/50 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white"
            >
              Hapus
            </button>
          )}
        </div>

        {/* Filter Badges Pill */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => {
              setFilterMode('all');
              playTapSound();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer border ${
              filterMode === 'all'
                ? 'bg-slate-800 border-white/20 text-white'
                : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            Semua ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterMode('danger');
              playTapSound();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer border flex items-center gap-1.5 ${
              filterMode === 'danger'
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 ring-1 ring-rose-400/30'
                : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-rose-300'
            }`}
          >
            <ShieldAlert size={12} className="text-rose-400" />
            <span>Bahaya Aktif ({dangerCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterMode('cleaned');
              playTapSound();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer border flex items-center gap-1.5 ${
              filterMode === 'cleaned'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-400/30'
                : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-emerald-300'
            }`}
          >
            <ShieldCheck size={12} className="text-emerald-400" />
            <span>Bebas Jentik ({cleanedCount})</span>
          </button>

          {/* Sort selector */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="bg-slate-950/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 outline-none shrink-0 cursor-pointer"
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            {userLocation && <option value="distance">Terdekat</option>}
          </select>
        </div>
      </div>

      {/* 1. VIEW MODE: FULL DATA TABLE */}
      {viewFormat === 'table' && (
        <div className="relative z-10 max-h-[380px] overflow-y-auto overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80 shadow-inner custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md">
              <tr className="bg-white/[0.04] border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-400 font-semibold font-mono">
                <th className="py-3 px-3.5 text-center w-12">#</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 min-w-[160px]">Lokasi & Wilayah</th>
                <th className="py-3 px-3 min-w-[180px]">Patokan Fisik / Landmark</th>
                <th className="py-3 px-3 text-center min-w-[70px]">Foto</th>
                <th className="py-3 px-3 min-w-[130px]">Pelapor</th>
                <th className="py-3 px-3 text-right min-w-[140px]">Aksi Realtime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <p className="font-semibold">Tidak ada data titik yang cocok dengan filter.</p>
                    <p className="text-[11px] mt-1 text-slate-500">Coba ubah kata kunci pencarian atau ganti filter status.</p>
                  </td>
                </tr>
              ) : (
                filteredReports.map((r, index) => {
                  const meta = parseReportStatus(r.status);
                  const isClean = isReportCleaned(r.status);
                  const repKey = r.id || `${r.latitude}-${r.longitude}`;
                  const isSelected = selectedReportId === repKey;
                  const locName = estimateLocationName(r.latitude, r.longitude);
                  const distance = userLocation ? calculateDistance(r.latitude, r.longitude) : null;
                  const hasPhoto = Boolean(meta.fieldPhoto || meta.cleanedPhoto);

                  return (
                    <tr
                      key={repKey}
                      className={`transition-colors group hover:bg-white/[0.03] ${
                        isSelected ? 'bg-emerald-500/10 ring-1 ring-emerald-500/40' : ''
                      }`}
                    >
                      {/* Column 1: Index Number */}
                      <td className="py-3 px-3.5 text-center font-mono text-[11px] text-slate-400">
                        {index + 1}
                      </td>

                      {/* Column 2: Status & Perimeter Risk Toggle */}
                      <td className="py-3 px-3">
                        {(() => {
                          const spotRisk = getSpotPerimeterRisk(distance, isClean);
                          return (
                            <div className="flex flex-col items-start gap-1">
                              <button
                                type="button"
                                onClick={() => onQuickToggleClean(r)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer active:scale-95 ${
                                  isClean
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                                    : 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
                                }`}
                                title="Klik untuk cepat ganti status (Bahaya <-> Bersih)"
                              >
                                {isClean ? (
                                  <>
                                    <ShieldCheck size={12} className="text-emerald-400" />
                                    <span>Bebas Jentik</span>
                                  </>
                                ) : (
                                  <>
                                    <ShieldAlert size={12} className="text-rose-400 animate-pulse" />
                                    <span>Bahaya Aktif</span>
                                  </>
                                )}
                              </button>
                              {!isClean && (
                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border ${spotRisk.badgeClass}`}>
                                  {spotRisk.label}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Column 3: Location Name & GPS Coordinates */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <p className="font-bold text-white line-clamp-1">{locName}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                            <span>
                              {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
                            </span>
                            <button
                              type="button"
                              onClick={() => onCopyCoord(repKey, r.latitude, r.longitude)}
                              className="text-slate-500 hover:text-white transition-colors"
                              title="Salin Koordinat GPS"
                            >
                              {copiedReportId === repKey ? (
                                <Check size={11} className="text-emerald-400" />
                              ) : (
                                <Copy size={11} />
                              )}
                            </button>
                            {distance !== null && (
                              <span className="text-emerald-400 font-semibold ml-1">
                                • {distance < 1000 ? `${distance} m` : `${(distance / 1000).toFixed(1)} km`}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 4: Physical Landmark / Notes */}
                      <td className="py-3 px-3">
                        {meta.landmark ? (
                          <p className="text-slate-200 line-clamp-2 leading-relaxed">
                            <span className="text-teal-300 font-semibold">📍 </span>
                            {meta.landmark}
                          </p>
                        ) : meta.cleanedAction ? (
                          <p className="text-emerald-300 line-clamp-2 leading-relaxed">
                            <span className="text-emerald-400 font-semibold">✓ </span>
                            {meta.cleanedAction}
                          </p>
                        ) : (
                          <p className="text-slate-400 line-clamp-2 italic">
                            {meta.summary || 'Genangan air terdeteksi'}
                          </p>
                        )}
                      </td>

                      {/* Column 5: Photo Thumbnail */}
                      <td className="py-3 px-3 text-center">
                        {hasPhoto ? (
                          <button
                            type="button"
                            onClick={() => onViewPhoto(r)}
                            className="w-10 h-10 rounded-lg overflow-hidden border border-white/20 hover:border-emerald-400 transition-all inline-block group/thumb cursor-pointer relative"
                            title="Klik untuk melihat foto lapangan"
                          >
                            <img
                              src={meta.fieldPhoto || meta.cleanedPhoto}
                              alt="Bukti Lapangan"
                              className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform"
                            />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">No photo</span>
                        )}
                      </td>

                      {/* Column 6: Reporter & Time */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5 text-[11px]">
                          <p className="font-semibold text-slate-300">
                            {meta.cleanedBy || meta.reportedBy || 'Warga'}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID') : 'Terkini'}
                          </p>
                        </div>
                      </td>

                      {/* Column 7: Realtime Action Buttons */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Locate in Map */}
                          <button
                            type="button"
                            onClick={() => {
                              onSelectReport(r);
                              playTapSound();
                            }}
                            className={`p-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                              isSelected
                                ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                                : 'bg-slate-900 border-white/10 text-slate-300 hover:text-white hover:border-white/20'
                            }`}
                            title="Pusatkan Titik di Peta Radar"
                          >
                            <LocateFixed size={13} />
                          </button>

                          {/* Edit / Update Info Realtime */}
                          <button
                            type="button"
                            onClick={() => {
                              onEditReport(r);
                              playTapSound();
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                            title="Ganti & Update Data Titik Ini"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. VIEW MODE: RESPONSIVE CARDS */}
      {viewFormat === 'cards' && (
        <div className="relative z-10 max-h-[380px] overflow-y-auto p-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 custom-scrollbar">
          {filteredReports.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-400 bg-slate-950/60 rounded-2xl border border-white/10">
              <p className="font-semibold">Tidak ada data titik yang cocok dengan filter.</p>
            </div>
          ) : (
            filteredReports.map((r, index) => {
              const meta = parseReportStatus(r.status);
              const isClean = isReportCleaned(r.status);
              const repKey = r.id || `${r.latitude}-${r.longitude}`;
              const isSelected = selectedReportId === repKey;
              const locName = estimateLocationName(r.latitude, r.longitude);
              const distance = userLocation ? calculateDistance(r.latitude, r.longitude) : null;
              const hasPhoto = Boolean(meta.fieldPhoto || meta.cleanedPhoto);

              return (
                <div
                  key={repKey}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 bg-slate-950/80 ${
                    isSelected
                      ? 'border-emerald-400 ring-1 ring-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-slate-300">
                          #{index + 1}
                        </span>
                        {(() => {
                          const spotRisk = getSpotPerimeterRisk(distance, isClean);
                          if (isClean) return null;
                          return (
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${spotRisk.badgeClass}`}>
                              {spotRisk.label}
                            </span>
                          );
                        })()}
                      </div>
                      <button
                        type="button"
                        onClick={() => onQuickToggleClean(r)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                          isClean
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        {isClean ? 'Bebas Jentik' : 'Bahaya Aktif'}
                      </button>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-white line-clamp-1">{locName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
                        {distance !== null && ` • ${distance} m`}
                      </p>
                    </div>

                    {meta.landmark && (
                      <p className="text-[11px] text-teal-300 line-clamp-2">
                        📍 {meta.landmark}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                    {hasPhoto ? (
                      <button
                        type="button"
                        onClick={() => onViewPhoto(r)}
                        className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Camera size={12} />
                        <span>Lihat Foto</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500">Tanpa Foto</span>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectReport(r)}
                        className="py-1 px-2.5 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-400/30 text-[10px] font-semibold flex items-center gap-1"
                      >
                        <LocateFixed size={11} />
                        <span>Peta</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onEditReport(r)}
                        className="py-1 px-2.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1"
                      >
                        <Edit3 size={11} />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

          {/* Bottom Accordion Action bar: Quick Clean Anomalies & Close Button */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs">
            <p className="text-[11px] text-slate-400">
              Menampilkan {filteredReports.length} dari {totalCount} titik terverifikasi.
            </p>
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                playTapSound();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ChevronUp size={13} />
              <span>Lipat / Tutup Tabel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
