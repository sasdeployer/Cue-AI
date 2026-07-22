import { Link } from '@tanstack/react-router';
import type { DeckSummary } from '../lib/api';
import DeckThumbnail from './DeckThumbnail';

function DeckCard({ deck }: { deck: DeckSummary }) {
  return (
    <Link
      to="/build"
      search={{ deckId: deck.id }}
      style={{
        display: 'block',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        transition: 'border-color .15s ease, transform .12s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-2)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <DeckThumbnail appTsx={deck.appTsx} tokensCss={deck.tokensCss} />
      <div style={{ padding: '12px 14px' }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: 'var(--fg)',
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
            color: 'var(--fg-dim)',
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
