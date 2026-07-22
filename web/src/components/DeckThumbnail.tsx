import { useEffect, useRef, useState } from 'react';
import DeckPreview from './DeckPreview';

interface Props {
  appTsx: string;
  tokensCss?: string;
}

// Decks are designed at slide scale, not thumbnail scale — render the real
// DeckPreview at a fixed "stage" size and shrink the whole thing with a CSS
// transform, rather than asking the deck to lay out at 280px wide.
const STAGE_W = 1200;
const STAGE_H = 750; // 16:10, matches the card's aspect-ratio

export default function DeckThumbnail({ appTsx, tokensCss }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / STAGE_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 10',
        overflow: 'hidden',
        background: 'var(--bg-2)',
      }}
    >
      {scale > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: STAGE_W,
            height: STAGE_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none', // thumbnail only — clicks go to the card's own Link
          }}
        >
          <DeckPreview appTsx={appTsx} tokensCss={tokensCss} />
        </div>
      )}
    </div>
  );
}
