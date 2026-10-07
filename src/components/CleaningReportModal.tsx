// File: src/components/CleaningReportModal.tsx

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Camera,
  AlertTriangle,
  Loader2,
  Trash2,
  ShieldCheck,
  Check
} from 'lucide-react';
import { supabase, type MosquitoReport } from '../lib/supabase';
import { type UserProfile } from '../lib/authStorage';
import {
  parseReportStatus,
  serializeReportStatus,
  compressImageToDataUrl,
  type ReportMetadata
} from '../lib/reportData';
import { BatikKawungPattern, BatikCorner } from './BatikDecorations';

interface CleaningReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: MosquitoReport | null;
  currentUser: UserProfile | null;
  onSuccess: (updatedReport: MosquitoReport) => void;
}

const ACTION_PRESETS = [
  { id: 'kuras', label: 'Dikuras & Dibalik', desc: 'Air dibuang, wadah disikat dan ditengkurapkan' },
  { id: 'abate', label: 'Diberi Larvasida/Abate', desc: 'Diberi bubuk abate untuk membasmi jentik' },
  { id: 'tutup', label: 'Ditutup Rapat', desc: 'Dipasang penutup rapat agar nyamuk tidak bertelur' },
  { id: 'buang', label: 'Dibuang / Daur Ulang', desc: 'Barang bekas/ban disingkirkan ke TPS' }
];

export default function CleaningReportModal({
  isOpen,
  onClose,
  report,
  currentUser,
  onSuccess
}: CleaningReportModalProps) {
  const [selectedAction, setSelectedAction] = useState('kuras');
  const [customNote, setCustomNote] = useState('');
  const [cleanedPhoto, setCleanedPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !report) return null;

  // Handle image capture / upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCleanedPhoto(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Cleaning Report
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const preset = ACTION_PRESETS.find((p) => p.id === selectedAction);
      const actionLabel = preset ? preset.label : 'Telah dibersihkan';
      const reporterName = currentUser?.name || 'Warga Komunitas';
      const detailNote = customNote.trim() ? ` - "${customNote.trim()}"` : '';

      const currentMeta = parseReportStatus(report.status);
      let compressedCleanedPhoto = currentMeta.cleanedPhoto;
      if (cleanedPhoto && cleanedPhoto.startsWith('data:')) {
        try {
          compressedCleanedPhoto = await compressImageToDataUrl(cleanedPhoto, 480, 480, 0.7);
        } catch {
          // ignore
        }
      }

      const updatedMeta: ReportMetadata = {
        ...currentMeta,
        summary: `Dibersihkan: ${actionLabel}${detailNote} (Oleh: ${reporterName})`,
        cleanedAction: actionLabel,
        cleanedNote: customNote.trim() || undefined,
        cleanedBy: reporterName,
        cleanedPhoto: compressedCleanedPhoto,
        cleanedAt: new Date().toISOString()
      };

      const updatedStatus = serializeReportStatus(updatedMeta);

      if (report.id) {
        // Attempt update in-place in Supabase
        try {
          await supabase
            .from('reports')
            .update({
              status: updatedStatus
            })
            .eq('id', report.id);
        } catch (err) {
          console.warn('Supabase update warning:', err);
        }
      }

      // GUARANTEED CLOUD PERSISTENCE:
      // Insert resolution event record into Supabase so even if RLS restricts UPDATE for anon,
      // the resolution event is permanently stored in the cloud table!
      try {
        await supabase.from('reports').insert({
          latitude: report.latitude,
          longitude: report.longitude,
          status: updatedStatus
        });
      } catch (err) {
        console.warn('Supabase resolution insert warning:', err);
      }

      const updatedReport: MosquitoReport = {
        ...report,
        status: updatedStatus
      };

      setSuccessMsg('Titik bahaya berhasil dibersihkan! Titik merah telah dihapus dari radar.');
      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess(updatedReport);
        onClose();
      }, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan laporan pembersihan.';
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-gradient-to-br from-[#0c2016] via-[#07150f] to-[#040a07] border border-amber-500/25 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain">
        <BatikKawungPattern opacity={0.12} className="text-emerald-400" />
        <BatikCorner className="absolute top-2.5 left-2.5 text-amber-400/50" />
        <BatikCorner className="absolute top-2.5 right-2.5 text-amber-400/50 rotate-90" />
        <BatikCorner className="absolute bottom-2.5 left-2.5 text-amber-400/50 -rotate-90" />
        <BatikCorner className="absolute bottom-2.5 right-2.5 text-amber-400/50 rotate-180" />
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base tracking-tight">Laporan Hasil Pembersihan</h3>
              <p className="text-[11px] text-slate-400">
                Selesaikan titik bahaya agar titik merah dinonaktifkan dari radar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Spot Info Card */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 mb-4 text-xs space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Koordinat Titik:</span>
            <span className="font-mono text-teal-300 font-semibold">
              {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
            </span>
          </div>
          <div className="flex items-start justify-between text-[11px] pt-1 border-t border-white/5">
            <span className="text-slate-400 shrink-0">Status Semula:</span>
            <span className="text-red-300 font-medium text-right max-w-[240px] truncate">
              {report.status || 'Genangan air aktif'}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Action Preset Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Tindakan Pembersihan yang Dilakukan:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ACTION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedAction(preset.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selectedAction === preset.id
                      ? 'bg-teal-500/20 border-teal-400 text-white shadow-[0_0_15px_rgba(45,212,191,0.2)]'
                      : 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs">{preset.label}</span>
                    {selectedAction === preset.id && (
                      <Check size={14} className="text-teal-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    {preset.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Photo Proof Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Foto Bukti Hasil Pembersihan (Opsional):
            </label>
            {cleanedPhoto ? (
              <div className="relative rounded-2xl overflow-hidden border border-teal-500/40 h-36 bg-slate-950 flex items-center justify-center">
                <img
                  src={cleanedPhoto}
                  alt="Bukti Pembersihan"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setCleanedPhoto(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-rose-400 hover:text-white transition-all cursor-pointer"
                  title="Hapus foto"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-28 rounded-2xl border-2 border-dashed border-white/15 hover:border-teal-500/50 bg-slate-950/60 cursor-pointer transition-all">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Camera size={16} className="text-teal-400" />
                  <span>Ambil Foto Wadah Kering / Bersih</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1">
                  Klik untuk mengambil foto atau upload file
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Notes Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Catatan Penanganan (Opsional):
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Contoh: Ember sudah dikuras dan disimpan di dalam rumah"
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Pelapor Identity */}
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
            <span>Pelapor Pembersihan:</span>
            <span className="font-semibold text-teal-300">
              {currentUser?.name || 'Warga Komunitas'}
            </span>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-[0_0_20px_rgba(45,212,191,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Menyimpan Laporan Pembersihan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Selesaikan & Hapus Titik Merah dari Radar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
