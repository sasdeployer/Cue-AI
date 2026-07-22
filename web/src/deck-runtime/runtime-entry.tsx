import '../deck-template/src/styles/base.css'
import '../deck-template/src/styles/tokens.css'
import { Component, type ComponentType, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { transpileDeck } from './transpile'
import type { ParentToRuntime, RuntimeToParent } from './protocol'

function post(msg: RuntimeToParent) {
  window.parent.postMessage(msg, '*')
}

class ErrorBoundary extends Component<
  { children: ReactNode; onError: (message: string) => void },
  { hasError: boolean }
> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: Error) {
    this.props.onError(error.message)
  }
  render() {
    return this.state.hasError ? null : this.props.children
  }
}

let tokensEl = document.getElementById('deck-tokens') as HTMLStyleElement | null
function setTheme(css: string) {
  if (!tokensEl) {
    tokensEl = document.createElement('style')
    tokensEl.id = 'deck-tokens'
    document.head.appendChild(tokensEl)
  }
  tokensEl.textContent = css
}

const root = createRoot(document.getElementById('root')!)
let currentApp: ComponentType | null = null
let boundaryKey = 0
let errored = false

function render() {
  if (!currentApp) return
  const App = currentApp
  errored = false
  // A fresh boundary key remounts on every content swap, clearing prior error
  // state. flushSync forces the commit so a render throw is caught before we
  // report success.
  flushSync(() => {
    root.render(
      <ErrorBoundary
        key={++boundaryKey}
        onError={(message) => {
          errored = true
          post({ type: 'cue-error', phase: 'runtime', message })
        }}
      >
        <App />
      </ErrorBoundary>,
    )
  })
  if (!errored) post({ type: 'cue-ok' })
}

window.addEventListener('message', (e: MessageEvent) => {
  const data = e.data as ParentToRuntime
  if (!data || typeof data.type !== 'string' || !data.type.startsWith('cue-')) return
  switch (data.type) {
    case 'cue-render': {
      setTheme(data.tokensCss)
      const r = transpileDeck(data.appTsx)
      if (!r.ok) {
        post({ type: 'cue-error', phase: 'compile', message: r.error })
        return
      }
      currentApp = r.App
      render()
      break
    }
    case 'cue-theme': {
      // Fast path: swap tokens only, no re-render, so slide state is preserved.
      setTheme(data.tokensCss)
      post({ type: 'cue-ok' })
      break
    }
    case 'cue-poll': {
      // Handshake recovery: the parent missed our initial cue-ready.
      post({ type: 'cue-ready' })
      break
    }
  }
})

post({ type: 'cue-ready' })
