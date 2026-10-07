// File: src/components/EditReportModal.tsx

import React, { useState } from 'react';
import {
  X,
  Save,
  AlertTriangle,
  MapPin,
  Camera,
  Upload,
  Loader2,
  Trash2,
  FileText,
  User,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { supabase, type MosquitoReport } from '../lib/supabase';
import {
  parseReportStatus,
  serializeReportStatus,
  isReportCleaned,
  compressImageToDataUrl,
  estimateLocationName,
  type ReportMetadata
} from '../lib/reportData';
import { playSuccessChime, playTapSound, triggerHaptic } from '../lib/soundFx';
import { BatikKawungPattern, BatikCorner } from './BatikDecorations';

interface EditReportModalProps {
  report: MosquitoReport;
  currentUserName?: string;
  onClose: () => void;
  onUpdated: (updated: MosquitoReport) => void;
  onDeleted?: (deletedId: string) => void;
}

export default function EditReportModal({
  report,
  currentUserName = 'Warga Komunitas',
  onClose,
  onUpdated,
  onDeleted
}: EditReportModalProps) {
  const currentMeta = parseReportStatus(report.status);
  const isCurrentlyClean = isReportCleaned(report.status);

  // Form State
  const [statusType, setStatusType] = useState<'danger' | 'cleaned'>(isCurrentlyClean ? 'cleaned' : 'danger');
  const [landmark, setLandmark] = useState(currentMeta.landmark || '');
  const [summary, setSummary] = useState(currentMeta.summary || '');
  const [cleanedAction, setCleanedAction] = useState(currentMeta.cleanedAction || 'Dikuras & Disterilkan Warga');
  const [reportedBy, setReportedBy] = useState(currentMeta.reportedBy || currentUserName);
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(currentMeta.fieldPhoto || currentMeta.cleanedPhoto);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const locName = estimateLocationName(report.latitude, report.longitude);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
      const compressed = await compressImageToDataUrl(file, 480, 480, 0.7);
      setPhotoPreview(compressed);
      playTapSound();
    } catch {
      setErrorMessage('Gagal memproses foto. Silakan coba file lain.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    playTapSound();
    triggerHaptic(20);

    try {
      const updatedMeta: ReportMetadata = {
        ...currentMeta,
        landmark: landmark.trim() || undefined,
        reportedBy: reportedBy.trim() || currentUserName
      };

      if (statusType === 'cleaned') {
        updatedMeta.summary = `Dibersihkan: ${cleanedAction} (Oleh: ${reportedBy.trim() || currentUserName})`;
        updatedMeta.cleanedAction = cleanedAction;
        updatedMeta.cleanedBy = reportedBy.trim() || currentUserName;
        updatedMeta.cleanedAt = currentMeta.cleanedAt || new Date().toISOString();
        if (photoPreview) {
          updatedMeta.cleanedPhoto = photoPreview;
        }
      } else {
        // Danger / Active
        updatedMeta.summary = summary.trim() || 'Titik Rawan Genangan Nyamuk';
        delete updatedMeta.cleanedAction;
        delete updatedMeta.cleanedBy;
        delete updatedMeta.cleanedAt;
        delete updatedMeta.cleanedPhoto;
        if (photoPreview) {
          updatedMeta.fieldPhoto = photoPreview;
        }
      }

      const serialized = serializeReportStatus(updatedMeta);
      const updatedReportPayload: MosquitoReport = {
        ...report,
        status: serialized
      };

      // 1. Update in Supabase (if online and report has an ID)
      if (report.id && !report.id.startsWith('offline-')) {
        const { error } = await supabase
          .from('reports')
          .update({ status: serialized })
          .eq('id', report.id);

        if (error) {
          console.warn('Supabase update error, applying local optimistic update:', error);
        }
      }

      // 2. Notify parent with optimistic update
      onUpdated(updatedReportPayload);
      playSuccessChime();
      triggerHaptic([30, 50, 30]);
      onClose();
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || 'Terjadi kesalahan saat menyimpan perubahan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Yakin ingin menghapus titik laporan ini dari radar secara permanen?')) {
      return;
    }

    setIsDeleting(true);
    playTapSound();
    triggerHaptic(25);

    try {
      if (report.id && !report.id.startsWith('offline-')) {
        const { error } = await supabase
          .from('reports')
          .delete()
          .eq('id', report.id);

        if (error) {
          console.warn('Supabase delete error:', error);
        }
      }

      if (onDeleted && report.id) {
        onDeleted(report.id);
      }
      playSuccessChime();
      onClose();
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || 'Gagal menghapus laporan.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-gradient-to-br from-[#0c2016] via-[#07150f] to-[#040a07] border border-amber-500/25 rounded-3xl p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain">
        {/* Batik Ornaments */}
        <BatikKawungPattern opacity={0.12} className="text-emerald-400 pointer-events-none" />
        <BatikCorner className="absolute top-2.5 left-2.5 text-amber-400/50 pointer-events-none" />
        <BatikCorner className="absolute top-2.5 right-2.5 text-amber-400/50 rotate-90 pointer-events-none" />
        <BatikCorner className="absolute bottom-2.5 left-2.5 text-amber-400/50 -rotate-90 pointer-events-none" />
        <BatikCorner className="absolute bottom-2.5 right-2.5 text-amber-400/50 rotate-180 pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between pb-3.5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/35 flex items-center justify-center text-amber-300">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Ganti & Update Data Titik</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                  REALTIME
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">{locName}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {errorMessage && (
          <div className="my-3 p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-shake">
            <AlertTriangle size={15} className="shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="relative z-10 space-y-4 pt-3.5">
          {/* GPS Location & Coordinates Info */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <MapPin size={14} className="text-emerald-400 shrink-0" />
              <span className="font-mono text-[11px]">
                {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
              Terkunci GPS
            </span>
          </div>

          {/* 1. Status Selector: Danger vs Cleaned */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">Status Keamanan Titik:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatusType('danger')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  statusType === 'danger'
                    ? 'bg-rose-500/25 border-rose-500 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.3)] ring-1 ring-rose-400/50'
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert size={14} className={statusType === 'danger' ? 'text-rose-400 animate-pulse' : ''} />
                <span>Titik Bahaya Aktif</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusType('cleaned')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  statusType === 'cleaned'
                    ? 'bg-emerald-500/25 border-emerald-500 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/50'
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck size={14} className={statusType === 'cleaned' ? 'text-emerald-400' : ''} />
                <span>Bebas Jentik (Bersih)</span>
              </button>
            </div>
          </div>

          {/* 2. Action if Cleaned */}
          {statusType === 'cleaned' && (
            <div className="space-y-1.5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/25">
              <label className="text-xs font-semibold text-emerald-300">Tindakan Pembersihan / Penanganan:</label>
              <select
                value={cleanedAction}
                onChange={(e) => setCleanedAction(e.target.value)}
                className="w-full bg-slate-950/90 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="Dikuras & Disterilkan Warga">Dikuras & Disterilkan Warga</option>
                <option value="Diberi Bubuk Abate / Larvasida">Diberi Bubuk Abate / Larvasida</option>
                <option value="Wadah Dibalik / Ditutup Rapat">Wadah Dibalik / Ditutup Rapat</option>
                <option value="Selokan Dibersihkan & Dilancarkan">Selokan Dibersihkan & Dilancarkan</option>
                <option value="Didaur Ulang / Dibuang ke TPS">Didaur Ulang / Dibuang ke TPS</option>
              </select>
            </div>
          )}

          {/* 3. Summary / Threat Description if Danger */}
          {statusType === 'danger' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">Keterangan Genangan / Potensi Sarang:</label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Contoh: Genangan ember cat berlumut & jentik aktif"
                className="w-full bg-slate-950/80 border border-white/10 focus:border-amber-400/60 rounded-xl px-3 py-2 text-xs text-white outline-none transition-all"
              />
            </div>
          )}

          {/* 4. Physical Landmark Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
              <span>Patokan Fisik / Landmark Lapangan:</span>
              <span className="text-[10px] text-slate-400">Mudahkan penelusuran warga</span>
            </label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="Contoh: Belakang pos ronda RT 03, dekat drum biru"
              className="w-full bg-slate-950/80 border border-white/10 focus:border-emerald-400/60 rounded-xl px-3 py-2 text-xs text-white outline-none transition-all"
            />
          </div>

          {/* 5. Reported / Handled By */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <User size={13} className="text-emerald-400" />
              <span>Petugas / Pelapor Pembaruan:</span>
            </label>
            <input
              type="text"
              value={reportedBy}
              onChange={(e) => setReportedBy(e.target.value)}
              placeholder="Nama Anda atau Tim Jumantik"
              className="w-full bg-slate-950/80 border border-white/10 focus:border-emerald-400/60 rounded-xl px-3 py-2 text-xs text-white outline-none transition-all"
            />
          </div>

          {/* 6. Photo Update / Attachment */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
              <span>Foto Bukti Lapangan:</span>
              {photoPreview && (
                <button
                  type="button"
                  onClick={() => setPhotoPreview(undefined)}
                  className="text-[10px] text-rose-400 hover:underline"
                >
                  Hapus Foto
                </button>
              )}
            </label>

            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-emerald-500/30 h-32 bg-black/60 group">
                <img src={photoPreview} alt="Bukti Lapangan" className="w-full h-full object-cover" />
                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-white text-xs font-bold cursor-pointer transition-opacity">
                  <Camera size={16} />
                  <span>Ganti Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                </label>
              </div>
            ) : (
              <label className="p-3.5 rounded-xl border border-dashed border-white/20 hover:border-emerald-400/50 bg-slate-950/40 hover:bg-slate-900/60 flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200 cursor-pointer transition-all">
                <Upload size={18} className="text-emerald-400" />
                <span className="text-xs font-semibold">Unggah atau Ambil Foto Terbaru</span>
                <span className="text-[10px] text-slate-500">Kamera HP atau Galeri (Otomatis kompres)</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </label>
            )}
          </div>

          {/* Bottom Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSaving || isDeleting}
              className="py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Hapus titik laporan"
            >
              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              <span className="hidden sm:inline">Hapus Titik</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving || isDeleting}
                className="py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={isSaving || isUploadingPhoto || isDeleting}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_2px_12px_rgba(16,185,129,0.3)] cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Simpan & Update Realtime</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
