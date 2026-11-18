'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { readSavedTheme, persistTheme, ThemeMode } from '@/lib/theme';

interface ChatRecord {
  id: number;
  user_message: string;
  assistant_message: string;
  message_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [records, setRecords] = useState<ChatRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<ChatRecord | null>(null);
  const [exporting, setExporting] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    setTheme(readSavedTheme());
  }, []);

  useEffect(() => {
    persistTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '15',
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/admin/history?${params}`);
      if (res.status === 401) {
        router.push('/admin');
        return;
      }
      const data = await res.json();
      setRecords(data.data || []);
      setPagination(data.pagination);
    } catch {
      console.error('Failed to fetch history');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, router]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleLogout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin');
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/admin/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-history-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Gagal mengexport data');
    } finally {
      setExporting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setCurrentPage(1);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncate = (text: string, max = 80) =>
    text.length > max ? text.slice(0, max) + '...' : text;

  return (
    <div className="h-dvh overflow-y-auto yaru-scrollbar">
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-[8px] flex items-center justify-center text-white shrink-0"
              style={{
                background: 'linear-gradient(135deg, #E95420, #77216F)',
                boxShadow: '0 4px 10px -2px rgba(233, 84, 32, 0.35)',
              }}
            >
              <i className="fas fa-robot text-sm" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-sm sm:text-base text-[var(--text-primary)] truncate">
                Sontoloyo AI
              </span>
              <span className="badge-indigo text-[11px] px-2 py-0.5 hidden sm:inline-block">
                Admin Console
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/"
              className="btn px-2.5 py-1.5 text-xs font-medium"
              title="Buka Halaman Chatbot"
            >
              <i className="fas fa-comments text-[#E95420]" />
              <span className="hidden md:inline">Chat</span>
            </Link>

            <button
              type="button"
              onClick={toggleTheme}
              className="theme-toggle px-2.5 py-1.5 text-xs font-medium"
              title="Ganti Tema Terang/Gelap"
              aria-label="Ganti Tema Terang/Gelap"
            >
              <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
              <span className="hidden md:inline">
                {theme === 'dark' ? 'Light' : 'Dark'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="btn px-3 py-1.5 text-xs font-medium border-[rgba(38,162,105,0.45)] text-[var(--accent-emerald)]"
            >
              <i className={`fas ${exporting ? 'fa-spinner animate-spin' : 'fa-download'}`} />
              <span className="hidden sm:inline">
                {exporting ? 'Mengexport...' : 'Export JSON'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="btn px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
            >
              <i className="fas fa-right-from-bracket" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 pt-20 pb-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="yaru-card p-4">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Total Chat
            </p>
            <p
              className="font-bold text-[#E95420]"
              style={{ fontSize: 'var(--fs-stat-val)' }}
            >
              {pagination?.total ?? '—'}
            </p>
          </div>

          <div className="yaru-card p-4">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Halaman Aktif
            </p>
            <p
              className="font-bold text-[var(--text-primary)]"
              style={{ fontSize: 'var(--fs-stat-val)' }}
            >
              {pagination ? `${pagination.page}/${pagination.totalPages}` : '—'}
            </p>
          </div>

          <div
            className="col-span-2 md:col-span-1 rounded-[12px] p-4 border border-[rgba(119,33,111,0.35)] shadow-[var(--shadow-card)]"
            style={{ background: 'var(--bg-quote)' }}
          >
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--badge-aubergine-text)] mb-2">
              Status Infrastruktur
            </p>
            <span className="status-pill px-3 py-1 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-emerald)] animate-pulse" />
              Database Terhubung · pgvector
            </span>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari pesan pengguna atau respons AI..."
              className="yaru-input w-full pl-10 pr-4 py-2.5 text-sm bg-[var(--bg-card)]"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary px-5 py-2.5 text-sm font-medium"
          >
            Cari
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSearchInput('');
                setCurrentPage(1);
              }}
              className="btn px-3.5 py-2.5 text-sm text-[var(--text-secondary)]"
              title="Reset pencarian"
            >
              <i className="fas fa-xmark" />
            </button>
          )}
        </form>

        {/* Table */}
        <div className="yaru-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <i className="fas fa-spinner animate-spin text-2xl text-[#E95420] mb-3" />
                <p className="text-[var(--text-muted)] text-sm font-mono">
                  Memuat riwayat percakapan...
                </p>
              </div>
            </div>
          ) : records.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <i className="fas fa-inbox text-3xl text-[var(--text-disabled)] mb-3" />
                <p className="text-[var(--text-muted)] text-sm">Belum ada data chat</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto yaru-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                    <th className="text-left px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold w-14">
                      #
                    </th>
                    <th className="text-left px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                      Pesan User
                    </th>
                    <th className="text-left px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold hidden md:table-cell">
                      Respons AI
                    </th>
                    <th className="text-left px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold hidden lg:table-cell">
                      Tokens
                    </th>
                    <th className="text-left px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                      Waktu
                    </th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {records.map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                      onClick={() => setSelectedRecord(record)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                        #{record.id}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[var(--text-primary)] text-xs sm:text-[13px] leading-relaxed">
                          {truncate(record.user_message)}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-[var(--text-muted)] text-xs leading-relaxed">
                          {truncate(record.assistant_message)}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="badge-cyan text-xs px-2 py-0.5 inline-block">
                          {record.total_tokens} tok
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--text-muted)] text-xs whitespace-nowrap">
                        {formatDate(record.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <i className="fas fa-chevron-right text-[var(--text-muted)] text-xs" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <p className="font-mono text-xs text-[var(--text-muted)]">
              Menampilkan {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} dari{' '}
              {pagination.total} data
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn px-3 py-1.5 text-xs"
              >
                <i className="fas fa-chevron-left" />
              </button>
              <span className="font-mono px-3 py-1.5 text-xs text-[var(--text-secondary)]">
                {currentPage} / {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage === pagination.totalPages}
                className="btn px-3 py-1.5 text-xs"
              >
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-[10000] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="yaru-card w-full max-w-2xl max-h-[85vh] overflow-y-auto yaru-scrollbar animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="h-1 w-full"
              style={{
                background: 'linear-gradient(90deg, #E95420 0%, #77216F 65%, #2C001E 100%)',
              }}
            />
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  Detail Chat <span className="font-mono text-[#E95420]">#{selectedRecord.id}</span>
                </h3>
                <p className="font-mono text-xs text-[var(--text-muted)] mt-0.5">
                  {formatDate(selectedRecord.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="btn w-8 h-8 text-xs text-[var(--text-muted)]"
                aria-label="Tutup modal"
              >
                <i className="fas fa-xmark" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {/* Token info */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[8px] p-3 text-center">
                  <p className="font-mono text-[11px] uppercase text-[var(--text-muted)]">
                    Pesan
                  </p>
                  <p className="font-mono text-lg font-bold text-[var(--text-primary)] mt-0.5">
                    {selectedRecord.message_tokens}
                  </p>
                </div>
                <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[8px] p-3 text-center">
                  <p className="font-mono text-[11px] uppercase text-[var(--text-muted)]">
                    Respons
                  </p>
                  <p className="font-mono text-lg font-bold text-[var(--text-primary)] mt-0.5">
                    {selectedRecord.completion_tokens}
                  </p>
                </div>
                <div className="badge-cyan rounded-[8px] p-3 text-center">
                  <p className="font-mono text-[11px] uppercase">Total Tokens</p>
                  <p className="font-mono text-lg font-bold mt-0.5">
                    {selectedRecord.total_tokens}
                  </p>
                </div>
              </div>

              {/* User message */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-[#77216F] rounded-[6px] flex items-center justify-center text-white">
                    <i className="fas fa-user text-[11px]" />
                  </div>
                  <span className="font-mono text-xs font-medium text-[var(--text-secondary)]">
                    Pengguna
                  </span>
                </div>
                <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[12px] p-4">
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                    {selectedRecord.user_message}
                  </p>
                </div>
              </div>

              {/* Assistant message */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-6 h-6 rounded-[6px] flex items-center justify-center text-white"
                    style={{ background: 'linear-gradient(135deg, #E95420, #77216F)' }}
                  >
                    <i className="fas fa-robot text-[11px]" />
                  </div>
                  <span className="font-mono text-xs font-medium text-[#E95420]">
                    Sontoloyo AI
                  </span>
                </div>
                <div
                  className="border border-[rgba(119,33,111,0.35)] rounded-[12px] p-4"
                  style={{ background: 'var(--bg-quote)' }}
                >
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                    {selectedRecord.assistant_message}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
