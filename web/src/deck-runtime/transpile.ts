import { transform } from 'sucrase'
import type { ComponentType } from 'react'
import { registry } from './registry.gen'

const reg = registry as Record<string, unknown>

// Phase 1 security boundary: generated decks may only import the fixed engine
// surface baked into `registry`. Anything else throws. Specifiers are matched
// leniently on the `./` prefix so e.g. `deck/Deck` resolves like `./deck/Deck`.
function requireShim(spec: string): unknown {
  const base = spec.replace(/\.(tsx|ts|jsx|js)$/, '')
  const bare = base.replace(/^\.\//, '')
  for (const key of [base, './' + bare, bare]) {
    if (Object.prototype.hasOwnProperty.call(reg, key)) return reg[key]
  }
  throw new Error('Deck import not allowed: "' + spec + '"')
}

export function transpileDeck(
  appTsx: string,
): { ok: true; App: ComponentType } | { ok: false; error: string } {
  try {
    const { code } = transform(appTsx, {
      transforms: ['typescript', 'jsx', 'imports'],
      production: true,
    })
    // Sucrase's classic JSX emits React.createElement; inject React so decks
    // that never import it still resolve.
    const React = (reg['react'] as { default: unknown }).default
    const mod = { exports: {} as Record<string, unknown> }
    const fn = new Function('require', 'module', 'exports', 'React', code)
    fn(requireShim, mod, mod.exports, React)
    // Accept function components AND object component types (React.memo /
    // forwardRef / lazy return objects). A truly invalid default falls through
    // to a runtime error the ErrorBoundary reports.
    const App = mod.exports.default
    if (App == null || (typeof App !== 'function' && typeof App !== 'object')) {
      return { ok: false, error: 'deck has no default-exported component' }
    }
    return { ok: true, App: App as ComponentType }
  } catch (err) {
    return { ok: false, error: String((err as { message?: unknown })?.message ?? err) }
  }
}
