<div align="center">

# ⚡ Cue AI

**Presentation decks that are working web apps.**

One prompt in — Cue builds a deck where every slide is a live, responsive web page.
3D, animation, live data, working prototypes, and whatever you can imagine. Just tell Cue.

</div>

---

Cue is a v0.dev / Lovable-style product for **decks**: type a prompt on the landing page,
and Cue generates a [bolt-slides](https://github.com/stackblitz/bolt-slides) deck — chat on
the left, a live preview of the deck on the right, full-screen when you want it. Public decks
show up in the community gallery; paid, private decks are a later slice.

## Stack

| Layer     | Tech |
|-----------|------|
| Frontend  | React + Vite + TanStack Router; live preview via Sandpack (in-browser bundler) |
| Backend   | Go + Gin — streams generation over SSE |
| Database  | Postgres + pgvector (deck store + embeddings for gallery search) |
| Deck engine | The bolt-slides engine + component library (fixed); the model authors `App.tsx` + `tokens.css` |

The generated artifact is always the same shape — a bolt-slides deck — so the model only
writes the slide content (`App.tsx`) and theme (`tokens.css`), which is what makes reliable
generation + live preview tractable.

## Run it locally

Prereqs: **Docker**, **Go 1.22+**, **Node 20+**.

```bash
./dev.sh
```

That brings up Postgres+pgvector (Docker), the Gin server (`:8080`), and the web app
(`:5273`). Open **http://localhost:5273**.

Or run each piece by hand:

```bash
docker compose up -d db                 # Postgres + pgvector on :5432
cd server && go run .                    # Gin API on :8080 (reads ../.env)
cd web && npm install && npm run dev     # web on :5273
```

## AI generation

Without a key, the server runs in **canned mode** — it returns a valid sample deck so the
whole app is demoable. For real AI-authored decks, add your key to `.env` (repo root):

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-5
```

then restart the server. The model is called with the bolt-slides authoring guide
(`.bolt/skills/slides/SKILL.md`) as its system prompt. `server/llm.go` puts this behind an
`LLMClient` interface, so the provider is swappable.

## Layout

```
web/                 React product app (landing, builder, gallery)
  src/deck-template/  the FIXED bolt-slides engine — loaded into Sandpack for the preview
server/              Gin API: generate (SSE) / list / get; Anthropic + canned clients
db/init.sql         schema (decks + pgvector)
docker-compose.yml  Postgres + pgvector
docs/               design spec
```

See `docs/2026-07-16-cue-ai-design.md` for the full design.
