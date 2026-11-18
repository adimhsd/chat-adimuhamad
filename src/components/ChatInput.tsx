'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
}

export default function ChatInput({
  onSendMessage,
  isLoading,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!input.trim() || isLoading || isComposing) return;

    const message = input.trim();
    setInput('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.blur();
    }

    await onSendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  return (
    <div className="pt-2 border-t border-[var(--border-subtle)]">
      <div className="yaru-card p-2 sm:p-2.5 flex items-end gap-2.5 transition-all focus-within:border-[#E95420] focus-within:shadow-[0_0_0_3px_var(--focus-ring)]">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder="Tanya apa aja, asal jangan tanya kapan kiamat..."
          disabled={isLoading}
          rows={1}
          className="flex-1 bg-transparent px-2.5 py-2 text-sm sm:text-base text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:outline-none resize-none max-h-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          aria-label="Kirim pesan"
          className="btn btn-primary px-4 py-2.5 min-w-[46px] h-[42px] text-sm font-medium shrink-0"
        >
          {isLoading ? (
            <i className="fas fa-spinner animate-spin" />
          ) : (
            <i className="fas fa-paper-plane" />
          )}
        </button>
      </div>

      <div className="text-[11px] text-[var(--text-muted)] mt-3 text-center space-y-0.5">
        <p>“SontoloyoAI is just an AI, so it can make mistakes.”</p>
        <p className="font-mono">
          © 2026 · Developed by{' '}
          <a
            href="https://adi-muhamad.my.id"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#E95420] hover:text-[#D44615] hover:underline transition-colors font-medium"
          >
            adi-muhamad.my.id
          </a>
        </p>
      </div>
    </div>
  );
}
