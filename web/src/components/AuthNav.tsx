import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { getMe, requestMagicLink, logout } from '../lib/auth';

interface Props {
  /** Use the glass button variants — for the landing hero's photo background. */
  glass?: boolean;
}

// Renders either "Log in / Sign up" (opens an email-only magic-link form) or,
// once logged in, a "Dashboard" link + "Log out" — same component in both
// states so the header doesn't need to know which one is showing.
export default function AuthNav({ glass }: Props) {
  const [email, setEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [inputEmail, setInputEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe().then((e) => {
      setEmail(e);
      setChecked(true);
    });
  }, []);

  const submit = async () => {
    const v = inputEmail.trim();
    if (!v || busy) return;
    setBusy(true);
    setError(null);
    try {
      await requestMagicLink(v);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  if (!checked) return null; // avoid a flash of the logged-out state on load

  const ghostClass = glass ? 'btn btn-ghost btn-ghost-glass' : 'btn btn-ghost';
  const primaryClass = glass ? 'btn btn-primary btn-primary-glass' : 'btn btn-primary';

  if (email) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link to="/dashboard" className={ghostClass}>
          Dashboard
        </Link>
        <button
          className={ghostClass}
          onClick={async () => {
            await logout();
            setEmail(null);
          }}
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', display: 'flex', gap: 10 }}>
      <button className={ghostClass} onClick={() => setShowForm((s) => !s)}>
        Log in
      </button>
      <button className={primaryClass} onClick={() => setShowForm(true)}>
        Sign up
      </button>
      {showForm && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 8,
            width: 280,
            padding: 16,
            borderRadius: 12,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 50px -20px rgba(0,0,0,0.6)',
            zIndex: 20,
          }}
        >
          {sent ? (
            <div style={{ fontSize: 13.5, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
              Check <strong style={{ color: 'var(--fg)' }}>{inputEmail}</strong> for a login link.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 10 }}>
                No password — we'll email you a login link.
              </div>
              <input
                type="email"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit();
                }}
                placeholder="you@email.com"
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border-2)',
                  background: 'var(--bg)',
                  color: 'var(--fg)',
                  fontSize: 13.5,
                  marginBottom: 8,
                  fontFamily: 'inherit',
                }}
              />
              {error && (
                <div style={{ color: 'var(--error)', fontSize: 12.5, marginBottom: 8 }}>{error}</div>
              )}
              <button
                className="btn btn-primary"
                onClick={submit}
                disabled={busy || !inputEmail.trim()}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {busy ? <span className="spinner" /> : 'Send login link'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
