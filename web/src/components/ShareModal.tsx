import { useState } from 'react';

interface Props {
  url: string;
  title: string;
  onClose: () => void;
}

// Every deck is already public the moment it's generated (no draft/private
// state) — this is purely about surfacing the shareable link, not gating
// visibility. Share and Publish both open this same dialog; Publish is just
// the more prominent first-time framing.
export default function ShareModal({ url, title, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440,
          maxWidth: '90vw',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Share this deck</div>
        <div
          style={{
            fontSize: 13.5,
            color: 'var(--fg-muted)',
            marginBottom: 18,
            lineHeight: 1.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          Anyone with this link can view and remix &ldquo;{title}&rdquo;.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            style={{
              flex: 1,
              minWidth: 0,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-2)',
              background: 'var(--bg)',
              color: 'var(--fg-muted)',
              fontSize: 13,
              fontFamily: 'var(--mono)',
            }}
          />
          <button className="btn btn-primary" onClick={copy} style={{ flexShrink: 0 }}>
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
        <button
          className="btn btn-ghost"
          onClick={onClose}
          style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
