import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { verifyMagicLink } from '../lib/auth';

export default function AuthVerify() {
  const { token } = useSearch({ from: '/auth/verify' });
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // StrictMode double-run guard
    started.current = true;

    if (!token) {
      setError('Missing login token.');
      return;
    }
    verifyMagicLink(token)
      .then(() => navigate({ to: '/dashboard' }))
      .catch((e) => setError(e instanceof Error ? e.message : 'Login failed.'));
  }, [token, navigate]);

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--fg-muted)',
        fontSize: 14,
        padding: 24,
        textAlign: 'center',
      }}
    >
      {error ? (
        <div>
          <div style={{ color: 'var(--error)', marginBottom: 8 }}>{error}</div>
          <a href="/" style={{ color: 'var(--accent)' }}>Back to Cue</a>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="spinner" /> Logging you in…
        </div>
      )}
    </div>
  );
}
