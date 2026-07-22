<div align="center">

# Cue

**Presentation decks that are working web apps.**

One prompt in — Cue builds a deck where every slide is a live, responsive web page.
3D, animation, live data, working prototypes, and whatever you can imagine. Just tell Cue.

</div>

---

Cue is a v0.dev / Lovable-style product for **decks**: describe what you want on the
landing page, and Cue generates a [bolt-slides](https://github.com/stackblitz/bolt-slides)
deck — chat on the left, a live preview of the deck on the right, full-screen when you
want it, streamed step-by-step as it's built. Every deck is public and shows up in the
community gallery with a real live-rendered preview — Cue is open source and has no
accounts; see **BYOK** below for using your own API key instead of the shared default.

## Stack

| Layer     | Tech |
|-----------|------|
| Frontend  | React + Vite + TanStack Router; live preview via a same-origin in-browser transpile+render runtime |
| Backend   | Go + Gin — streams generation over SSE, including a live agent step feed |
| Database  | Postgres + pgvector (deck store + embeddings for future gallery search) |
| Deck engine | The bolt-slides engine + component library (fixed); the model authors `App.tsx` + `tokens.css` |

The generated artifact is always the same shape — a bolt-slides deck — so the model only
writes the slide content (`App.tsx`) and theme (`tokens.css`), which is what makes reliable
generation + live preview tractable. Generation runs a compile-check + retry loop
(`server/compile.go`) so broken output never reaches the user as a blank pane.

## Run it locally

Prereqs: **Docker** (must be running before `./dev.sh` — it waits on the Postgres
container), **Go 1.22+**, **Node 20+**.

```bash
./dev.sh
```

That brings up Postgres+pgvector (Docker), the Gin server (`:8080`), and the web app
(`:5273`), and re-syncs the deck engine reference on every start. Open **http://localhost:5273**.

Or run each piece by hand:

```bash
docker compose up -d db                 # Postgres + pgvector on :5432
cd server && go run .                    # Gin API on :8080 (reads ../.env)
cd web && npm install && npm run dev     # web on :5273
```

## AI generation

Without a key, the server runs in **canned mode** — it returns a valid sample deck so the
whole app is demoable. For real AI-authored decks, copy `.env.example` to `.env` (repo
root) and add a key:

```
OPENAI_API_KEY=sk-...        # preferred if both are set
OPENAI_MODEL=gpt-5.2
ANTHROPIC_API_KEY=sk-ant-...  # used if no OpenAI key
ANTHROPIC_MODEL=claude-sonnet-5
```

then restart the server. `server/llm.go` puts this behind an `LLMClient` interface, so
the provider is swappable; `server/agent.go` runs an actual tool-using agent loop (not
just a single completion call) and streams its real activity as a step feed in the UI.

### BYOK (bring your own key)

The key above is the server's *default* — anyone using the app can instead add their own
OpenAI or Anthropic key from the **Settings** page (`/dashboard`). It's encrypted with
Web Crypto before it ever touches `localStorage`, decrypted only in-browser, and sent
per-request as an `X-User-OpenAI-Key` / `X-User-Anthropic-Key` header — the server never
logs or stores it, just uses it to build a one-off client for that single request.

## Layout

```
web/                       React product app (landing, builder, gallery)
  src/deck-runtime/         same-origin transpile+render runtime for the live preview
  src/deck-template/        the FIXED bolt-slides engine, synced by dev.sh
server/                    Gin API: generate (SSE + step feed) / list / get / edit
  agent.go                  tool-using LLM agent loop
  compile.go                compile-check before a deck is ever shown
db/init.sql                schema (decks + pgvector)
docker-compose.yml         Postgres + pgvector
docs/                      design specs
```

See **`CLAUDE.md`** for full architecture detail, current branding/theme state, known
gotchas, and what's explicitly deferred — read that before making assumptions about
what's already built.
