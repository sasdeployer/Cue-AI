# Cue-AI core rebrand — off-white + electric orange

Status: approved
Date: 2026-07-22

## Context

Cue-AI's product chrome (landing page, builder shell, gallery) currently uses a
pure-black / cyan (`#21B7CB`) dark theme. This spec rebrands the chrome to a
warm off-white + electric-orange identity, and recasts loading/status copy in
a cinematic ("cue" as in stage direction) voice, per the brand direction Sal
provided 2026-07-22.

**Explicitly out of scope:**
- **Logo mark redesign.** Several concepts were sketched (cue light, spotlight-C,
  playhead) but none chosen. That's a separate visual-design session. This pass
  only re-colors the *existing* logo badge so it doesn't break under the new
  tokens — it does not introduce a new mark.
- **Generated decks' own default theme** (`src/styles/tokens.css`,
  `src/styles/base.css`, mirrored into `server/reference/engine` and
  `web/src/deck-template`). That theme is deliberately per-prompt — the model
  picks colors per deck — and must not be forced into Cue's own brand colors.

## Token changes

`web/src/index.css` `:root` — replace the dark palette with:

```css
--bg: #F7F6F2;
--bg-1: #FBFAF8;      /* slightly lighter, for nested/raised surfaces */
--bg-2: #EFEDE7;      /* builder preview pane backdrop */
--surface: #FFFFFF;
--surface-2: #FBFAF8;
--border: #E4E0D6;    /* derived from --muted, hairline */
--border-2: #D8D2C4;  /* derived from --muted, stronger hairline */
--fg: #111111;
--fg-muted: #5C5A54;
--fg-dim: #8A877E;
--accent: #FF6A00;
--accent-2: #FFB347;  /* hover/gradient on accent, "secondary accent" */
--accent-ink: #FFF8F0; /* text/icon color placed on top of --accent surfaces */
--muted: #EAE7DF;     /* card backgrounds, dividers */
```

`--radius`, `--radius-lg`, `--font`, `--mono` are unchanged.

Error red (currently `#f87171` / `#fca5a5`, Tailwind red-400/300 — tuned for
dark backgrounds) becomes:

```css
--error: #D64545;
--error-bg: #FBE8E6; /* light wash for error borders/backgrounds */
```

## Hardcoded-color audit (why this isn't just a 4-variable swap)

| File | Current | Problem | Fix |
|---|---|---|---|
| `components/Logo.tsx` | badge `background: var(--fg)`, icon `color: '#000'` | `--fg` flips to near-black → badge goes near-black with a near-black icon on it (invisible) | badge `background: var(--accent)`, icon `color: var(--accent-ink)` — ties the mark to the new accent instead of inverted foreground |
| `components/GalleryGrid.tsx:9` | dark radial-gradient thumbnail (`hsl(... 22%)`, `#0c0c0e`) | — | **kept as-is.** Dark per-deck gradient tiles read as intentional "framed slide" cards against the new light chrome (same pattern as dark media tiles in light-mode editors) |
| `components/GalleryGrid.tsx:50-51` | `color: '#f4f4f5'`, `textShadow: rgba(0,0,0,0.5)` | title text sits on the (still-dark) gradient tile, not the page background | unchanged — still correct against the dark tile |
| `components/DeckPreview.tsx:139,145,159` | `#f8717133` border, `#f87171` / `#fca5a5` text | red-on-dark tuned; fails contrast on off-white | border → `var(--error-bg)` w/ 1px `var(--error)` at low opacity; text → `var(--error)` |
| `routes/Builder.tsx:242` | fullscreen overlay `background: '#000'` | — | **kept as-is, deliberately.** Theater-mode dimming for the cinematic direction (see Context) |
| `routes/Builder.tsx:307` | `color: '#f87171'` | same red issue | → `var(--error)` |
| `components/StepGroup.tsx:45,51` | `#f87171` for error status | same red issue | → `var(--error)` |
| `components/PromptBox.tsx:47` | `boxShadow: '0 12px 40px -12px rgba(0,0,0,0.6)'` | harsh black shadow reads muddy on light bg | → `'0 12px 40px -12px rgba(17,17,17,0.16)'` |
| `components/PromptBox.tsx:108` | `color: value.trim() ? '#000' : 'var(--fg-dim)'` (send-button icon on `--fg` background) | `--fg` is near-black already; icon needs to read on it | → `var(--accent-ink)` when active (button bg becomes accent — see below), `var(--fg-dim)` otherwise |

`PromptBox`'s send button and `.btn-primary` currently use `background: var(--fg)`
(near-black button, standard "primary" affordance). Per the brand direction
("orange is the cue"), the primary send action becomes the accent color:
`.btn-primary` → `background: var(--accent); color: var(--accent-ink)`,
hover → `var(--accent-2)`. `PromptBox`'s send button follows the same rule.

## Copy changes

**Landing hero** (`routes/Landing.tsx`):
- H1: `What do you want to present?` → `Every great presentation starts with a cue.`
- Subhead: `One prompt in — Cue builds a deck where every slide is a live, responsive web page.` → `Describe your idea. Cue turns it into a polished, interactive presentation in minutes.`

**Status copy** (`routes/Builder.tsx`):
- Status pill: `Building…` → `Taking the cue…`
- Empty-state: `Building your deck…` → `Taking the cue…`
- Completion fallback (only shown when the model returns no message): `Here's your deck.` → `Ready for the stage.`

**Step-feed labels** — these are real pipeline steps (not decorative), so the
relabel keeps them truthful while recasting the phrasing:

| File:line | Current | New |
|---|---|---|
| `server/handlers.go` | `"Designing the deck"` | `"Setting the scene"` |
| `server/handlers.go` | `"Reworking the deck"` | `"Calling for a retake"` |
| `server/handlers.go` | `"Fixing compile errors"` | `"Retake"` |
| `server/handlers.go` | `"Writing tokens.css"` | `"Lighting the set"` |
| `server/handlers.go` | `"Writing App.tsx"` | `"Blocking the shot"` |
| `server/handlers.go` | `"Type-checking deck"` | `"Rolling tape"` |
| `server/agent.go` | `"Fetching " + host` | `"Researching " + host` |
| `server/agent.go` | `"Couldn't reach " + host` | unchanged |
| `server/agent.go` | `"Read " + host` | unchanged |

## Motion

`components/StepGroup.tsx`: the in-flight indicator (currently the shared
`.spinner` rotating-ring class) becomes a pulsing solid dot in `--accent`,
closer to a "cue light" than a generic loading spinner:

```css
.cue-pulse {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--accent);
  animation: cuePulse 1.1s ease-in-out infinite;
}
@keyframes cuePulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.8); }
}
```

This is scoped to `StepGroup` only. The shared `.spinner` class stays as-is
(still used by `PromptBox`'s send-button busy state and the top-level
`ChatBubble` streaming indicator) — recolored implicitly since it derives from
`var(--fg)`, no dedicated fix needed there beyond the token swap.

## Testing / verification

- `tsc --noEmit` on `web/` after all edits (no type changes expected, but
  confirms no accidental breakage).
- `go build ./...` on `server/` after the label-string edits.
- Boot the stack (`./dev.sh`, already running) and drive one real generation
  through the browser via Playwright — screenshot the landing page and the
  builder mid-generation (step feed visible) — same verification pattern used
  for the step-feed feature earlier this session.
- Visual check: confirm the logo badge is legible, error states are legible,
  and the fullscreen theater-mode overlay still looks intentional (not broken).
