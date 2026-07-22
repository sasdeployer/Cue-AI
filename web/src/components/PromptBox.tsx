import { useState, useRef, useEffect } from 'react';

interface Props {
  onSubmit: (prompt: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
  busy?: boolean;
}

export default function PromptBox({
  onSubmit,
  placeholder = 'Tell Cue what to present…',
  autoFocus,
  compact,
  busy,
}: Props) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  // auto-grow
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, compact ? 120 : 200) + 'px';
  }, [value, compact]);

  const submit = () => {
    const v = value.trim();
    if (!v || busy) return;
    onSubmit(v);
    setValue('');
  };

  return (
    <div
      style={{
        border: '1px solid var(--border-2)',
        background: 'var(--surface)',
        borderRadius: compact ? 14 : 18,
        padding: compact ? 12 : 18,
        boxShadow: '0 12px 40px -12px rgba(17,17,17,0.16)',
        transition: 'border-color .15s ease',
      }}
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        rows={compact ? 1 : 2}
        style={{
          width: '100%',
          resize: 'none',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--fg)',
          fontSize: compact ? 14.5 : 16,
          lineHeight: 1.5,
          fontFamily: 'inherit',
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: compact ? 8 : 12,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '5px 10px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            color: 'var(--fg-muted)',
            fontSize: 12.5,
          }}
        >
          <span style={{ fontSize: 13 }}>⚡</span> Cue Max
        </div>
        <button
          onClick={submit}
          disabled={busy || !value.trim()}
          aria-label="Generate"
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 34,
            height: 34,
            borderRadius: 9,
            background: value.trim() ? 'var(--accent)' : 'var(--surface-2)',
            color: value.trim() ? 'var(--accent-ink)' : 'var(--fg-dim)',
            transition: 'background .15s ease',
          }}
        >
          {busy ? <span className="spinner" /> : <span style={{ fontSize: 16, lineHeight: 1 }}>↑</span>}
        </button>
      </div>
    </div>
  );
}
