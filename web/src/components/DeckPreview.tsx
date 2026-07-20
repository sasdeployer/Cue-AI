import { SandpackProvider, SandpackPreview } from '@codesandbox/sandpack-react';
import { useMemo } from 'react';
import { buildDeckFiles, DECK_ENTRY, DECK_DEPENDENCIES } from '../lib/deckTemplate';

interface Props {
  appTsx: string;
  tokensCss?: string;
  title?: string;
}

/**
 * Renders a generated deck live using the real bolt-slides engine via Sandpack's
 * in-browser bundler. framer-motion resolves from CDN; the preview runs the real
 * engine files, so it's pixel-identical to `npm run dev` on the deck.
 */
export default function DeckPreview({ appTsx, tokensCss, title }: Props) {
  const files = useMemo(
    () => buildDeckFiles({ appTsx, tokensCss, title }),
    [appTsx, tokensCss, title],
  );

  return (
    <SandpackProvider
      template="react-ts"
      files={files}
      customSetup={{ entry: DECK_ENTRY, dependencies: DECK_DEPENDENCIES }}
      options={{ recompileMode: 'delayed', recompileDelay: 400 }}
      style={{ height: '100%', width: '100%' }}
    >
      <SandpackPreview
        showNavigator={false}
        showOpenInCodeSandbox={false}
        showRefreshButton
        style={{ height: '100%', width: '100%' }}
      />
    </SandpackProvider>
  );
}
