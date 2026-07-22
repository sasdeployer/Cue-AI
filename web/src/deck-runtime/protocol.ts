// Messages exchanged between DeckPreview (parent) and the deck-runtime iframe.
// Every payload's `type` is prefixed `cue-`; frames are same-origin.

export type ParentToRuntime =
  | { type: 'cue-render'; appTsx: string; tokensCss: string }
  | { type: 'cue-theme'; tokensCss: string }
  | { type: 'cue-poll' } // parent asks the runtime to (re)announce readiness

export type RuntimeToParent =
  | { type: 'cue-ready' }
  | { type: 'cue-ok' }
  | { type: 'cue-error'; phase: 'compile' | 'runtime'; message: string }

export function isRuntimeMessage(data: unknown): data is RuntimeToParent {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as { type?: unknown }).type === 'string' &&
    (data as { type: string }).type.startsWith('cue-')
  )
}
