'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { readSavedTheme, persistTheme, ThemeMode } from '@/lib/theme';

interface TurnstileAPI {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: 'light' | 'dark' | 'auto';
      callback?: (token: string) => void;
      'error-callback'?: () => void;
      'expired-callback'?: () => void;
    }
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileAPI;
  }
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    setTheme(readSavedTheme());
    if (typeof window !== 'undefined' && window.turnstile) {
      setTurnstileReady(true);
    }
  }, []);

  useEffect(() => {
    persistTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileReady) return;
    const container = turnstileContainerRef.current;
    const api = window.turnstile;
    if (!container || !api) return;

    if (widgetIdRef.current) {
      api.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    }
    setTurnstileToken('');

    widgetIdRef.current = api.render(container, {
      sitekey: TURNSTILE_SITE_KEY,
      theme,
      callback: (token: string) => {
        setTurnstileToken(token);
        setError('');
      },
      'error-callback': () => {
        setTurnstileToken('');
      },
      'expired-callback': () => {
        setTurnstileToken('');
      },
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [turnstileReady, theme]);

  const resetTurnstile = () => {
    if (typeof window !== 'undefined' && window.turnstile && widgetIdRef.current) {
      window.turnstile.reset(widgetIdRef.current);
    }
    setTurnstileToken('');
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError('Silakan selesaikan verifikasi keamanan Turnstile terlebih dahulu.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          turnstile_token: turnstileToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login gagal');
        resetTurnstile();
      } else {
        router.push('/admin/dashboard');
      }
    } catch {
      setError('Terjadi kesalahan jaringan');
      resetTurnstile();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-dvh overflow-y-auto yaru-scrollbar flex flex-col justify-between p-4 sm:p-6">
      {TURNSTILE_SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={() => setTurnstileReady(true)}
        />
      )}

      {/* Top Bar */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between gap-3">
        <Link href="/" className="btn px-3 py-1.5 text-xs font-medium">
          <i className="fas fa-arrow-left text-[#E95420]" />
          <span>Kembali ke Chatbot</span>
        </Link>

        <button
          type="button"
          onClick={toggleTheme}
          className="theme-toggle px-3 py-1.5 text-xs font-medium"
          title="Ganti Tema Terang/Gelap"
          aria-label="Ganti Tema Terang/Gelap"
        >
          <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      </div>

      {/* Center Login Card */}
      <div className="w-full max-w-md mx-auto my-8">
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-[12px] text-white mb-4"
            style={{
              background: 'linear-gradient(135deg, #E95420, #77216F)',
              boxShadow: '0 8px 24px -6px rgba(233, 84, 32, 0.45)',
            }}
          >
            <i className="fas fa-robot text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Sontoloyo AI</h1>
          <div className="mt-2">
            <span className="badge-indigo text-xs px-2.5 py-0.5 font-medium">
              Admin Console
            </span>
          </div>
        </div>

        <div className="yaru-card overflow-hidden">
          <div
            className="h-1 w-full"
            style={{
              background: 'linear-gradient(90deg, #E95420 0%, #77216F 65%, #2C001E 100%)',
            }}
          />
          <div className="p-6 sm:p-8">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Masuk sebagai Admin
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1 mb-6">
              Kelola riwayat percakapan &amp; analitik RAG ekosistem blog.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  className="block font-mono text-xs uppercase tracking-wider text-[var(--text-secondary)] mb-2"
                  htmlFor="email"
                >
                  Email
                </label>
                <div className="relative">
                  <i className="fas fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@adi-muhamad.my.id"
                    required
                    className="yaru-input w-full pl-10 pr-4 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  className="block font-mono text-xs uppercase tracking-wider text-[var(--text-secondary)] mb-2"
                  htmlFor="password"
                >
                  Password
                </label>
                <div className="relative">
                  <i className="fas fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="yaru-input w-full pl-10 pr-10 py-2.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                    title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-[6px] text-[var(--text-muted)] hover:text-[#E95420] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
                  </button>
                </div>
              </div>

              {TURNSTILE_SITE_KEY && (
                <div className="pt-1 flex flex-col items-center">
                  <div ref={turnstileContainerRef} className="min-h-[65px] flex items-center justify-center" />
                </div>
              )}

              {error && (
                <div className="badge-danger flex items-center gap-2.5 px-4 py-3 text-sm">
                  <i className="fas fa-circle-exclamation shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)}
                className="btn btn-primary w-full py-3 font-semibold text-sm mt-2"
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-right-to-bracket" />
                    <span>Masuk</span>
                  </>
                )}
              </button>
            </form>

            <p className="text-center font-mono text-xs text-[var(--text-muted)] mt-6">
              Akses khusus administrator
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center font-mono text-xs text-[var(--text-muted)] pb-2">
        &copy; 2026 Sontoloyo AI ·{' '}
        <a
          href="https://adi-muhamad.my.id"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#E95420] hover:underline"
        >
          adi-muhamad.my.id
        </a>
      </p>
    </div>
  );
}
