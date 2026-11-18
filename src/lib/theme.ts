export type ThemeMode = 'light' | 'dark';

/**
 * Membaca preferensi tema dari localStorage atau cookie lintas-subdomain.
 */
export function readSavedTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const cookieMatch = document.cookie.match(/(?:^|; )adi_lp_theme=([^;]+)/);
  const cookieTheme = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
  const saved =
    window.localStorage.getItem('adi_lp_theme') ||
    window.localStorage.getItem('theme') ||
    cookieTheme;
  return saved === 'light' ? 'light' : 'dark';
}

/**
 * Menerapkan tema ke elemen root (`data-theme` dan class `.dark`),
 * lalu menyimpannya ke localStorage dan cookie `.adi-muhamad.my.id`.
 */
export function persistTheme(theme: ThemeMode): void {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark', theme === 'dark');

    const isSubdomain = window.location.hostname.endsWith('adi-muhamad.my.id');
    const domainPart = isSubdomain ? '; domain=.adi-muhamad.my.id' : '';
    document.cookie = `adi_lp_theme=${theme}; path=/${domainPart}; max-age=31536000; SameSite=Lax`;
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('adi_lp_theme', theme);
    window.localStorage.setItem('theme', theme);
  }
}
