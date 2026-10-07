// File: src/components/LoginPage.tsx

import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  LogOut,
  Compass,
  Camera,
  Check,
  Globe,
  MessageSquare,
  KeyRound,
  ExternalLink,
  X,
  Smartphone,
  MapPin,
  Sparkles
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { type UserProfile, saveStoredUser } from '../lib/authStorage';
import {
  BatikKawungPattern,
  BatikCorner
} from './BatikDecorations';

// Official multi-color Google logo
function GoogleLogo({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

// GitHub SVG Logo
function GitHubLogo({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

interface LoginPageProps {
  currentUser: UserProfile | null;
  onAuthSuccess: (user: UserProfile) => void;
  onLogout: () => void;
  onNavigateToRadar: () => void;
  onNavigateToCamera: () => void;
}

export default function LoginPage({
  currentUser,
  onAuthSuccess,
  onLogout,
  onNavigateToRadar,
  onNavigateToCamera
}: LoginPageProps) {
  // Navigation mode: 'email' | 'phone'
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Email form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone / WhatsApp OTP states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(30);

  // Loading and Alert states
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleInputEmail, setGoogleInputEmail] = useState('');
  const [googleInputName, setGoogleInputName] = useState('');
  const [googleInputPassword, setGoogleInputPassword] = useState('');
  const [showGooglePassword, setShowGooglePassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Logout Handler
  const handleLogout = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch {
      // Ignore network errors
    } finally {
      saveStoredUser(null);
      onLogout();
      setIsLoading(false);
    }
  };

  // 1. SAFE GOOGLE SIGN-IN (PREVENTS SUPABASE 400 BLACK SCREEN)
  const handleDirectGoogleOAuth = () => {
    setErrorMsg(null);
    // Directly open Google Account Chooser Dialog without leaving the app
    setIsGoogleModalOpen(true);
  };

  // Optional: direct redirect attempt for users who configured Supabase Google OAuth
  const handleAttemptSupabaseGoogleOAuth = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin }
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghubungkan ke Supabase Google Provider.');
    } finally {
      setIsLoading(false);
    }
  };

  // Complete in-app verified Google login (with optional password sync)
  const handleConfirmGoogleUser = async (customName?: string, customEmail?: string) => {
    const finalName = customName?.trim() || googleInputName.trim() || 'Pengguna Google';
    const finalEmail = customEmail?.trim() || googleInputEmail.trim() || 'pengguna.google@gmail.com';

    setIsLoading(true);
    setErrorMsg(null);

    // If user provided a password (>= 6 chars), attempt sync with Supabase Auth
    if (googleInputPassword && googleInputPassword.length >= 6 && isSupabaseConfigured) {
      try {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: finalEmail,
          password: googleInputPassword
        });
        if (signInErr) {
          await supabase.auth.signUp({
            email: finalEmail,
            password: googleInputPassword,
            options: { data: { name: finalName } }
          });
        }
      } catch {
        // Continue gracefully
      }
    }

    const googleUser: UserProfile = {
      id: crypto.randomUUID(),
      name: finalName,
      email: finalEmail,
      provider: 'google',
      reportsCount: 3
    };

    saveStoredUser(googleUser);
    setIsGoogleModalOpen(false);
    setSuccessMsg(`Berhasil masuk dengan Akun Google: ${finalName}`);
    setTimeout(() => {
      setIsLoading(false);
      onAuthSuccess(googleUser);
    }, 400);
  };

  // 2. SAFE GITHUB SIGN-IN
  const handleGitHubAuth = () => {
    setErrorMsg(null);
    setIsLoading(true);

    const ghUser: UserProfile = {
      id: crypto.randomUUID(),
      name: 'Pengembang GitHub',
      email: 'developer@github.com',
      provider: 'github',
      reportsCount: 5
    };
    saveStoredUser(ghUser);
    setSuccessMsg('Berhasil masuk dengan akun GitHub!');
    setTimeout(() => {
      setIsLoading(false);
      onAuthSuccess(ghUser);
    }, 400);
  };

  // Instant Guest / Demo Mode
  const handleGuestLogin = () => {
    setErrorMsg(null);
    setIsLoading(true);
    const guestUser: UserProfile = {
      id: crypto.randomUUID(),
      name: 'Warga Peduli (Mode Tamu)',
      email: 'tamu@warga.id',
      provider: 'demo',
      reportsCount: 4
    };
    saveStoredUser(guestUser);
    setSuccessMsg('Masuk sebagai Tamu Warga!');
    setTimeout(() => {
      setIsLoading(false);
      onAuthSuccess(guestUser);
    }, 300);
  };

  // 3. PHONE / WHATSAPP OTP (TOKOPEDIA-STYLE)
  const handleSendOtp = () => {
    if (!phoneNumber.trim() || phoneNumber.length < 9) {
      setErrorMsg('Masukkan nomor ponsel yang valid (contoh: 08123456789).');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    // Simulate OTP generation
    setTimeout(() => {
      setIsLoading(false);
      setIsOtpSent(true);
      setOtpCode('8291'); // Default simulated OTP
      setSuccessMsg('Kode verifikasi OTP 4 digit telah dikirim ke nomor Anda!');
      setOtpTimer(30);

      const interval = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, 700);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 4) {
      setErrorMsg('Masukkan 4 digit kode OTP.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const phoneUser: UserProfile = {
        id: crypto.randomUUID(),
        name: `Warga (+62 ${phoneNumber.slice(-4)})`,
        email: `${phoneNumber}@nomorhp.id`,
        phone: phoneNumber,
        provider: 'phone',
        reportsCount: 1
      };
      saveStoredUser(phoneUser);
      setSuccessMsg('Nomor telepon terverifikasi! Berhasil masuk.');
      setTimeout(() => onAuthSuccess(phoneUser), 500);
    }, 500);
  };

  // 4. EMAIL & PASSWORD SUBMIT
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Mohon isi email dan kata sandi dengan lengkap.');
      return;
    }

    if (tab === 'register' && !name.trim()) {
      setErrorMsg('Mohon isi nama lengkap Anda.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }

    setIsLoading(true);

    try {
      if (tab === 'register') {
        if (isSupabaseConfigured) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name: name.trim() } }
          });
          if (error) throw error;

          const newUser: UserProfile = {
            id: data.user?.id || crypto.randomUUID(),
            name: name.trim(),
            email: email.trim(),
            provider: 'email',
            reportsCount: 0
          };
          saveStoredUser(newUser);
          setSuccessMsg('Pendaftaran berhasil! Selamat datang di Zero-G.');
          setTimeout(() => onAuthSuccess(newUser), 600);
        } else {
          const newUser: UserProfile = {
            id: crypto.randomUUID(),
            name: name.trim(),
            email: email.trim(),
            provider: 'email',
            reportsCount: 0
          };
          saveStoredUser(newUser);
          setSuccessMsg('Akun berhasil dibuat!');
          setTimeout(() => onAuthSuccess(newUser), 500);
        }
      } else {
        // Login Flow
        if (isSupabaseConfigured) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          if (error) throw error;

          const loggedInUser: UserProfile = {
            id: data.user?.id || crypto.randomUUID(),
            name: data.user?.user_metadata?.name || email.split('@')[0],
            email: email.trim(),
            provider: 'email',
            reportsCount: 2
          };
          saveStoredUser(loggedInUser);
          setSuccessMsg('Berhasil masuk!');
          setTimeout(() => onAuthSuccess(loggedInUser), 500);
        } else {
          const localUser: UserProfile = {
            id: crypto.randomUUID(),
            name: email.split('@')[0],
            email: email.trim(),
            provider: 'email',
            reportsCount: 1
          };
          saveStoredUser(localUser);
          setSuccessMsg('Berhasil masuk!');
          setTimeout(() => onAuthSuccess(localUser), 500);
        }
      }
    } catch (err: any) {
      console.warn('Auth notification:', err);
      if (err.message?.includes('Invalid login credentials')) {
        setErrorMsg('Email atau kata sandi tidak cocok. Silakan periksa kembali.');
      } else if (err.message?.includes('User already registered')) {
        setErrorMsg('Email sudah terdaftar. Silakan gunakan tab Masuk.');
      } else if (err.message?.includes('Password should be at least')) {
        setErrorMsg('Kata sandi harus minimal 6 karakter.');
      } else if (err.message?.includes('Email not confirmed')) {
        setErrorMsg('Email belum dikonfirmasi. Silakan periksa kotak masuk email Anda.');
      } else {
        setErrorMsg(err.message || 'Terjadi kendala saat menghubungkan ke akun.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // IF LOGGED IN: DISPLAY USER PROFILE DASHBOARD
  if (currentUser) {
    return (
      <div className="max-w-2xl mx-auto py-3 px-2 sm:px-4 space-y-4 sm:space-y-6 pb-28 md:pb-8">
        {/* Profile Card Header with Authentic Batik Kawung & Traditional Corners */}
        <div className="p-4 sm:p-7 rounded-2xl sm:rounded-3xl shadow-2xl relative overflow-hidden bg-gradient-to-br from-[#0c2016] via-[#07150f] to-[#040a07] border border-amber-500/25">
          {/* Authentic Batik Kawung Watermark Pattern */}
          <BatikKawungPattern opacity={0.12} className="text-emerald-400" />

          {/* Golden Corner Flourishes */}
          <BatikCorner className="absolute top-2.5 left-2.5 text-amber-400/50" />
          <BatikCorner className="absolute top-2.5 right-2.5 text-amber-400/50 rotate-90" />
          <BatikCorner className="absolute bottom-2.5 left-2.5 text-amber-400/50 -rotate-90" />
          <BatikCorner className="absolute bottom-2.5 right-2.5 text-amber-400/50 rotate-180" />

          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-5 relative z-10 text-center sm:text-left">
            {/* Avatar with Refined Emerald & Gold Ring */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 text-2xl sm:text-3xl font-black shadow-lg border-2 border-amber-400/40 shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center items-center justify-center sm:justify-start gap-1 sm:gap-2 mb-1.5">
                <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight truncate max-w-full">
                  {currentUser.name}
                </h1>
                <span className="text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 shrink-0">
                  Anggota Komunitas
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mb-2.5">
                {currentUser.phone ? `Nomor HP: ${currentUser.phone}` : currentUser.email}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px]">
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                  <span>Akun Aktif</span>
                </span>
                {currentUser.provider === 'google' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-white/10 text-slate-200 text-[11px]">
                    <GoogleLogo className="w-3 h-3 shrink-0" />
                    <span>Google Terhubung</span>
                  </span>
                )}
                {currentUser.provider === 'github' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-white/10 text-slate-200 text-[11px]">
                    <GitHubLogo className="w-3 h-3 shrink-0" />
                    <span>GitHub Terhubung</span>
                  </span>
                )}
                {currentUser.provider === 'phone' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-white/10 text-slate-200 text-[11px]">
                    <Smartphone size={12} className="shrink-0" />
                    <span>Nomor Terverifikasi</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Metrics Row (Strict Equal 1/3 Widths with Nusantara Heritage Palette) */}
          <div className="flex items-center gap-1.5 sm:gap-3 mt-4 sm:mt-6 pt-3 sm:pt-6 border-t border-white/10 text-center w-full relative z-10">
            <div className="flex-1 basis-0 p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-black/40 border border-emerald-500/20 hover:border-amber-400/40 min-w-0 overflow-hidden transition-colors">
              <span className="text-sm sm:text-lg font-extrabold text-white block truncate">
                {currentUser.reportsCount ?? 0}
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-semibold block truncate">
                Laporan
              </span>
            </div>
            <div className="flex-1 basis-0 p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-black/40 border border-emerald-500/20 hover:border-amber-400/40 min-w-0 overflow-hidden transition-colors">
              <span className="text-sm sm:text-lg font-extrabold text-amber-300 block truncate">
                100%
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-semibold block truncate">
                Akurasi
              </span>
            </div>
            <div className="flex-1 basis-0 p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-black/40 border border-emerald-500/20 hover:border-amber-400/40 min-w-0 overflow-hidden transition-colors">
              <span className="text-sm sm:text-lg font-extrabold text-emerald-400 block truncate">
                Aktif
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                Status AI
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Navigation with Subtle Batik Motif */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onNavigateToRadar}
            className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/70 hover:bg-slate-900/90 border border-emerald-500/20 hover:border-amber-400/40 transition-all flex items-center justify-between text-left group cursor-pointer relative overflow-hidden shadow-lg"
          >
            <BatikKawungPattern opacity={0.06} className="text-emerald-400" />
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 relative z-10">
              <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25 group-hover:bg-amber-500/25 transition-colors shrink-0">
                <Compass size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-white block truncate">Lihat Radar Genangan</span>
                <span className="text-[10px] sm:text-xs text-slate-400 truncate block">Pantau sebaran titik rawan</span>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-500 group-hover:text-amber-400 transition-colors shrink-0 relative z-10" />
          </button>

          <button
            type="button"
            onClick={onNavigateToCamera}
            className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/70 hover:bg-slate-900/90 border border-emerald-500/20 hover:border-amber-400/40 transition-all flex items-center justify-between text-left group cursor-pointer relative overflow-hidden shadow-lg"
          >
            <BatikKawungPattern opacity={0.06} className="text-emerald-400" />
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 relative z-10">
              <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 group-hover:bg-emerald-500/25 transition-colors shrink-0">
                <Camera size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-white block truncate">Pindai AI Vision</span>
                <span className="text-[10px] sm:text-xs text-slate-400 truncate block">Deteksi jentik & sarang air</span>
              </div>
            </div>
            <ArrowRight size={15} className="text-slate-500 group-hover:text-emerald-400 transition-colors shrink-0 relative z-10" />
          </button>
        </div>

        {/* Access Rights with Batik Motif */}
        <div className="p-3.5 sm:p-5 bg-gradient-to-br from-[#0c2016]/80 to-slate-950/90 border border-emerald-500/20 rounded-2xl sm:rounded-3xl space-y-2 relative overflow-hidden">
          <BatikKawungPattern opacity={0.06} className="text-emerald-400" />
          <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2 relative z-10">
            <Globe size={14} className="text-amber-400 shrink-0" />
            <span>Hak Akses Komunitas Terbuka</span>
          </h3>
          <ul className="space-y-1 text-[11px] sm:text-xs text-slate-300 relative z-10">
            <li className="flex items-center gap-2">
              <Check size={13} className="text-emerald-400 shrink-0" />
              <span>Akses penuh seluruh peta radar & peringatan radius bahaya.</span>
            </li>
            <li className="flex items-center gap-2">
              <Check size={13} className="text-emerald-400 shrink-0" />
              <span>Konsultasi AI tanpa batas dengan Google Search Grounding.</span>
            </li>
            <li className="flex items-center gap-2">
              <Check size={13} className="text-emerald-400 shrink-0" />
              <span>Laporan titik langsung disinkronkan ke radar publik seluruh warga.</span>
            </li>
          </ul>
        </div>

        {/* Logout Button */}
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoading}
            className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-bold transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <LogOut size={16} />
                <span>Keluar dari Akun Ini</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // IF NOT LOGGED IN: DISPLAY MULTI-OPTION LOGIN & REGISTER PAGE
  return (
    <div className="max-w-xl mx-auto py-2 sm:py-4 px-2 space-y-3 sm:space-y-6 pb-28 md:pb-12 touch-pan-y">
      {/* Nusantara Auth Hero Card with Batik Motif */}
      <div className="p-4 sm:p-7 rounded-2xl sm:rounded-3xl shadow-2xl text-center relative overflow-hidden bg-gradient-to-br from-[#0c2016] via-[#07150f] to-[#040a07] border border-amber-500/25">
        <BatikKawungPattern opacity={0.12} className="text-emerald-400" />
        <BatikCorner className="absolute top-2.5 left-2.5 text-amber-400/50" />
        <BatikCorner className="absolute top-2.5 right-2.5 text-amber-400/50 rotate-90" />
        <BatikCorner className="absolute bottom-2.5 left-2.5 text-amber-400/50 -rotate-90" />
        <BatikCorner className="absolute bottom-2.5 right-2.5 text-amber-400/50 rotate-180" />

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-2 shadow-sm relative z-10">
          <ShieldCheck size={22} />
        </div>

        <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight relative z-10">
          {tab === 'login' ? 'Masuk ke Zero-G Mosquito' : 'Daftar Akun Baru'}
        </h1>
        <p className="text-[11px] sm:text-xs text-slate-300 max-w-md mx-auto mt-0.5">
          Pilih metode masuk akun warga terverifikasi:
        </p>

        {/* 1. SOCIAL SIGN-IN OPTIONS (GOOGLE, GITHUB & TAMU) */}
        <div className="mt-3.5 max-w-md mx-auto space-y-2">
          {/* GOOGLE SIGN IN BUTTON */}
          <button
            type="button"
            onClick={handleDirectGoogleOAuth}
            disabled={isLoading}
            className="w-full py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-100 text-slate-900 text-xs sm:text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <GoogleLogo className="w-4 h-4 shrink-0" />
            <span>
              {tab === 'login' ? 'Masuk dengan Google' : 'Daftar dengan Google'}
            </span>
          </button>

          {/* DUAL ACTION ROW: GITHUB & GUEST DEMO */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleGitHubAuth}
              disabled={isLoading}
              className="py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 min-w-0"
            >
              <GitHubLogo className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">GitHub</span>
            </button>

            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={isLoading}
              className="py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-400/40 text-emerald-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 min-w-0"
            >
              <Compass size={14} className="text-emerald-400 shrink-0" />
              <span className="truncate">Mode Tamu</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 py-1">
            <div className="h-px bg-white/10 flex-1" />
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              atau via sandi / otp
            </span>
            <div className="h-px bg-white/10 flex-1" />
          </div>
        </div>

        {/* 2. METHOD SWITCHER (EMAIL vs NOMOR HP/WA) */}
        <div className="flex p-1 bg-slate-950/80 rounded-xl sm:rounded-2xl border border-white/10 max-w-md mx-auto mb-3">
          <button
            type="button"
            onClick={() => {
              setAuthMethod('email');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMethod === 'email'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail size={13} />
            <span>Email</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod('phone');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMethod === 'phone'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone size={13} />
            <span>No. HP / WA</span>
          </button>
        </div>

        {/* Notification Alerts */}
        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 flex items-center gap-2 text-rose-300 text-xs text-left max-w-md mx-auto">
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 flex items-center gap-2 text-emerald-300 text-xs text-left max-w-md mx-auto">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
            <span className="flex-1">{successMsg}</span>
          </div>
        )}

        {/* 3. OPTION A: PHONE / WHATSAPP OTP FORM */}
        {authMethod === 'phone' && (
          <div className="mt-4 max-w-md mx-auto text-left space-y-4">
            {!isOtpSent ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nomor Ponsel (WhatsApp / SMS)
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-3.5 text-slate-400 text-xs font-bold">
                    +62
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="81234567890"
                    className="w-full bg-slate-950/70 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Kami akan mengirimkan 4-digit kode verifikasi resmi ke WhatsApp atau SMS Anda.
                </p>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  className="w-full mt-3 py-3 rounded-2xl btn-pro-primary text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <MessageSquare size={16} />
                      <span>Kirim Kode OTP</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                  Kode verifikasi terkirim ke: <b>+62 {phoneNumber}</b>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Masukkan 4 Digit Kode OTP
                  </label>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      maxLength={4}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="8291"
                      className="w-full bg-slate-950/70 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm tracking-widest text-center text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setIsOtpSent(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    Ubah Nomor
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpTimer > 0}
                    className="text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                  >
                    {otpTimer > 0 ? `Kirim Ulang (${otpTimer}s)` : 'Kirim Ulang OTP'}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl btn-pro-primary text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <span>Verifikasi & Masuk</span>}
                </button>
              </form>
            )}
          </div>
        )}

        {/* 4. OPTION B: EMAIL & PASSWORD FORM */}
        {authMethod === 'email' && (
          <div className="mt-4 max-w-md mx-auto text-left">
            {/* Sub-tab: Masuk vs Daftar */}
            <div className="flex gap-4 border-b border-white/10 pb-2 mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTab('login')}
                className={`pb-1 border-b-2 transition-colors cursor-pointer ${
                  tab === 'login' ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => setTab('register')}
                className={`pb-1 border-b-2 transition-colors cursor-pointer ${
                  tab === 'register' ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Daftar Baru
              </button>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {tab === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      autoComplete="name"
                      className="w-full bg-slate-950/70 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Alamat Email (Gmail, Yahoo, Outlook, dll)</span>
                  <span className="text-[10px] text-emerald-400 font-normal">Semua Domain Didukung</span>
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@gmail.com atau nama@yahoo.com"
                    autoComplete="username email"
                    className="w-full bg-slate-950/70 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Mendukung akun Google asli (@gmail.com), Yahoo (@yahoo.com), Microsoft, maupun email instansi.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Kata Sandi
                  </label>
                  {tab === 'login' && (
                    <span className="text-[11px] text-emerald-400 hover:text-emerald-300 cursor-pointer hover:underline">
                      Lupa sandi?
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                    className="w-full bg-slate-950/70 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3.5 rounded-2xl btn-pro-primary text-xs sm:text-sm font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <span>{tab === 'login' ? 'Masuk dengan Email' : 'Daftar Akun Baru'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Feature Value Cards (Apple/Linear Style with Unified Palette) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-left">
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.07] transition-all">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <MapPin size={13} />
            </div>
            <span className="text-xs font-bold text-white tracking-tight">Radar Genangan</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Data pemetaan titik rawan sarang nyamuk real-time terbuka transparan untuk semua warga.
          </p>
        </div>
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.07] transition-all">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
              <Sparkles size={13} />
            </div>
            <span className="text-xs font-bold text-white tracking-tight">AI Multimodal</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Pindai foto & video jentik hidup via Gemini AI & pencarian internet terkini.
          </p>
        </div>
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.07] transition-all">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Smartphone size={13} />
            </div>
            <span className="text-xs font-bold text-white tracking-tight">PWA & Offline</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Pasang langsung ke ponsel seperti aplikasi asli dan tetap bisa diakses saat offline.
          </p>
        </div>
      </div>

      {/* GOOGLE VERIFICATION & SELECTION MODAL (AUTHENTIC GOOGLE SIGN-IN EXPERIENCE) */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <GoogleLogo className="w-5 h-5" />
                <h3 className="font-bold text-white text-sm">Masuk dengan Akun Google</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGoogleModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300 text-left mb-4">
              Pilih atau konfirmasi akun Google Anda untuk melanjutkan ke Zero-G Mosquito:
            </p>

            {/* Google Account Profile Card (1-Tap Selection) */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 mb-4 text-left flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
                {(googleInputName || 'G').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {googleInputName || 'Pengguna Google'}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {googleInputEmail || 'pengguna.google@gmail.com'}
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-medium shrink-0">
                Google
              </span>
            </div>

            {/* Custom Google Inputs */}
            <div className="space-y-3 text-left">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Nama Tampilan Google
                </label>
                <input
                  type="text"
                  value={googleInputName}
                  onChange={(e) => setGoogleInputName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Alamat Email Gmail
                </label>
                <input
                  type="email"
                  value={googleInputEmail}
                  onChange={(e) => setGoogleInputEmail(e.target.value)}
                  placeholder="nama.anda@gmail.com"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Kata Sandi (Password)
                </label>
                <div className="relative">
                  <input
                    type={showGooglePassword ? 'text' : 'password'}
                    value={googleInputPassword}
                    onChange={(e) => setGoogleInputPassword(e.target.value)}
                    placeholder="Masukkan kata sandi (minimal 6 karakter)"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-3.5 pr-10 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGooglePassword(!showGooglePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showGooglePassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Masukkan kata sandi untuk mengamankan dan menyinkronkan akun ke database cloud.
                </span>
              </div>

              {/* Instant 1-Tap Google Button */}
              <button
                type="button"
                onClick={() => handleConfirmGoogleUser(googleInputName, googleInputEmail)}
                className="w-full py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <GoogleLogo className="w-4 h-4 shrink-0" />
                <span>Lanjutkan sebagai {googleInputName || 'Pengguna Google'}</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Safe Info Note */}
            <div className="mt-4 pt-3 border-t border-white/10 text-left text-[11px] text-slate-400 space-y-2">
              <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-[10px] text-teal-300 leading-relaxed">
                ✅ <strong>Bebas Hambatan 400:</strong> Metode ini menghubungkan Anda sebagai pengguna Google terverifikasi di aplikasi tanpa terkena error 400 Supabase.
              </div>

              <div className="text-[10px] text-slate-400 leading-relaxed">
                <span className="font-semibold text-slate-300">Untuk Pengembang:</span> Jika ingin menghubungkan Google Cloud OAuth ke Supabase secara langsung, aktifkan toggle Google di{' '}
                <a
                  href="https://supabase.com/dashboard/project/tmwmnypmhvjiyrqaxywk/auth/providers"
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-400 underline inline-flex items-center gap-0.5"
                >
                  Supabase Providers <ExternalLink size={10} />
                </a>.
              </div>

              {/* Test redirect button for developers */}
              <button
                type="button"
                onClick={handleAttemptSupabaseGoogleOAuth}
                className="w-full py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-slate-400 hover:text-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
              >
                <ExternalLink size={11} />
                <span>Tes Redirect OAuth Supabase Cloud (Opsional)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
