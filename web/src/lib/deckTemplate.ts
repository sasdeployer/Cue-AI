// Loads the FIXED bolt-slides engine + component library at build time and turns
// it into a Sandpack files map. The model-generated App.tsx / tokens.css are layered
// on top per deck, so every preview runs the real engine (pixel-identical to the app).
//
// We use Sandpack's in-browser bundler (template "react-ts"), which resolves npm
// deps (framer-motion) from a CDN — no nodebox/Vite VM, so it's fast and avoids the
// nodebox esbuild-wasm/vite-version pitfalls. The deck needs no Vite at runtime.

const srcRaw = import.meta.glob('../deck-template/src/**/*.{ts,tsx,css}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// Remap '../deck-template/src/...' -> '/src/...' for Sandpack's virtual filesystem.
const baseFiles: Record<string, string> = {};
for (const [path, contents] of Object.entries(srcRaw)) {
  baseFiles[path.replace('../deck-template', '')] = contents;
}

function publicHtml(title: string): string {
  const safe = title.replace(/</g, '&lt;');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safe}</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
}

export interface DeckFilesInput {
  appTsx: string;
  tokensCss?: string;
  title?: string;
}

/** Build the complete Sandpack files map for a generated deck. */
export function buildDeckFiles(input: DeckFilesInput): Record<string, string> {
  const files: Record<string, string> = { ...baseFiles };
  files['/src/App.tsx'] = input.appTsx;
  if (input.tokensCss && input.tokensCss.trim()) {
    files['/src/styles/tokens.css'] = input.tokensCss;
  }
  files['/public/index.html'] = publicHtml(input.title || 'Cue deck');
  return files;
}

// Entry is the deck's own main.tsx (mounts <App/> into #root).
export const DECK_ENTRY = '/src/main.tsx';

export const DECK_DEPENDENCIES: Record<string, string> = {
  react: '^18.3.1',
  'react-dom': '^18.3.1',
  'framer-motion': '^11.3.0',
};
