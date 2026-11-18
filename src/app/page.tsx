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

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    setTheme(readSavedTheme());
  }, []);

  useEffect(() => {
    persistTheme(theme);
  }, [theme]);

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
      />
      <main
        className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col overflow-hidden"
        style={{ paddingTop: '4.75rem' }}
      >
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
