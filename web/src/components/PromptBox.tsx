import { useState, useRef, useEffect } from 'react';

interface Props {
  onSubmit: (prompt: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
  busy?: boolean;
  /** Frosted glass treatment for use over a photo/art background (landing hero). */
  glass?: boolean;
}

export default function PromptBox({
  onSubmit,
  placeholder = 'Tell Cue what to present…',
  autoFocus,
  compact,
  busy,
  glass,
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
        border: glass ? '1px solid rgba(247,246,242,0.18)' : '1px solid var(--border-2)',
        background: glass ? 'rgba(20,18,14,0.38)' : 'var(--surface)',
        backdropFilter: glass ? 'blur(24px) saturate(160%)' : undefined,
        WebkitBackdropFilter: glass ? 'blur(24px) saturate(160%)' : undefined,
        borderRadius: compact ? 14 : 18,
        padding: compact ? 12 : 18,
        boxShadow: glass ? '0 20px 60px -20px rgba(0,0,0,0.5)' : '0 14px 36px -14px rgba(0,0,0,0.65)',
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
        className={glass ? 'prompt-glass-input' : undefined}
        style={{
          width: '100%',
          resize: 'none',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: glass ? '#F7F6F2' : 'var(--fg)',
          fontSize: compact ? 14.5 : 16,
          lineHeight: 1.5,
          fontFamily: 'inherit',
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginTop: compact ? 8 : 12,
        }}
      >
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
            background: value.trim() ? 'var(--accent)' : glass ? 'rgba(247,246,242,0.14)' : 'var(--surface-2)',
            color: value.trim() ? 'var(--accent-ink)' : glass ? 'rgba(247,246,242,0.55)' : 'var(--fg-dim)',
            transition: 'background .15s ease',
          }}
        >
          {busy ? <span className="spinner" /> : <span style={{ fontSize: 16, lineHeight: 1 }}>↑</span>}
        </button>
      </div>
    </div>
  );
}
