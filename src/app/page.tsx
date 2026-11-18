'use client';

import { useEffect, useState } from 'react';
import ChatWindow from '@/components/ChatWindow';
import ChatInput from '@/components/ChatInput';
import Navbar from '@/components/Navbar';
import { readSavedTheme, persistTheme, ThemeMode } from '@/lib/theme';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    setTheme(readSavedTheme());
  }, []);

  useEffect(() => {
    persistTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      if (!window.sessionStorage.getItem('pwa_banner_dismissed')) {
        setShowInstallBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setShowInstallBanner(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const handleDismissInstallBanner = () => {
    setShowInstallBanner(false);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('pwa_banner_dismissed', '1');
    }
  };

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  const handleClearChat = () => {
    if (isLoading) return;
    setMessages([]);
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;

    const userMsgId = Date.now().toString();
    const newUserMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    const conversationHistory = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userMessage },
    ];

    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory }),
      });

      if (!response.ok) throw new Error(response.statusText || 'Request failed');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedContent = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value || new Uint8Array(), { stream: !done });

        // Tampilkan teks per karakter agar efek mengetik lebih halus dan lambat
        for (let i = 0; i < chunkValue.length; i++) {
          accumulatedContent += chunkValue[i];

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: accumulatedContent }
                : msg
            )
          );

          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId && !msg.content
            ? {
                ...msg,
                content:
                  'Maaf Boss, terjadi gangguan saat menghubungi server. Silakan coba lagi beberapa saat lagi. 🙏',
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full" style={{ height: '100dvh' }}>
      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onClearChat={handleClearChat}
        hasMessages={messages.length > 0}
        isLoading={isLoading}
        canInstallPWA={Boolean(installPrompt)}
        onInstallPWA={handleInstallPWA}
      />
      <main
        className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col overflow-hidden"
        style={{ paddingTop: '4.75rem' }}
      >
        {showInstallBanner && installPrompt && (
          <div className="mb-3 yaru-card px-3.5 py-2.5 flex items-center justify-between gap-3 border-[rgba(233,84,32,0.45)] animate-fadeIn shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-[8px] flex items-center justify-center text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #E95420, #77216F)' }}
              >
                <i className="fas fa-mobile-screen-button text-sm" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                  Install Sontoloyo AI
                </p>
                <p className="text-[11px] text-[var(--text-muted)] truncate">
                  Pasang sebagai aplikasi di perangkat Anda
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleInstallPWA}
                className="btn btn-primary px-3 py-1.5 text-xs font-medium"
              >
                <i className="fas fa-download" />
                <span>Install</span>
              </button>
              <button
                type="button"
                onClick={handleDismissInstallBanner}
                aria-label="Tutup ajakan install"
                className="btn w-7 h-7 text-xs text-[var(--text-muted)]"
              >
                <i className="fas fa-xmark" />
              </button>
            </div>
          </div>
        )}
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          onSelectPrompt={handleSendMessage}
        />
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </main>
    </div>
  );
}
