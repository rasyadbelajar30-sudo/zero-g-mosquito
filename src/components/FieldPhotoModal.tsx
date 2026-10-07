// File: src/components/FieldPhotoModal.tsx

import React, { useState } from 'react';
import {
  X,
  Camera,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Trash2,
  Compass,
  AlertTriangle,
  Upload,
  Navigation,
  Crosshair
} from 'lucide-react';
import { supabase, type MosquitoReport } from '../lib/supabase';
import { type UserProfile } from '../lib/authStorage';
import {
  parseReportStatus,
  serializeReportStatus,
  compressImageToDataUrl
} from '../lib/reportData';
import { BatikKawungPattern, BatikCorner } from './BatikDecorations';

interface FieldPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: MosquitoReport | null;
  currentUser: UserProfile | null;
  onSuccess: (updatedReport: MosquitoReport) => void;
}

function FieldPhotoModalContent({
  onClose,
  report,
  currentUser,
  onSuccess
}: {
  onClose: () => void;
  report: MosquitoReport;
  currentUser: UserProfile | null;
  onSuccess: (updatedReport: MosquitoReport) => void;
}) {
  const meta = parseReportStatus(report.status);
  const [photoPreview, setPhotoPreview] = useState<string | null>(meta.fieldPhoto || null);
  const [landmarkText, setLandmarkText] = useState(meta.landmark || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCoord, setCopiedCoord] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const latStr = report.latitude.toFixed(6);
  const lngStr = report.longitude.toFixed(6);
  const coordString = `${latStr}, ${lngStr}`;

  // Copy coordinates to clipboard
  const handleCopyCoordinates = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(coordString).catch(() => {});
    }
    setCopiedCoord(true);
    setTimeout(() => setCopiedCoord(false), 2000);
  };

  // Handle Photo selection from camera or file
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const compressed = await compressImageToDataUrl(file, 480, 480, 0.7);
      setPhotoPreview(compressed);
      setIsSubmitting(false);
    } catch {
      setErrorMsg('Gagal memproses foto. Silakan coba lagi.');
      setIsSubmitting(false);
    }
  };

  // Submit and update Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const currentMeta = parseReportStatus(report.status);
      const updatedMeta = {
        ...currentMeta,
        fieldPhoto: photoPreview || undefined,
        landmark: landmarkText.trim() || undefined,
        reportedBy: currentUser?.name || currentMeta.reportedBy || 'Warga Komunitas'
      };

      const updatedStatusString = serializeReportStatus(updatedMeta);

      if (report.id) {
        const { error } = await supabase
          .from('reports')
          .update({
            status: updatedStatusString
          })
          .eq('id', report.id);

        if (error) {
          console.warn('Supabase update error:', error);
        }
      }

      const updatedReport: MosquitoReport = {
        ...report,
        status: updatedStatusString
      };

      setSuccessMsg('Foto kondisi lapangan dan data patokan berhasil diperbarui!');
      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess(updatedReport);
        onClose();
      }, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan foto kondisi lapangan.';
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
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Foto & Patokan Lapangan</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono">
                  Ground Truth
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Data visual nyata untuk mempermudah pelacakan tim warga di lapangan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* GPS Coordinates & Google Maps Direct Trace */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Crosshair size={13} className="text-teal-400" />
              Titik Koordinat Asli GPS:
            </span>
            {meta.accuracyMeters && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                ±{meta.accuracyMeters}m (Presisi Tinggi)
              </span>
            )}
          </div>

          <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-white/5">
            <span className="font-mono text-xs text-teal-300 font-bold tracking-wider">
              {coordString}
            </span>
            <button
              type="button"
              onClick={handleCopyCoordinates}
              className="text-[11px] flex items-center gap-1 text-slate-300 hover:text-teal-300 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg transition-all cursor-pointer border border-white/5"
            >
              {copiedCoord ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Salin</span>
                </>
              )}
            </button>
          </div>

          {/* Direct Google Maps Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() =>
                window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${report.latitude},${report.longitude}`,
                  '_blank'
                )
              }
              className="py-2 px-2.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Navigation size={13} />
              <span>Rute Google Maps</span>
              <ExternalLink size={10} className="opacity-60" />
            </button>

            <button
              type="button"
              onClick={() =>
                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`,
                  '_blank'
                )
              }
              className="py-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <MapPin size={13} />
              <span>Cari Lokasi</span>
              <ExternalLink size={10} className="opacity-60" />
            </button>
          </div>
        </div>

        {/* Photo Upload & Preview Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Camera size={14} className="text-teal-400" />
              <span>Foto Kondisi Nyata di Lapangan</span>
            </label>

            {photoPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-teal-500/40 bg-black/40 group max-h-56 flex items-center justify-center">
                <img
                  src={photoPreview}
                  alt="Kondisi Lapangan"
                  className="w-full h-52 object-cover"
                />
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <label className="cursor-pointer bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-lg">
                    <Upload size={14} />
                    <span>Ganti Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setPhotoPreview(null)}
                    className="bg-red-500 hover:bg-red-400 text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-lg cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-white/20 hover:border-teal-400/50 rounded-2xl p-5 text-center transition-all bg-white/[0.02]">
                <div className="w-12 h-12 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto mb-2">
                  <Camera size={24} />
                </div>
                <p className="text-xs text-slate-200 font-semibold mb-1">
                  Ambil Foto Kondisi Lapangan
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto mb-3">
                  Potret wadah genangan, lingkungan sekitar, atau tanda bahaya agar warga mudah mengenali lokasi.
                </p>

                <div className="flex items-center justify-center gap-2">
                  <label className="cursor-pointer bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95">
                    <Camera size={14} />
                    <span>Buka Kamera</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>

                  <label className="cursor-pointer bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 border border-white/10 transition-all active:scale-95">
                    <Upload size={14} />
                    <span>Pilih Galeri</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Physical Landmark / Patokan Lingkungan */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Compass size={14} className="text-teal-400" />
              <span>Patokan Fisik di Lokasi (Landmark):</span>
            </label>
            <input
              type="text"
              value={landmarkText}
              onChange={(e) => setLandmarkText(e.target.value)}
              placeholder="Contoh: Gang samping rumah cat hijau no. 12, drum di bawah pohon mangga"
              className="w-full bg-slate-950/70 border border-white/10 focus:border-teal-400/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition-all"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Catatan patokan sangat membantu jika jalan/gang tidak terjangkau mobil Google Street View.
            </p>
          </div>

          {/* Error & Success Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <Check size={15} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-2 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Camera size={16} />
                  <span>Simpan Data Lapangan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FieldPhotoModal({
  isOpen,
  onClose,
  report,
  currentUser,
  onSuccess
}: FieldPhotoModalProps) {
  if (!isOpen || !report) return null;
  const key = report.id || `${report.latitude}-${report.longitude}`;
  return (
    <FieldPhotoModalContent
      key={key}
      onClose={onClose}
      report={report}
      currentUser={currentUser}
      onSuccess={onSuccess}
    />
  );
}
