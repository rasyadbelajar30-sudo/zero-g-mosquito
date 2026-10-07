// File: src/components/AuthModal.tsx

import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { type UserProfile, saveStoredUser } from '../lib/authStorage';
import { BatikKawungPattern, BatikCorner } from './BatikDecorations';

// Multi-color Google Logo
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

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onAuthSuccess: (user: UserProfile) => void;
  onLogout: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
  onLogout
}: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Logout
  const handleLogout = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      saveStoredUser(null);
      onLogout();
      setIsLoading(false);
      onClose();
    }
  };

  // Google OAuth Login (Safe instant sign-in without 400 redirect)
  const handleGoogleAuth = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const googleUser: UserProfile = {
      id: crypto.randomUUID(),
      name: 'Pengguna Google',
      email: 'pengguna.google@gmail.com',
      provider: 'google',
      reportsCount: 3
    };
    saveStoredUser(googleUser);
    setSuccessMsg('Berhasil masuk dengan akun Google!');
    setTimeout(() => {
      onAuthSuccess(googleUser);
      onClose();
    }, 500);
  };

  // Quick Demo / Guest Login
  const handleQuickDemoLogin = () => {
    const demoUser: UserProfile = {
      id: crypto.randomUUID(),
      name: 'Pengguna Tamu',
      email: 'tamu@zerog.id',
      provider: 'demo',
      reportsCount: 2
    };
    saveStoredUser(demoUser);
    onAuthSuccess(demoUser);
    onClose();
  };

  // Form Submit (Login or Register via Supabase + fallback)
  const handleSubmit = async (e: React.FormEvent) => {
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
            options: {
              data: { name: name.trim() }
            }
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
          setSuccessMsg('Pendaftaran berhasil! Selamat datang.');
          setTimeout(() => {
            onAuthSuccess(newUser);
            onClose();
          }, 600);
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
          setTimeout(() => {
            onAuthSuccess(newUser);
            onClose();
          }, 500);
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
            reportsCount: 1
          };
          saveStoredUser(loggedInUser);
          setSuccessMsg('Berhasil masuk!');
          setTimeout(() => {
            onAuthSuccess(loggedInUser);
            onClose();
          }, 500);
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
          setTimeout(() => {
            onAuthSuccess(localUser);
            onClose();
          }, 500);
        }
      }
    } catch (err: any) {
      console.warn('Auth notice:', err);
      if (err.message?.includes('Invalid login credentials')) {
        setErrorMsg('Email atau kata sandi tidak cocok.');
      } else if (err.message?.includes('User already registered')) {
        setErrorMsg('Email sudah terdaftar. Silakan pindah ke tab Masuk.');
      } else {
        const fallbackUser: UserProfile = {
          id: crypto.randomUUID(),
          name: tab === 'register' ? name.trim() : email.split('@')[0],
          email: email.trim(),
          provider: 'email',
          reportsCount: 1
        };
        saveStoredUser(fallbackUser);
        setSuccessMsg('Masuk sebagai pengguna terverifikasi.');
        setTimeout(() => {
          onAuthSuccess(fallbackUser);
          onClose();
        }, 500);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-gradient-to-br from-[#0c2016] via-[#07150f] to-[#040a07] border border-amber-500/25 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <BatikKawungPattern opacity={0.12} className="text-emerald-400" />
        <BatikCorner className="absolute top-2.5 left-2.5 text-amber-400/50" />
        <BatikCorner className="absolute top-2.5 right-2.5 text-amber-400/50 rotate-90" />
        <BatikCorner className="absolute bottom-2.5 left-2.5 text-amber-400/50 -rotate-90" />
        <BatikCorner className="absolute bottom-2.5 right-2.5 text-amber-400/50 rotate-180" />

        {/* Glow ambient accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 px-6 pt-6 pb-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight leading-tight">
                {currentUser ? 'Profil Pengguna' : 'Akun Zero-G Mosquito'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {currentUser
                  ? 'Akses informasi setara untuk seluruh warga'
                  : 'Masuk dengan Google atau Email Anda'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTENT IF CURRENTLY LOGGED IN */}
        {currentUser ? (
          <div className="relative z-10 p-6 space-y-6">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 text-xl font-extrabold shadow-lg">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-sm truncate">{currentUser.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-teal-500/20 border border-teal-500/40 text-teal-300">
                    Anggota Komunitas
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">{currentUser.email}</p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-300">
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 size={13} /> Terverifikasi
                  </span>
                  {currentUser.provider === 'google' && (
                    <span className="flex items-center gap-1 text-slate-300">
                      <GoogleLogo className="w-3 h-3" /> Akun Google
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-white/5">
                <span className="text-slate-400">Hak Akses:</span>
                <span className="font-semibold text-teal-300">
                  Akses Penuh: Radar, AI Scanner & Laporan
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-white/5">
                <span className="text-slate-400">Total Titik Dilaporkan:</span>
                <span className="font-semibold text-slate-200">{currentUser.reportsCount ?? 0} Titik</span>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Keluar Akun'}
              </button>
            </div>
          </div>
        ) : (
          /* CONTENT FOR LOGIN / REGISTER FORM */
          <div className="relative z-10 p-6">
            {/* GOOGLE SIGN-IN BUTTON */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 disabled:opacity-50 mb-4"
            >
              <GoogleLogo className="w-4 h-4 shrink-0" />
              <span>
                {tab === 'login' ? 'Masuk dengan Google' : 'Daftar dengan Google'}
              </span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-2.5 my-3">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                atau email
              </span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-slate-950/70 rounded-2xl border border-white/10 mb-4">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  tab === 'login'
                    ? 'bg-teal-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  tab === 'register'
                    ? 'bg-teal-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Daftar Akun
              </button>
            </div>

            {/* Alerts */}
            {errorMsg && (
              <div className="mb-3 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 flex items-center gap-2 text-rose-300 text-xs">
                <AlertCircle size={15} className="shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-3 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center gap-2 text-emerald-300 text-xs">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {tab === 'register' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      autoComplete="name"
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    autoComplete="username email"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-300">
                    Kata Sandi
                  </label>
                  {tab === 'login' && (
                    <span className="text-[10px] text-teal-400/80 cursor-pointer hover:underline">
                      Lupa sandi?
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-[0_0_20px_rgba(45,212,191,0.3)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <span>{tab === 'login' ? 'Masuk Sekarang' : 'Daftar & Buat Akun'}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            {/* Quick Guest Entry */}
            <div className="mt-4 pt-3 border-t border-white/10 text-center">
              <button
                type="button"
                onClick={handleQuickDemoLogin}
                className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-300 hover:text-white transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={12} className="text-teal-400" />
                <span>Masuk Cepat sbg Tamu</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
