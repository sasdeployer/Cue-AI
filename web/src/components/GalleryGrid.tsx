import { Link } from '@tanstack/react-router';
import type { DeckSummary } from '../lib/api';

// deterministic gradient from an id so cards feel distinct but stable
function gradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  const h2 = (h + 40) % 360;
  return `radial-gradient(120% 120% at 20% 10%, hsl(${h} 55% 22%), transparent 60%), radial-gradient(120% 120% at 90% 90%, hsl(${h2} 50% 16%), #0c0c0e 70%)`;
}

function DeckCard({ deck }: { deck: DeckSummary }) {
  return (
    <Link
      to="/build"
      search={{ deckId: deck.id }}
      style={{
        display: 'block',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        background: '#212120',
        transition: 'border-color .15s ease, transform .12s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div
        style={{
          aspectRatio: '16 / 10',
          background: gradient(deck.id),
          display: 'grid',
          placeItems: 'center',
          padding: 20,
        }}
      >
        <div
          style={{
            fontSize: 'clamp(15px, 2.4vw, 20px)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            textAlign: 'center',
            lineHeight: 1.25,
            color: '#f4f4f5',
            textShadow: '0 2px 20px rgba(0,0,0,0.5)',
          }}
        >
          {deck.title}
        </div>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: '#F7F6F2',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {deck.title}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: 'rgba(247,246,242,0.55)',
            marginTop: 3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {deck.prompt}
        </div>
      </div>
    </Link>
  );
}

export default function GalleryGrid({ decks }: { decks: DeckSummary[] }) {
  if (decks.length === 0) {
    return (
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
        No decks yet — be the first. Type a prompt above to create one.
      </div>
    );
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
        gap: 18,
      }}
    >
      {decks.map((d) => (
        <DeckCard key={d.id} deck={d} />
      ))}
    </div>
  );
}
