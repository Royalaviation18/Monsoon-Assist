import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, ShieldAlert } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'model';
  parts: string;
}

export const MultilingualChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('English');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const LANGUAGES = ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi'];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', parts: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/monsoon/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: messages,
          language
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'model', parts: data.reply }]);
      }
    } catch (err) {
      console.error('Chat request failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '480px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={18} style={{ color: 'var(--accent-color)' }} />
          Multilingual Safety Helper
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Gemini-Powered</span>
      </div>

      {/* Language Selector chips */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {LANGUAGES.map(lang => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: language === lang ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
              background: language === lang ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
              color: language === lang ? 'var(--text-primary)' : 'var(--text-secondary)'
            }}
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Chat Messages Panel */}
      <div
        aria-live="polite"
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '8px',
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}
      >
        {messages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-tertiary)', maxWidth: '260px' }}>
            <ShieldAlert size={28} style={{ margin: '0 auto 8px auto', display: 'block', color: 'var(--text-tertiary)' }} />
            <span style={{ fontSize: '0.8rem', display: 'block' }}>
              Ask safety questions like "How to clean waterlogged rooms?" or "What to put in first aid?" in {language}.
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
                color: 'var(--text-primary)'
              }}
            >
              {msg.parts}
            </div>
          ))
        )}
        {loading && (
          <div style={{ alignSelf: 'flex-start', background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
            Gemini is translating & typing...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask safety questions in ${language}...`}
          style={{ flex: 1 }}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="gradient-btn"
          style={{ width: '46px', height: '46px', padding: 0 }}
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
