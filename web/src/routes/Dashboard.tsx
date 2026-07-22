import { useEffect, useState } from 'react';
import Logo from '../components/Logo';
import AuthNav from '../components/AuthNav';
import GalleryGrid from '../components/GalleryGrid';
import { getMe, getMyDecks } from '../lib/auth';
import type { DeckSummary } from '../lib/api';

export default function Dashboard() {
  const [email, setEmail] = useState<string | null>(null);
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe().then((e) => {
      setEmail(e);
      if (!e) {
        setLoading(false);
        return;
      }
      getMyDecks()
        .then(setDecks)
        .catch(() => setDecks([]))
        .finally(() => setLoading(false));
    });
  }, []);

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
        <AuthNav />
      </header>

      <section
        style={{
          maxWidth: 1240,
          width: '100%',
          margin: '0 auto',
          padding: 'clamp(32px, 6vh, 64px) clamp(20px, 5vw, 48px) 80px',
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 22px' }}>
          Your decks
        </h1>

        {loading ? (
          <div style={{ color: 'var(--fg-dim)', fontSize: 14, padding: '40px 0' }}>Loading…</div>
        ) : !email ? (
          <div
            style={{
              border: '1px dashed var(--border-2)',
              borderRadius: 'var(--radius)',
              padding: '48px 24px',
              textAlign: 'center',
              color: 'var(--fg-dim)',
              fontSize: 14,
            }}
          >
            Log in from the home page to see your decks here.
          </div>
        ) : decks.length === 0 ? (
          <div
            style={{
              border: '1px dashed var(--border-2)',
              borderRadius: 'var(--radius)',
              padding: '48px 24px',
              textAlign: 'center',
              color: 'var(--fg-dim)',
              fontSize: 14,
            }}
          >
            No decks yet — describe one from the home page to get started.
          </div>
        ) : (
          <GalleryGrid decks={decks} />
        )}
      </section>
    </div>
  );
}
