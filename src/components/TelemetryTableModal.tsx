// File: src/components/TelemetryTableModal.tsx

import React, { useState } from 'react';
import {
  X,
  Save,
  Radio,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Compass,
  RotateCcw
} from 'lucide-react';
import { playSuccessChime, playTapSound, triggerHaptic } from '../lib/soundFx';
import { BatikKawungPattern, BatikCorner } from './BatikDecorations';
import {
  type TelemetryConfig,
  type TelemetryDirectionInfo,
  DEFAULT_TELEMETRY,
  saveStoredTelemetry
} from '../lib/telemetryStorage';

interface TelemetryTableModalProps {
  currentConfig: TelemetryConfig;
  onClose: () => void;
  onSave: (updated: TelemetryConfig) => void;
}

export default function TelemetryTableModal({
  currentConfig,
  onClose,
  onSave
}: TelemetryTableModalProps) {
  const [config, setConfig] = useState<TelemetryConfig>(() => currentConfig);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleUpdateDirection = (index: number, field: keyof TelemetryDirectionInfo, val: any) => {
    setConfig((prev) => {
      const nextDirs = [...prev.directions];
      nextDirs[index] = { ...nextDirs[index], [field]: val };
      return { ...prev, directions: nextDirs };
    });
  };

  const handleResetDefault = () => {
    if (window.confirm('Reset tabel telemetri ke pengaturan standar?')) {
      setConfig(DEFAULT_TELEMETRY);
      playTapSound();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playTapSound();
    triggerHaptic(20);
    saveStoredTelemetry(config);
    onSave(config);
    setSaveSuccess(true);
    playSuccessChime();
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-gradient-to-br from-[#0c2016] via-[#07150f] to-[#040a07] border border-amber-500/25 rounded-3xl p-5 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain">
        {/* Batik Watermark Pattern */}
        <BatikKawungPattern opacity={0.12} className="text-emerald-400 pointer-events-none" />
        <BatikCorner className="absolute top-2.5 left-2.5 text-amber-400/50 pointer-events-none" />
        <BatikCorner className="absolute top-2.5 right-2.5 text-amber-400/50 rotate-90 pointer-events-none" />
        <BatikCorner className="absolute bottom-2.5 left-2.5 text-amber-400/50 -rotate-90 pointer-events-none" />
        <BatikCorner className="absolute bottom-2.5 right-2.5 text-amber-400/50 rotate-180 pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Radio size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Tabel Data Telemetri & Target ABJ</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono">
                  4 PENJURU
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Ubah parameter target dan status sanitasi wilayah secara realtime
              </p>
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

        {saveSuccess && (
          <div className="my-3 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>Tabel telemetri berhasil diperbarui dan disinkronkan secara realtime!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative z-10 space-y-5 pt-4">
          {/* Top Quick Metric Adjustments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950/70 border border-white/10">
            <div>
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 mb-1.5">
                <TrendingUp size={13} className="text-emerald-400" />
                <span>Angka Bebas Jentik (ABJ Target Wilayah %):</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="50"
                  max="100"
                  value={config.abjNasional}
                  onChange={(e) => setConfig({ ...config, abjNasional: parseFloat(e.target.value) || 0 })}
                  className="w-32 bg-slate-900 border border-white/10 focus:border-emerald-400 rounded-xl px-3 py-2 text-sm font-mono font-bold text-amber-300 outline-none"
                />
                <span className="text-xs text-slate-400">Target Kemenkes RI: &ge; 95%</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 mb-1.5">
                <Sparkles size={13} className="text-amber-400" />
                <span>Status Umum Sanitasi:</span>
              </label>
              <select
                value={config.overallStatus}
                onChange={(e) => setConfig({ ...config, overallStatus: e.target.value as any })}
                className="w-full bg-slate-900 border border-white/10 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none"
              >
                <option value="STATUS AMAN">STATUS AMAN (Bebas Bahaya)</option>
                <option value="STATUS WASPADA">STATUS WASPADA (Perlu Pemantauan)</option>
                <option value="STATUS SIAGA">STATUS SIAGA (Tindakan Cepat)</option>
              </select>
            </div>
          </div>

          {/* Table of 4 Directions */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Compass size={14} className="text-emerald-400" />
              <span>Data Penjuru Wilayah (Sedulur Papat Limo Pancer)</span>
            </h4>

            <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/80">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/[0.04] border-b border-white/10 text-[10px] uppercase font-mono text-slate-400">
                    <th className="py-2.5 px-3">Penjuru</th>
                    <th className="py-2.5 px-3">Kawasan</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">ABJ (%)</th>
                    <th className="py-2.5 px-3">Catatan Lingkungan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {config.directions.map((dir, idx) => (
                    <tr key={dir.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">
                        {dir.penjuru}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={dir.label}
                          onChange={(e) => handleUpdateDirection(idx, 'label', e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 focus:border-emerald-400 rounded-lg px-2 py-1 text-xs text-slate-200 outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <select
                          value={dir.status}
                          onChange={(e) => handleUpdateDirection(idx, 'status', e.target.value)}
                          className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none"
                        >
                          <option value="Bebas Jentik">Bebas Jentik</option>
                          <option value="Terkendali">Terkendali</option>
                          <option value="Waspada">Waspada</option>
                          <option value="Siaga">Siaga</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="0.1"
                          value={dir.abjScore}
                          onChange={(e) => handleUpdateDirection(idx, 'abjScore', parseFloat(e.target.value) || 0)}
                          className="w-16 bg-slate-900 border border-white/10 focus:border-emerald-400 rounded-lg px-2 py-1 text-xs font-mono text-amber-300 outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={dir.catatan}
                          onChange={(e) => handleUpdateDirection(idx, 'catatan', e.target.value)}
                          className="w-full min-w-[180px] bg-slate-900 border border-white/10 focus:border-emerald-400 rounded-lg px-2 py-1 text-xs text-slate-200 outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetDefault}
              className="py-2.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Reset Standar</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Tutup
              </button>

              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_2px_12px_rgba(16,185,129,0.3)] cursor-pointer active:scale-95"
              >
                <Save size={14} />
                <span>Simpan Perubahan Realtime</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
