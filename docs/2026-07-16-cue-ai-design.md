# Cue AI — Design (Slice 1)

> **Presentation decks that are working web apps.** One prompt in — your agent builds a
> deck where every slide is a live, responsive web page. 3D, animation, live data,
> working prototypes, and whatever you can imagine. Just tell Cue.

Date: 2026-07-16
Status: approved (slice 1)

## What this is

A v0.dev / Lovable-style product for building **bolt-slides decks** from a prompt.
The key simplification vs. a general codegen tool: the generated artifact is *always
the same shape* — a bolt-slides deck. The engine (`deck-template/src/deck/`), the
~30-component library (`deck-template/src/components/`), and the base CSS are **fixed**.
The model only writes, per prompt:

- `src/App.tsx` — the slide content (JSX composed from the fixed component library)
- `src/styles/tokens.css` — the theme (`:root` tokens only)
- `index.html` `<title>` + favicon emoji

That bounded surface is what makes reliable generation + live preview tractable.

## Architecture

```
web/  (Vite + React + TanStack Router)          server/ (Gin / Go)          Postgres + pgvector
─────────────────────────────────────           ──────────────────          ───────────────────
Landing  : v0-style hero prompt + gallery   ─▶  POST /api/decks (SSE)   ─▶  decks(id, owner,
Builder  : chat (left) | Sandpack (right)        generate via Claude          title, prompt,
Preview  : REAL deck engine, live               (SKILL.md = system)          app_tsx, tokens_css,
                                                 GET  /api/decks (list)       is_public, embedding)
                                                 GET  /api/decks/:id
```

### Live preview — Sandpack (remote bundler)

`@codesandbox/sandpack-react`, `template: vite-react-ts`. We inject the fixed deck
files (loaded at build time via `import.meta.glob('.../deck-template/**', {query:'?raw'})`)
plus the generated `App.tsx` / `tokens.css`. Sandpack bundles + hot-reloads in an
isolated iframe, so each preview is self-contained (works for the gallery). Because it
runs the *real* engine files, the preview is pixel-identical to `npm run dev` on the deck.

### Backend

- `LLMClient` interface → `AnthropicClient` (Claude). Swappable for Nexlayer's model later.
- System prompt = the bundled `SKILL.md` (go:embed) + a compact component-API reference.
- If `ANTHROPIC_API_KEY` is unset, a **canned generator** returns a themed sample deck so
  the whole app is demoable with zero keys. With a key, real generation.
- `pgx` + `pgvector` for storage; embedding for gallery + semantic search (later).

### Data model (slice 1)

```sql
decks(
  id uuid pk, owner text default 'anon', title text, prompt text,
  app_tsx text, tokens_css text, is_public bool default true,
  embedding vector(1536), created_at timestamptz default now()
)
```

`is_public` + `owner` exist now; free = public, paid = private is a later slice.

## Slice 1 scope

**In:** monorepo, docker pgvector, Gin generate/list/get, landing (hero + gallery),
builder (chat ↔ live Sandpack preview), canned + real Claude generation.

**Out (next slices):** auth/accounts, free/paid privacy toggle, billing, image
generation, semantic gallery search UI, deck editing/versioning.

## Local run

```
docker compose up -d db          # pgvector on :5432
cd server && go run .            # Gin on :8080  (reads ../.env)
cd web && npm run dev            # Vite on :5173
```
