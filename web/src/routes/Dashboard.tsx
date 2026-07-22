import { useEffect, useState } from 'react';
import Logo from '../components/Logo';
import {
  type Provider,
  setProviderKey,
  clearProviderKey,
  hasProviderKey,
  maskKey,
} from '../lib/keys';

const PROVIDERS: { id: Provider; label: string; placeholder: string }[] = [
  { id: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  { id: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...' },
];

function KeyRow({ id, label, placeholder }: { id: Provider; label: string; placeholder: string }) {
  const [saved, setSaved] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSaved(hasProviderKey(id) ? '••••••••' : null);
  }, [id]);

  const save = async () => {
    const v = input.trim();
    if (!v || busy) return;
    setBusy(true);
    await setProviderKey(id, v);
    setSaved(maskKey(v));
    setInput('');
    setBusy(false);
  };

  const clear = () => {
    clearProviderKey(id);
    setSaved(null);
  };

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 18,
        background: 'var(--surface)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>{label}</div>
        {saved && (
          <span style={{ fontSize: 12.5, color: 'var(--fg-dim)', fontFamily: 'var(--mono)' }}>{saved}</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
          }}
          placeholder={saved ? 'Replace with a new key…' : placeholder}
          style={{
            flex: 1,
            padding: '9px 12px',
            borderRadius: 8,
            border: '1px solid var(--border-2)',
            background: 'var(--bg)',
            color: 'var(--fg)',
            fontSize: 13.5,
            fontFamily: 'inherit',
          }}
        />
        <button className="btn btn-primary" onClick={save} disabled={busy || !input.trim()}>
          Save
        </button>
        {saved && (
          <button className="btn btn-ghost" onClick={clear}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div style={{ minHeight: '100%' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px clamp(20px, 5vw, 48px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <Logo />
      </header>

      <section
        style={{
          maxWidth: 640,
          width: '100%',
          margin: '0 auto',
          padding: 'clamp(32px, 6vh, 64px) clamp(20px, 5vw, 48px) 80px',
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
          Settings
        </h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: 14, lineHeight: 1.6, margin: '0 0 28px' }}>
          Cue works out of the box using a shared key. Add your own OpenAI or Anthropic key to
          use your own account instead — it's encrypted and stored only in this browser, never
          sent anywhere except as part of your own generation requests.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {PROVIDERS.map((p) => (
            <KeyRow key={p.id} {...p} />
          ))}
        </div>
      </section>
    </div>
  );
}
