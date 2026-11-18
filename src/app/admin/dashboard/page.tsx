'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

interface KnowledgeSource {
  source: string;
  chunk_count: number;
  total_chars: number;
  last_updated: string;
  has_embeddings: boolean;
}

interface KnowledgeStats {
  totalSources: number;
  totalChunks: number;
  totalChars: number;
  embeddingModel: string;
}

interface IngestLog {
  id: number;
  file_name: string;
  source: string;
  total_chunks: number;
  text_length: number;
  embedding_model: string;
  ingested_at: string;
}

interface DocumentChunk {
  id: number;
  chunk_index: number;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function estimateChunkCount(text: string, chunkSize: number, overlap: number): number {
  const clean = text.trim();
  if (!clean) return 0;
  const safeSize = Math.max(200, Math.min(4000, chunkSize || 1000));
  const safeOverlap = Math.max(0, Math.min(safeSize - 50, overlap || 0));
  const step = Math.max(1, safeSize - safeOverlap);
  if (clean.length <= safeSize) return 1;
  return Math.ceil((clean.length - safeSize) / step) + 1;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'history' | 'knowledge'>('history');
  const [theme, setTheme] = useState<ThemeMode>('dark');

  // Chat history state
  const [records, setRecords] = useState<ChatRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<ChatRecord | null>(null);
  const [exporting, setExporting] = useState(false);

  // Knowledge base / Vector DB state
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeStats, setKnowledgeStats] = useState<KnowledgeStats | null>(null);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [ingestHistory, setIngestHistory] = useState<IngestLog[]>([]);

  // Import form state
  const [kbSource, setKbSource] = useState('');
  const [kbFileName, setKbFileName] = useState('manual-input.txt');
  const [kbContent, setKbContent] = useState('');
  const [kbChunkSize, setKbChunkSize] = useState(1000);
  const [kbOverlap, setKbOverlap] = useState(200);
  const [kbMode, setKbMode] = useState<'replace' | 'append'>('replace');
  const [kbSubmitting, setKbSubmitting] = useState(false);
  const [kbFeedback, setKbFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chunk inspection modal state
  const [inspectSource, setInspectSource] = useState<string | null>(null);
  const [inspectChunks, setInspectChunks] = useState<DocumentChunk[]>([]);
  const [inspectLoading, setInspectLoading] = useState(false);

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

  const fetchKnowledge = useCallback(async () => {
    setKnowledgeLoading(true);
    try {
      const res = await fetch('/api/admin/knowledge');
      if (res.status === 401) {
        router.push('/admin');
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setKnowledgeStats(data.stats || null);
        setKnowledgeSources(data.sources || []);
        setIngestHistory(data.history || []);
      }
    } catch {
      console.error('Failed to fetch knowledge base');
    } finally {
      setKnowledgeLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (activeTab === 'knowledge') {
      fetchKnowledge();
    }
  }, [activeTab, fetchKnowledge]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setKbContent(text);
      setKbFileName(file.name);
      if (!kbSource.trim()) {
        const derivedName = file.name.replace(/\.(txt|md)$/i, '').replace(/[-_]+/g, ' ');
        setKbSource(derivedName);
      }
      setKbFeedback(null);
    } catch {
      setKbFeedback({ type: 'error', message: 'Gagal membaca file teks.' });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEmbedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbSource.trim() || !kbContent.trim()) {
      setKbFeedback({
        type: 'error',
        message: 'Nama sumber dan konten teks wajib diisi.',
      });
      return;
    }

    setKbSubmitting(true);
    setKbFeedback(null);

    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: kbSource,
          content: kbContent,
          fileName: kbFileName,
          chunkSize: kbChunkSize,
          overlap: kbOverlap,
          mode: kbMode,
        }),
      });

      if (res.status === 401) {
        router.push('/admin');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setKbFeedback({
          type: 'error',
          message: data.error || 'Gagal menyimpan embedding.',
        });
      } else {
        setKbFeedback({
          type: 'success',
          message: `Berhasil meng-embed ${data.totalChunks} chunks (${data.totalChars.toLocaleString('id-ID')} karakter) ke sumber "${data.source}".`,
        });
        setKbContent('');
        setKbSource('');
        setKbFileName('manual-input.txt');
        await fetchKnowledge();
      }
    } catch {
      setKbFeedback({
        type: 'error',
        message: 'Terjadi kesalahan jaringan saat memproses embedding.',
      });
    } finally {
      setKbSubmitting(false);
    }
  };

  const handleInspectSource = async (source: string) => {
    setInspectSource(source);
    setInspectLoading(true);
    setInspectChunks([]);
    try {
      const res = await fetch(
        `/api/admin/knowledge?source=${encodeURIComponent(source)}`
      );
      if (res.status === 401) {
        router.push('/admin');
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setInspectChunks(data.chunks || []);
      }
    } catch {
      console.error('Failed to fetch chunks');
    } finally {
      setInspectLoading(false);
    }
  };

  const handleDeleteSource = async (source: string) => {
    if (
      !window.confirm(
        `Hapus seluruh chunks embedding untuk sumber "${source}"? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/knowledge?source=${encodeURIComponent(source)}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        if (inspectSource === source) {
          setInspectSource(null);
        }
        await fetchKnowledge();
      }
    } catch {
      alert('Gagal menghapus sumber dokumen.');
    }
  };

  const handleDeleteChunk = async (chunkId: number) => {
    if (!window.confirm(`Hapus chunk #${chunkId}?`)) return;
    try {
      const res = await fetch(`/api/admin/knowledge?id=${chunkId}`, {
        method: 'DELETE',
      });
      if (res.ok && inspectSource) {
        await handleInspectSource(inspectSource);
        await fetchKnowledge();
      }
    } catch {
      alert('Gagal menghapus chunk.');
    }
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

  const estimatedChunks = estimateChunkCount(kbContent, kbChunkSize, kbOverlap);

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

      <main className="max-w-7xl mx-auto px-4 pt-20 pb-10">
        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`tab-btn px-4 py-2 text-xs sm:text-sm font-medium flex items-center gap-2 cursor-pointer ${
              activeTab === 'history' ? 'active' : ''
            }`}
          >
            <i className="fas fa-clock-rotate-left text-[#E95420]" />
            <span>Riwayat Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('knowledge')}
            className={`tab-btn px-4 py-2 text-xs sm:text-sm font-medium flex items-center gap-2 cursor-pointer ${
              activeTab === 'knowledge' ? 'active' : ''
            }`}
          >
            <i className="fas fa-database text-[#E95420]" />
            <span>Knowledge Base (Vector DB)</span>
          </button>
        </div>

        {activeTab === 'history' ? (
          <>
            {/* Chat Stats */}
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
          </>
        ) : (
          <>
            {/* Knowledge Base Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="yaru-card p-4">
                <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Total Sumber Dokumen
                </p>
                <p
                  className="font-bold text-[#E95420]"
                  style={{ fontSize: 'var(--fs-stat-val)' }}
                >
                  {knowledgeStats?.totalSources ?? '—'}
                </p>
              </div>

              <div className="yaru-card p-4">
                <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Total Chunks Vektor
                </p>
                <p
                  className="font-bold text-[var(--text-primary)]"
                  style={{ fontSize: 'var(--fs-stat-val)' }}
                >
                  {knowledgeStats?.totalChunks ?? '—'}
                </p>
              </div>

              <div
                className="col-span-2 md:col-span-1 rounded-[12px] p-4 border border-[rgba(119,33,111,0.35)] shadow-[var(--shadow-card)]"
                style={{ background: 'var(--bg-quote)' }}
              >
                <p className="font-mono text-xs uppercase tracking-wider text-[var(--badge-aubergine-text)] mb-2">
                  Model Embedding (1536d)
                </p>
                <span className="status-pill px-3 py-1 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-emerald)]" />
                  {knowledgeStats?.embeddingModel ?? 'text-embedding-3-small'}
                </span>
              </div>
            </div>

            {/* 2-Column Layout: Form Import & Daftar Dokumen */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Form Import & Embedding */}
              <div className="lg:col-span-5 yaru-card overflow-hidden">
                <div
                  className="h-1 w-full"
                  style={{
                    background: 'linear-gradient(90deg, #E95420 0%, #77216F 65%, #2C001E 100%)',
                  }}
                />
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div>
                      <h2 className="text-base font-bold text-[var(--text-primary)]">
                        Import &amp; Embed Dokumen
                      </h2>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Potong teks menjadi chunks &amp; generate vektor ke pgvector.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleEmbedSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="kb-source"
                        className="block font-mono text-xs uppercase tracking-wider text-[var(--text-secondary)] mb-1.5"
                      >
                        Nama Sumber / Topik
                      </label>
                      <input
                        id="kb-source"
                        type="text"
                        value={kbSource}
                        onChange={(e) => setKbSource(e.target.value)}
                        placeholder="Contoh: Profil Adi Muhamad / Artikel Bisnis Digital"
                        required
                        className="yaru-input w-full px-3.5 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <label
                          htmlFor="kb-content"
                          className="font-mono text-xs uppercase tracking-wider text-[var(--text-secondary)]"
                        >
                          Konten Teks
                        </label>
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".txt,.md,text/plain,text/markdown"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="kb-file-upload"
                          />
                          <label
                            htmlFor="kb-file-upload"
                            className="btn px-2.5 py-1 text-[11px] font-medium cursor-pointer"
                          >
                            <i className="fas fa-file-arrow-up text-[#E95420]" />
                            <span>Muat File .txt / .md</span>
                          </label>
                        </div>
                      </div>

                      <textarea
                        id="kb-content"
                        rows={8}
                        value={kbContent}
                        onChange={(e) => setKbContent(e.target.value)}
                        placeholder="Tempelkan teks artikel, profil, FAQ, atau materi kuliah di sini..."
                        required
                        className="yaru-input w-full px-3.5 py-2.5 text-sm yaru-scrollbar"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 font-mono text-[11px] text-[var(--text-muted)]">
                        <span>File: {kbFileName}</span>
                        <span>
                          {kbContent.length.toLocaleString('id-ID')} karakter ·{' '}
                          <strong className="text-[#E95420]">~{estimatedChunks} chunks</strong>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label
                          htmlFor="kb-chunk-size"
                          className="block font-mono text-[11px] uppercase text-[var(--text-muted)] mb-1"
                        >
                          Chunk Size
                        </label>
                        <input
                          id="kb-chunk-size"
                          type="number"
                          min={200}
                          max={4000}
                          step={50}
                          value={kbChunkSize}
                          onChange={(e) => setKbChunkSize(Number(e.target.value))}
                          className="yaru-input w-full px-2.5 py-1.5 font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="kb-overlap"
                          className="block font-mono text-[11px] uppercase text-[var(--text-muted)] mb-1"
                        >
                          Overlap
                        </label>
                        <input
                          id="kb-overlap"
                          type="number"
                          min={0}
                          max={500}
                          step={25}
                          value={kbOverlap}
                          onChange={(e) => setKbOverlap(Number(e.target.value))}
                          className="yaru-input w-full px-2.5 py-1.5 font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="kb-mode"
                          className="block font-mono text-[11px] uppercase text-[var(--text-muted)] mb-1"
                        >
                          Mode
                        </label>
                        <select
                          id="kb-mode"
                          value={kbMode}
                          onChange={(e) =>
                            setKbMode(e.target.value === 'append' ? 'append' : 'replace')
                          }
                          className="yaru-input w-full px-2 py-1.5 font-mono text-xs"
                        >
                          <option value="replace">Timpa</option>
                          <option value="append">Tambah</option>
                        </select>
                      </div>
                    </div>

                    {kbFeedback && (
                      <div
                        className={`px-3.5 py-2.5 text-xs flex items-start gap-2 ${
                          kbFeedback.type === 'success' ? 'badge-emerald' : 'badge-danger'
                        }`}
                      >
                        <i
                          className={`fas mt-0.5 shrink-0 ${
                            kbFeedback.type === 'success'
                              ? 'fa-circle-check'
                              : 'fa-circle-exclamation'
                          }`}
                        />
                        <span>{kbFeedback.message}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={kbSubmitting || !kbSource.trim() || !kbContent.trim()}
                      className="btn btn-primary w-full py-2.5 text-sm font-semibold"
                    >
                      {kbSubmitting ? (
                        <>
                          <i className="fas fa-spinner animate-spin" />
                          <span>Memproses Embedding...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-wand-magic-sparkles" />
                          <span>Proses Embedding &amp; Simpan ke DB Vektor</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Daftar Dokumen di Vector DB */}
              <div className="lg:col-span-7 space-y-6">
                <div className="yaru-card overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-[var(--text-primary)]">
                        Dokumen Tersimpan di Vector DB
                      </h2>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Daftar sumber pengetahuan yang aktif digunakan oleh RAG Chatbot.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={fetchKnowledge}
                      disabled={knowledgeLoading}
                      className="btn px-3 py-1.5 text-xs font-medium"
                      title="Muat ulang daftar dokumen"
                    >
                      <i
                        className={`fas fa-rotate ${
                          knowledgeLoading ? 'animate-spin text-[#E95420]' : ''
                        }`}
                      />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                  </div>

                  {knowledgeLoading && knowledgeSources.length === 0 ? (
                    <div className="flex items-center justify-center h-44">
                      <div className="text-center">
                        <i className="fas fa-spinner animate-spin text-2xl text-[#E95420] mb-2" />
                        <p className="font-mono text-xs text-[var(--text-muted)]">
                          Memuat data vektor...
                        </p>
                      </div>
                    </div>
                  ) : knowledgeSources.length === 0 ? (
                    <div className="flex items-center justify-center h-44 px-4 text-center">
                      <div>
                        <i className="fas fa-database text-3xl text-[var(--text-disabled)] mb-2" />
                        <p className="text-sm text-[var(--text-muted)]">
                          Belum ada dokumen di database vektor. Tambahkan melalui form di sebelah kiri.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto yaru-scrollbar">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                            <th className="text-left px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                              Sumber
                            </th>
                            <th className="text-left px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                              Chunks
                            </th>
                            <th className="text-left px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold hidden sm:table-cell">
                              Ukuran
                            </th>
                            <th className="text-left px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold hidden md:table-cell">
                              Diperbarui
                            </th>
                            <th className="text-right px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                              Aksi
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                          {knowledgeSources.map((item) => (
                            <tr
                              key={item.source}
                              className="hover:bg-[var(--bg-hover)] transition-colors"
                            >
                              <td className="px-4 py-3">
                                <p className="font-medium text-[var(--text-primary)] text-xs sm:text-sm">
                                  {item.source}
                                </p>
                                <span
                                  className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 ${
                                    item.has_embeddings ? 'badge-emerald' : 'badge-amber'
                                  }`}
                                >
                                  {item.has_embeddings ? 'Vector Ready' : 'Partial Vector'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="badge-cyan text-xs px-2 py-0.5 inline-block">
                                  {item.chunk_count}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)] hidden sm:table-cell">
                                {item.total_chars.toLocaleString('id-ID')} chr
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)] hidden md:table-cell whitespace-nowrap">
                                {formatDate(item.last_updated)}
                              </td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleInspectSource(item.source)}
                                    className="btn px-2.5 py-1.5 text-xs"
                                    title="Lihat daftar chunks"
                                  >
                                    <i className="fas fa-eye text-[#E95420]" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSource(item.source)}
                                    className="btn px-2.5 py-1.5 text-xs text-[var(--accent-danger)]"
                                    title="Hapus sumber dokumen"
                                  >
                                    <i className="fas fa-trash" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Riwayat Ingest Terbaru */}
                {ingestHistory.length > 0 && (
                  <div className="yaru-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                      <h3 className="font-mono text-xs uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                        Riwayat Ingest Terbaru
                      </h3>
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)] max-h-60 overflow-y-auto yaru-scrollbar">
                      {ingestHistory.map((log) => (
                        <div
                          key={log.id}
                          className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--text-primary)] truncate">
                              {log.source}{' '}
                              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                                ({log.file_name})
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--text-muted)] shrink-0">
                            <span className="badge-indigo px-2 py-0.5">
                              {log.total_chunks} chunks
                            </span>
                            <span>{formatDate(log.ingested_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Detail Modal Chat History */}
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

      {/* Modal Inspeksi Chunks Vector DB */}
      {inspectSource && (
        <div
          className="fixed inset-0 z-[10000] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setInspectSource(null)}
        >
          <div
            className="yaru-card w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="h-1 w-full shrink-0"
              style={{
                background: 'linear-gradient(90deg, #E95420 0%, #77216F 65%, #2C001E 100%)',
              }}
            />
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border-subtle)] shrink-0">
              <div className="min-w-0">
                <h3 className="font-bold text-base text-[var(--text-primary)] truncate">
                  Chunks: <span className="text-[#E95420]">{inspectSource}</span>
                </h3>
                <p className="font-mono text-xs text-[var(--text-muted)] mt-0.5">
                  {inspectChunks.length} potongan vektor tersimpan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectSource(null)}
                className="btn w-8 h-8 text-xs text-[var(--text-muted)] shrink-0"
                aria-label="Tutup modal chunks"
              >
                <i className="fas fa-xmark" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto yaru-scrollbar space-y-3">
              {inspectLoading ? (
                <div className="flex items-center justify-center py-12">
                  <i className="fas fa-spinner animate-spin text-2xl text-[#E95420]" />
                </div>
              ) : inspectChunks.length === 0 ? (
                <p className="text-center text-sm text-[var(--text-muted)] py-8">
                  Tidak ada chunk untuk sumber ini.
                </p>
              ) : (
                inspectChunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[10px] p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="badge-cyan text-[11px] px-2 py-0.5">
                          Chunk #{chunk.chunk_index}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--text-muted)]">
                          ID:{chunk.id} · {chunk.content.length} chars
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteChunk(chunk.id)}
                        className="btn px-2 py-1 text-[11px] text-[var(--accent-danger)]"
                        title="Hapus chunk ini"
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                      {chunk.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
