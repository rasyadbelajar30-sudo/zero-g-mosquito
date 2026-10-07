import React from 'react';

/**
 * Batik Kawung Vector Pattern & Ornaments
 * Inspired by traditional Indonesian Batik Kawung (representing wisdom, purity, and 4-corner community protection)
 * blended with modern cybernetic aesthetics (emerald & warm gold accents).
 */

export const BatikKawungPattern: React.FC<{ className?: string; opacity?: number }> = ({
  className = '',
  opacity = 0.08
}) => {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 w-full h-full ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity }}
    >
      <defs>
        <pattern id="batik-kawung-pattern" width="64" height="64" patternUnits="userSpaceOnUse">
          {/* Central Kawung 4-Petal Rosette */}
          <g fill="none" stroke="currentColor" strokeWidth="0.8">
            {/* Top Petal */}
            <ellipse cx="32" cy="16" rx="9" ry="14" />
            {/* Bottom Petal */}
            <ellipse cx="32" cy="48" rx="9" ry="14" />
            {/* Left Petal */}
            <ellipse cx="16" cy="32" rx="14" ry="9" />
            {/* Right Petal */}
            <ellipse cx="48" cy="32" rx="14" ry="9" />

            {/* Inner Isen-Isen (Traditional Dot Texture) */}
            <circle cx="32" cy="32" r="2.5" fill="currentColor" fillOpacity="0.4" />
            <circle cx="32" cy="16" r="1.2" fill="currentColor" fillOpacity="0.5" />
            <circle cx="32" cy="48" r="1.2" fill="currentColor" fillOpacity="0.5" />
            <circle cx="16" cy="32" r="1.2" fill="currentColor" fillOpacity="0.5" />
            <circle cx="48" cy="32" r="1.2" fill="currentColor" fillOpacity="0.5" />

            {/* Corner Intersecting Petals */}
            <ellipse cx="0" cy="16" rx="9" ry="14" />
            <ellipse cx="64" cy="16" rx="9" ry="14" />
            <ellipse cx="0" cy="48" rx="9" ry="14" />
            <ellipse cx="64" cy="48" rx="9" ry="14" />
            <ellipse cx="16" cy="0" rx="14" ry="9" />
            <ellipse cx="48" cy="0" rx="14" ry="9" />
            <ellipse cx="16" cy="64" rx="14" ry="9" />
            <ellipse cx="48" cy="64" rx="14" ry="9" />

            {/* Corner Dots */}
            <circle cx="0" cy="0" r="2" fill="currentColor" fillOpacity="0.4" />
            <circle cx="64" cy="0" r="2" fill="currentColor" fillOpacity="0.4" />
            <circle cx="0" cy="64" r="2" fill="currentColor" fillOpacity="0.4" />
            <circle cx="64" cy="64" r="2" fill="currentColor" fillOpacity="0.4" />

            {/* Diagonal linking accents */}
            <path d="M 16 16 L 48 48 M 48 16 L 16 48" strokeWidth="0.4" strokeDasharray="1 3" strokeOpacity="0.3" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#batik-kawung-pattern)" />
    </svg>
  );
};

/**
 * Intricate Traditional Batik Mandala Insignia
 * Geometric 8-axis star & kawung petals with glowing core
 */
export const BatikMandala: React.FC<{ size?: number; className?: string }> = ({
  size = 120,
  className = ''
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`shrink-0 ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer concentric rings */}
      <circle cx="50" cy="50" r="47" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.3" strokeDasharray="3 2" />
      <circle cx="50" cy="50" r="43" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" />
      <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.25" />

      {/* 8 Cardinal & Ordinal Petals (Sedulur Papat Limo Pancer) */}
      <g stroke="currentColor" strokeWidth="1" strokeOpacity="0.8">
        {/* N / S / E / W Petals */}
        <ellipse cx="50" cy="27" rx="7" ry="15" />
        <ellipse cx="50" cy="73" rx="7" ry="15" />
        <ellipse cx="27" cy="50" rx="15" ry="7" />
        <ellipse cx="73" cy="50" rx="15" ry="7" />

        {/* Diagonal Petals */}
        <g transform="rotate(45 50 50)">
          <ellipse cx="50" cy="29" rx="5.5" ry="13" strokeOpacity="0.6" strokeWidth="0.75" />
          <ellipse cx="50" cy="71" rx="5.5" ry="13" strokeOpacity="0.6" strokeWidth="0.75" />
          <ellipse cx="29" cy="50" rx="13" ry="5.5" strokeOpacity="0.6" strokeWidth="0.75" />
          <ellipse cx="71" cy="50" rx="13" ry="5.5" strokeOpacity="0.6" strokeWidth="0.75" />
        </g>
      </g>

      {/* Center Core Rosette */}
      <circle cx="50" cy="50" r="12" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="50" cy="50" r="6" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="50" cy="50" r="2" fill="currentColor" />

      {/* Isen-isen Dots */}
      <circle cx="50" cy="27" r="1.5" fill="currentColor" />
      <circle cx="50" cy="73" r="1.5" fill="currentColor" />
      <circle cx="27" cy="50" r="1.5" fill="currentColor" />
      <circle cx="73" cy="50" r="1.5" fill="currentColor" />
    </svg>
  );
};

/**
 * Traditional Javanese Hairline Corner Motif
 */
export const BatikCorner: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none ${className}`}
    >
      <path
        d="M 2 14 L 2 4 C 2 2.9 2.9 2 4 2 L 14 2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="5" cy="5" r="1.5" fill="currentColor" />
      <circle cx="10" cy="5" r="1" fill="currentColor" fillOpacity="0.6" />
      <circle cx="5" cy="10" r="1" fill="currentColor" fillOpacity="0.6" />
    </svg>
  );
};

/**
 * Traditional Batik Divider Accent
 */
export const BatikDivider: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center justify-center gap-3 py-1 ${className}`}>
      <div className="h-[1px] w-12 sm:w-24 bg-gradient-to-r from-transparent via-amber-400/40 to-emerald-400/50" />
      <div className="flex items-center gap-1.5 text-amber-400/80">
        <span className="text-[10px]">❖</span>
        <span className="text-xs text-emerald-400 font-bold">◇</span>
        <span className="text-[10px]">❖</span>
      </div>
      <div className="h-[1px] w-12 sm:w-24 bg-gradient-to-l from-transparent via-amber-400/40 to-emerald-400/50" />
    </div>
  );
};

/**
 * MosquitoLoadingScanner
 * High-tech Animated Mosquito & AI Radar Scan Loading Animation
 * Replaces generic spinners during photo/video analysis
 */
export const MosquitoLoadingScanner: React.FC<{
  stepText?: string;
  isRecording?: boolean;
  countdownSeconds?: number;
}> = ({
  stepText,
  isRecording,
  countdownSeconds
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center p-6 text-center select-none">
      {/* Radar Scan Reticle Container */}
      <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center">
        {/* Subtle Background Batik Kawung in radar */}
        <BatikKawungPattern opacity={0.15} className="text-emerald-400 rounded-full overflow-hidden" />

        {/* Concentric Radar Rings */}
        <div className="absolute inset-0 rounded-full border border-teal-500/20" />
        <div className="absolute inset-4 rounded-full border border-teal-500/30 border-dashed animate-spin-slow" />
        <div className="absolute inset-10 rounded-full border border-emerald-400/40" />
        <div className="absolute inset-16 rounded-full border border-teal-400/50" />

        {/* Radar Rotating Sweep Beam */}
        <div className="absolute inset-0 rounded-full pointer-events-none overflow-hidden">
          <div className="w-full h-full rounded-full animate-radar-sweep bg-[conic-gradient(from_0deg,rgba(45,212,191,0.35)_0deg,rgba(16,185,129,0)_70deg,transparent_360deg)]" />
        </div>

        {/* Animated Mosquito Vector at the Center */}
        <div className="relative z-10 flex items-center justify-center">
          <div className="animate-mosquito">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              className="text-emerald-300 drop-shadow-[0_0_16px_rgba(52,211,153,0.9)]"
            >
              {/* Mosquito Abdomen & Thorax */}
              <ellipse cx="12" cy="12" rx="1.6" ry="5" fill="#34d399" transform="rotate(-30 12 12)" />
              {/* Head */}
              <circle cx="9.2" cy="8" r="1.8" fill="#a7f3d0" />
              {/* Proboscis */}
              <line x1="8" y1="7" x2="3.5" y2="2.5" stroke="#6ee7b7" strokeWidth="1.4" strokeLinecap="round" />
              {/* Fluttering Wings */}
              <ellipse
                cx="14.5"
                cy="8.5"
                rx="6.5"
                ry="2.5"
                fill="#6ee7b7"
                fillOpacity="0.75"
                className="animate-wing-left"
                transform="rotate(25 14.5 8.5)"
              />
              <ellipse
                cx="9.5"
                cy="15.5"
                rx="6.5"
                ry="2.5"
                fill="#6ee7b7"
                fillOpacity="0.75"
                className="animate-wing-right"
                transform="rotate(-45 9.5 15.5)"
              />
              {/* Six articulated legs */}
              <path
                d="M10 10L5 12M12 12L9 17M14 14L16 20 M11 9L8 6 M13 11L18 8 M14 13L20 15"
                stroke="#34d399"
                strokeWidth="0.9"
                strokeLinecap="round"
                strokeOpacity="0.8"
              />
            </svg>
          </div>
        </div>

        {/* Scanning Target Crosshairs */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
          <div className="h-full w-[1px] absolute bg-gradient-to-b from-transparent via-emerald-400/40 to-transparent" />
        </div>

        {/* Scanning Laser Vertical Bounce */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399] animate-[bounce_2s_infinite]" />
        </div>
      </div>

      {/* Loading Steps & Telemetry Pill */}
      <div className="mt-4 space-y-1.5 max-w-xs">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-lg backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="tracking-wide">
            {stepText || (isRecording ? `Merekam Jentik... ${countdownSeconds ?? 0}s` : 'Analisis AI Vektor & Motilitas...')}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 font-mono">
          Model Dual-Vision • Verifikasi Siklus Hidup Jentik
        </p>
      </div>
    </div>
  );
};

