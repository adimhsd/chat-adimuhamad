'use client';

interface NavbarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function Navbar({ theme, onToggleTheme }: NavbarProps) {
  return (
    <nav className="fixed w-full top-0 left-0 z-50 border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-lg text-white shadow-md">
            <i className="fas fa-robot text-xl"></i>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none text-gray-900 dark:text-white">
              Sontoloyo AI
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              chat.adi-muhamad.my.id
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
            <button
            type="button"
            onClick={onToggleTheme}
            className="px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-700 dark:text-gray-300"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} mr-1`} />
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
          <button
            className="px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-700 dark:text-gray-300"
            title="API Status"
          >
            <i className="fas fa-circle text-green-500 mr-1"></i>
            <span>Live</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
