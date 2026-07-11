import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, MessageSquare, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'model';
  parts: string;
}

interface MultilingualChatProps {
  /** Pre-selects the response language from the active household's plan. */
  defaultLanguage?: string;
}

// ─── Constants (hoisted — never recreated on render) ─────────────────────────

const LANGUAGES = ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi'] as const;

// ─── Static styles ────────────────────────────────────────────────────────────

const CARD_STYLE: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '16px', height: '480px' };
const HEADER_STYLE: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' };
const LANG_ROW_STYLE: React.CSSProperties = { display: 'flex', gap: '6px', flexWrap: 'wrap' };
const MSG_PANEL_STYLE: React.CSSProperties = { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' };
const EMPTY_WRAP_STYLE: React.CSSProperties = { margin: 'auto', textAlign: 'center', color: 'var(--text-tertiary)', maxWidth: '260px' };
const FORM_STYLE: React.CSSProperties = { display: 'flex', gap: '8px' };
const INPUT_STYLE: React.CSSProperties = { flex: 1 };
const SEND_BTN_STYLE: React.CSSProperties = { width: '46px', height: '46px', padding: 0 };

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * MultilingualChat — Gemini-powered emergency safety chatbot.
 * Supports 6 Indian languages and maintains conversation history.
 * Includes an offline fallback when the AI service is unavailable.
 */
export const MultilingualChat: React.FC<MultilingualChatProps> = ({ defaultLanguage = 'English' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState(defaultLanguage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', parts: input };
    const sentInput = input; // capture before clearing
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/monsoon/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: sentInput, history: messages, language }),
      });

      if (res.ok) {
        const data: { reply: string } = await res.json();
        setMessages(prev => [...prev, { role: 'model', parts: data.reply }]);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Safety assistant returned an error. Please try again.');
      }
    } catch {
      setError('Network error. Could not reach the safety assistant. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, language]);

  return (
    <div className="glass-card" style={CARD_STYLE}>
      <div style={HEADER_STYLE}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={18} style={{ color: 'var(--accent-color)' }} aria-hidden="true" />
          Multilingual Safety Helper
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Gemini-Powered</span>
      </div>

      {/* Language selector */}
      <div style={LANG_ROW_STYLE} role="group" aria-label="Select response language">
        {LANGUAGES.map(lang => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            aria-pressed={language === lang}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: language === lang ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
              background: language === lang ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
              color: language === lang ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Message panel */}
      <div aria-live="polite" aria-label="Chat messages" style={MSG_PANEL_STYLE}>
        {messages.length === 0 ? (
          <div style={EMPTY_WRAP_STYLE}>
            <ShieldAlert size={28} style={{ margin: '0 auto 8px auto', display: 'block', color: 'var(--accent-color)' }} aria-hidden="true" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', color: 'var(--text-primary)', marginBottom: '6px' }}>
              RainReady Safety Assistant
            </span>
            <span style={{ fontSize: '0.78rem', display: 'block' }}>
              Ask questions like "What to do if my home floods?" or "First aid for electrocution" in {language}.
            </span>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: msg.role === 'user' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-tertiary)',
                border: msg.role === 'user' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border-color)',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
              }}
            >
              {msg.parts}
            </div>
          ))
        )}
        {loading && (
          <div style={{ alignSelf: 'flex-start', background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} aria-hidden="true" />
            Thinking in {language}...
          </div>
        )}
        {error && (
          <div role="alert" style={{ alignSelf: 'stretch', background: 'rgba(244, 63, 94, 0.06)', border: '1px solid rgba(244, 63, 94, 0.2)', color: 'var(--error-color)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem' }}>
            ⚠ {error}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={FORM_STYLE}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask safety questions in ${language}...`}
          style={INPUT_STYLE}
          required
          aria-label={`Ask safety questions in ${language}`}
        />
        <button
          type="submit"
          disabled={loading}
          className="gradient-btn"
          style={SEND_BTN_STYLE}
          aria-label="Send message"
          aria-busy={loading}
        >
          <Send size={16} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
};
