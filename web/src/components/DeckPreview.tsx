import { useCallback, useEffect, useRef, useState } from 'react';
import { isRuntimeMessage } from '../deck-runtime/protocol';

interface Props {
  appTsx: string;
  tokensCss?: string;
  title?: string;
}

interface RenderError {
  phase: 'compile' | 'runtime';
  message: string;
}

/**
 * Hosts the same-origin deck-runtime iframe and drives it over the cue-* postMessage
 * protocol. The iframe stays mounted across prop changes so hot-swaps preserve the
 * current slide; theme-only changes take the no-transpile fast path.
 */
export default function DeckPreview({ appTsx, tokensCss = '', title }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const lastAppTsx = useRef<string | null>(null);
  const lastTokensCss = useRef<string | null>(null);
  // Latest props, so the message handler never posts stale content (its closure
  // is created once but props change over time).
  const appTsxRef = useRef(appTsx);
  appTsxRef.current = appTsx;
  const tokensCssRef = useRef(tokensCss);
  tokensCssRef.current = tokensCss;

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<RenderError | null>(null);

  // Post the appropriate message for the CURRENT props (read from refs). Stable
  // identity so effects and the message handler share one implementation.
  const push = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const app = appTsxRef.current;
    const tokens = tokensCssRef.current;
    const themeOnly = app === lastAppTsx.current && tokens !== lastTokensCss.current;
    setError(null); // optimistic: a fresh render clears the prior failure
    win.postMessage(
      themeOnly
        ? { type: 'cue-theme', tokensCss: tokens }
        : { type: 'cue-render', appTsx: app, tokensCss: tokens },
      '*',
    );
    lastAppTsx.current = app;
    lastTokensCss.current = tokens;
  }, []);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (!isRuntimeMessage(e.data)) return;
      switch (e.data.type) {
        case 'cue-ready':
          if (readyRef.current) break; // idempotent: poll may re-announce
          readyRef.current = true;
          setReady(true);
          lastAppTsx.current = null; // force a full render for the first paint
          lastTokensCss.current = null;
          push();
          break;
        case 'cue-ok':
          setError(null);
          break;
        case 'cue-error':
          setError({ phase: e.data.phase, message: e.data.message });
          break;
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [push]);

  // Prop changes after the iframe is ready → push a render/theme update.
  useEffect(() => {
    if (readyRef.current) push();
  }, [appTsx, tokensCss, push]);

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-2)' }}>
      <iframe
        ref={iframeRef}
        src="/deck-runtime.html"
        title="Deck preview"
        sandbox="allow-scripts allow-same-origin"
        // Handshake recovery: once the doc has loaded, poll for readiness in case
        // the runtime's initial cue-ready fired before our listener was attached.
        onLoad={() => iframeRef.current?.contentWindow?.postMessage({ type: 'cue-poll' }, '*')}
        style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
      />
      {!ready && !error && <LoadingOverlay />}
      {error && <ErrorOverlay error={error} title={title} />}
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg-2)',
        color: 'var(--fg-muted)',
        fontSize: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="spinner" /> Loading preview…
      </div>
    </div>
  );
}

function ErrorOverlay({ error, title }: { error: RenderError; title?: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg-2)',
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: '100%',
          background: 'var(--error-bg)',
          border: '1px solid color-mix(in srgb, var(--error) 35%, transparent)',
          borderRadius: 12,
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ color: 'var(--error)', fontSize: 15, fontWeight: 600 }}>
            Deck failed to render
          </span>
          <span style={{ color: 'var(--fg-dim)', fontSize: 12 }}>({error.phase})</span>
        </div>
        {title && (
          <div style={{ color: 'var(--fg-muted)', fontSize: 13, marginBottom: 10 }}>{title}</div>
        )}
        <pre
          style={{
            margin: 0,
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 12.5,
            lineHeight: 1.5,
            color: 'color-mix(in srgb, var(--error) 80%, var(--fg-muted) 20%)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 260,
            overflow: 'auto',
          }}
        >
          {error.message}
        </pre>
      </div>
    </div>
  );
}
