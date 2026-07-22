import { useEffect, useState } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
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

const HERO_IMAGE = '/hero/umbrella-bridge.webp';

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
    <div style={{ minHeight: '100%' }}>
      {/* hero band — full-bleed background photo, image-only zone */}
      <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: '#111' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${HERO_IMAGE})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 22%',
          }}
        />
        {/* scrim: darkens the nav strip and — more heavily — the lower third,
            so hero copy reads over the canal/bridge instead of competing with
            the umbrella for attention in the photo's visual center */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.05) 22%, rgba(0,0,0,0.1) 42%, rgba(0,0,0,0.6) 66%, rgba(0,0,0,0.72) 100%)',
          }}
        />

        <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          {/* nav */}
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px clamp(20px, 5vw, 48px)',
            }}
          >
            <Logo light />
            <Link to="/dashboard" className="btn btn-ghost btn-ghost-glass">
              Settings
            </Link>
          </header>

          {/* hero copy + prompt — anchored to the lower third, over the darker
              canal/bridge, so it doesn't compete with the umbrella for the eye */}
          <section
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              maxWidth: 780,
              width: '100%',
              margin: '0 auto',
              padding: 'clamp(20px, 5vw, 24px)',
              paddingBottom: 'clamp(48px, 8vh, 88px)',
              animation: 'fadeUp .5s ease both',
            }}
          >
            <h1
              style={{
                fontSize: 'clamp(28px, 4.4vw, 44px)',
                fontWeight: 600,
                letterSpacing: '-0.03em',
                textAlign: 'center',
                color: '#F7F6F2',
                margin: '0 0 8px',
              }}
            >
              Present ideas that move people.
            </h1>
            <p
              style={{
                textAlign: 'center',
                color: 'rgba(247,246,242,0.7)',
                fontSize: 'clamp(14px, 1.8vw, 16px)',
                margin: '0 0 28px',
              }}
            >
              Describe your idea. Cue turns it into a polished, interactive presentation in minutes.
            </p>

            <PromptBox
              onSubmit={start}
              autoFocus
              glass
              placeholder="Describe your deck… e.g. “a pitch for a distributed inference engine”"
            />

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
                <button key={t.label} className="chip chip-glass" onClick={() => start(t.prompt)}>
                  {t.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

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
