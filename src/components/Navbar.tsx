'use client';

interface NavbarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onClearChat?: () => void;
  hasMessages?: boolean;
  isLoading?: boolean;
}

export default function Navbar({
  theme,
  onToggleTheme,
  onClearChat,
  hasMessages = false,
  isLoading = false,
}: NavbarProps) {
  return (
    <nav className="fixed w-full top-0 left-0 z-50">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-[8px] flex items-center justify-center text-white shrink-0"
            style={{
              background: 'linear-gradient(135deg, #E95420, #77216F)',
              boxShadow: '0 4px 12px -2px rgba(233, 84, 32, 0.4)',
            }}
          >
            <i className="fas fa-robot text-lg"></i>
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base sm:text-lg leading-none text-[var(--text-primary)] truncate">
              Sontoloyo AI
            </h1>
            <p className="font-mono text-xs text-[var(--text-muted)] mt-1 truncate">
              chat.adi-muhamad.my.id
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasMessages && onClearChat && (
            <button
              type="button"
              onClick={onClearChat}
              disabled={isLoading}
              className="btn px-2.5 py-1.5 text-xs font-medium"
              title="Mulai percakapan baru"
              aria-label="Mulai percakapan baru"
            >
              <i className="fas fa-rotate-left text-[var(--text-muted)]" />
              <span className="hidden md:inline">Reset</span>
            </button>
          )}

          <div
            className="status-pill px-2.5 py-1 text-xs font-medium"
            title="API & Vector Database Aktif"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--accent-emerald)] animate-pulse" />
            <span className="hidden sm:inline">Live</span>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            className="theme-toggle px-3 py-1.5 text-xs font-medium"
            title="Ganti Tema Terang/Gelap"
            aria-label="Ganti Tema Terang/Gelap"
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span className="hidden sm:inline">
              {theme === 'dark' ? 'Light' : 'Dark'}
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
