import { Link } from '@tanstack/react-router';

export default function Logo({ size = 20 }: { size?: number }) {
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
          background: 'var(--fg)',
          color: '#000',
          fontSize: size - 3,
        }}
      >
        ⚡
      </span>
      Cue<span style={{ color: 'var(--fg-dim)', fontWeight: 500 }}>AI</span>
    </Link>
  );
}
