import { Link } from '@tanstack/react-router';

export default function Logo({ size = 20, light }: { size?: number; light?: boolean }) {
  return (
    <Link
      to="/"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontWeight: 650,
        fontSize: size,
        letterSpacing: '-0.02em',
        color: light ? '#F7F6F2' : undefined,
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-grid',
          placeItems: 'center',
          width: size + 8,
          height: size + 8,
          borderRadius: 8,
          background: 'var(--accent)',
          color: 'var(--accent-ink)',
          fontSize: size - 3,
        }}
      >
        ⚡
      </span>
      Cue<span style={{ color: light ? 'rgba(247,246,242,0.55)' : 'var(--fg-dim)', fontWeight: 500 }}>AI</span>
    </Link>
  );
}
