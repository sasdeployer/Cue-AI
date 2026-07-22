import { Link } from '@tanstack/react-router';
import { Aperture } from 'lucide-react';

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
        }}
      >
        <Aperture size={size - 3} color="#fff" strokeWidth={2} />
      </span>
      Cue
    </Link>
  );
}
