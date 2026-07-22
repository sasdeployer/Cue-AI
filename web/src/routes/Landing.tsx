import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import Logo from '../components/Logo';
import PromptBox from '../components/PromptBox';
import GalleryGrid from '../components/GalleryGrid';
import { listDecks, type DeckSummary } from '../lib/api';

const TEMPLATES: { label: string; prompt: string }[] = [
  { label: 'Pitch deck', prompt: 'A YC-level pitch deck for a startup building an AI copilot for accountants.' },
  { label: 'Product launch', prompt: 'A product launch deck announcing a new realtime collaboration feature.' },
  { label: 'Conference talk', prompt: 'A conference talk on why every slide should be a working web page.' },
  { label: 'Investor update', prompt: 'A monthly investor update deck: metrics, wins, asks.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDecks()
      .then(setDecks)
      .catch(() => setDecks([]))
      .finally(() => setLoading(false));
  }, []);

  const start = (prompt: string) => navigate({ to: '/build', search: { prompt } });

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* nav */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px clamp(20px, 5vw, 48px)',
        }}
      >
        <Logo />
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost">Log in</button>
          <button className="btn btn-primary">Sign up</button>
        </div>
      </header>

      {/* hero */}
      <section
        style={{
          maxWidth: 780,
          width: '100%',
          margin: '0 auto',
          padding: 'clamp(40px, 9vh, 96px) clamp(20px, 5vw, 24px) 0',
          animation: 'fadeUp .5s ease both',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(28px, 4.4vw, 44px)',
            fontWeight: 600,
            letterSpacing: '-0.03em',
            textAlign: 'center',
            margin: '0 0 8px',
          }}
        >
          Every great presentation starts with a cue.
        </h1>
        <p
          style={{
            textAlign: 'center',
            color: 'var(--fg-muted)',
            fontSize: 'clamp(14px, 1.8vw, 16px)',
            margin: '0 0 28px',
          }}
        >
          Describe your idea. Cue turns it into a polished, interactive presentation in minutes.
        </p>

        <PromptBox onSubmit={start} autoFocus placeholder="Describe your deck… e.g. “a pitch for a distributed inference engine”" />

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'center',
            marginTop: 20,
          }}
        >
          {TEMPLATES.map((t) => (
            <button key={t.label} className="chip" onClick={() => start(t.prompt)}>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* gallery */}
      <section
        style={{
          maxWidth: 1240,
          width: '100%',
          margin: '0 auto',
          padding: 'clamp(48px, 10vh, 100px) clamp(20px, 5vw, 48px) 80px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 22,
          }}
        >
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
            From the community
          </h2>
          <span style={{ fontSize: 13, color: 'var(--fg-dim)' }}>
            Public decks · free to remix
          </span>
        </div>
        {loading ? (
          <div style={{ color: 'var(--fg-dim)', fontSize: 14, padding: '40px 0' }}>Loading…</div>
        ) : (
          <GalleryGrid decks={decks} />
        )}
      </section>
    </div>
  );
}
