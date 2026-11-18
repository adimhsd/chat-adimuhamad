'use client';

import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatWindowProps {
  messages: Message[];
  isLoading?: boolean;
  onSelectPrompt?: (prompt: string) => void;
}

const STARTER_PROMPTS = [
  'Siapa Adi Muhamad & apa keahliannya?',
  'Apa fokus riset & pengajaran Adi?',
  'Ceritakan proyek teknologi & filosofi Adi',
  'Topik apa saja yang ada di blog ini?',
];

export default function ChatWindow({
  messages,
  isLoading = false,
  onSelectPrompt,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto space-y-4 pr-1 sm:pr-2 mb-3 yaru-scrollbar"
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center min-h-full py-4">
          <div className="yaru-card max-w-xl w-full overflow-hidden">
            <div
              className="h-1 w-full"
              style={{
                background: 'linear-gradient(90deg, #E95420 0%, #77216F 65%, #2C001E 100%)',
              }}
            />
            <div className="p-6 sm:p-8 text-center">
              <div
                className="w-16 h-16 rounded-[12px] flex items-center justify-center mx-auto mb-4 text-white"
                style={{
                  background: 'linear-gradient(135deg, #E95420, #77216F)',
                  boxShadow: '0 8px 24px -6px rgba(233, 84, 32, 0.45)',
                }}
              >
                <i className="fas fa-robot text-2xl"></i>
              </div>

              <div className="mb-3">
                <span className="persona-tag text-[11px] px-3 py-0.5 font-medium">
                  ASISTEN VIRTUAL BLOG · RAG
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold mb-2 text-[var(--text-primary)]">
                Selamat datang, Boss! 👋
              </h2>
              <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto leading-relaxed mb-6">
                Saya adalah <strong className="text-[var(--text-primary)]">Sontoloyo AI</strong>.
                Tanyakan apa saja terkait profil, riset, pengajaran, atau artikel yang ada di
                ekosistem blog <span className="font-mono text-[#E95420]">adi-muhamad.my.id</span>.
              </p>

              {onSelectPrompt && (
                <div className="text-left">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-muted)] mb-2.5 text-center">
                    Contoh Pertanyaan Cepat
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {STARTER_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => onSelectPrompt(prompt)}
                        className="tab-btn text-left px-3.5 py-2.5 text-xs sm:text-[13px] flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span className="leading-snug">{prompt}</span>
                        <i className="fas fa-arrow-right text-[11px] text-[#E95420] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        messages.map((message) => {
          const isUser = message.role === 'user';
          const isTyping = !isUser && !message.content && isLoading;

          return (
            <div
              key={message.id}
              className={`flex gap-3 animate-fadeIn ${isUser ? 'flex-row-reverse' : ''}`}
            >
              <div
                className="w-8 h-8 rounded-[8px] flex items-center justify-center text-white shrink-0 mt-0.5"
                style={{
                  background: isUser
                    ? '#77216F'
                    : 'linear-gradient(135deg, #E95420, #77216F)',
                  boxShadow: isUser
                    ? '0 2px 6px rgba(119, 33, 111, 0.35)'
                    : '0 2px 8px rgba(233, 84, 32, 0.35)',
                }}
              >
                <i className={`fas text-xs ${isUser ? 'fa-user' : 'fa-robot'}`} />
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[80%] px-4 py-3 rounded-[12px] ${
                  isUser
                    ? 'bg-[#E95420] text-white rounded-tr-[4px] shadow-[0_6px_16px_-4px_rgba(233,84,32,0.45)]'
                    : 'yaru-card rounded-tl-[4px] text-[var(--text-primary)]'
                }`}
              >
                <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {isUser ? (
                    message.content
                  ) : isTyping ? (
                    <div className="flex items-center gap-2 py-1 text-[var(--text-muted)]">
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E95420] animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E95420] animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#77216F] animate-bounce" />
                      </span>
                      <span className="font-mono text-xs">Mencari konteks & menyusun jawaban...</span>
                    </div>
                  ) : (
                    <ReactMarkdown
                      components={{
                        h1: ({ node, ...props }) => (
                          <h1
                            className="text-lg font-bold mt-2 mb-1 text-[var(--text-primary)]"
                            {...props}
                          />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2
                            className="text-base font-bold mt-2 mb-1 text-[var(--text-primary)]"
                            {...props}
                          />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3
                            className="text-sm font-bold mt-1.5 mb-1 text-[var(--text-primary)]"
                            {...props}
                          />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="list-disc list-inside my-0 space-y-0" {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol className="list-decimal list-inside my-0 space-y-0" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="ml-1 leading-snug [&>p]:mb-0 [&>p]:inline" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong className="font-bold text-[var(--text-primary)]" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                          <a
                            className="text-[#E95420] hover:text-[#D44615] hover:underline font-medium"
                            target="_blank"
                            rel="noopener noreferrer"
                            {...props}
                          />
                        ),
                        code: ({ node, className, children, ...props }) => {
                          const isBlock = Boolean(className);
                          return isBlock ? (
                            <code className={`font-mono text-xs ${className}`} {...props}>
                              {children}
                            </code>
                          ) : (
                            <code
                              className="font-mono text-xs px-1.5 py-0.5 rounded-[6px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[#E95420]"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                        pre: ({ node, ...props }) => (
                          <pre
                            className="font-mono text-xs p-3 my-2 rounded-[8px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] overflow-x-auto"
                            {...props}
                          />
                        ),
                        blockquote: ({ node, ...props }) => (
                          <blockquote
                            className="my-2 pl-3 py-1.5 pr-3 rounded-r-[8px] border-l-[3px] border-[#77216F] text-[var(--text-secondary)]"
                            style={{ background: 'var(--bg-quote)' }}
                            {...props}
                          />
                        ),
                        p: ({ node, ...props }) => (
                          <p className="mb-2 last:mb-0 leading-snug" {...props} />
                        ),
                      }}
                    >
                      {message.content
                        .replace(/\n{3,}/g, '\n\n')
                        .replace(/\n+(?=[-•*] |\d+\.)/g, '\n')}
                    </ReactMarkdown>
                  )}
                </div>

                <p
                  className={`font-mono text-[11px] mt-2 ${
                    isUser ? 'text-white/80 text-right' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {new Date(message.timestamp).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
