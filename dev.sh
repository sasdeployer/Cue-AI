#!/usr/bin/env bash
# Cue AI — run the whole stack locally (db + server + web).
# Usage: ./dev.sh
set -euo pipefail
cd "$(dirname "$0")"

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# Keep the AI's reference in sync with the CANONICAL repo files so every generation
# uses the current slides skill, tokens, and component APIs — and the Sandpack preview
# runs the current engine. The .bolt skill + src/ are the single source of truth.
echo "▸ syncing slides skill + engine reference…"
cp .bolt/skills/slides/SKILL.md server/reference/SKILL.md
cp src/styles/tokens.css       server/reference/tokens.default.css
ls src/components > server/reference/components.list.txt
python3 - <<'PY'
import glob, os
parts=[]
for f in sorted(glob.glob('src/deck/Slide.tsx')+glob.glob('src/deck/Build.tsx')
                +glob.glob('src/deck/Reveal.tsx')+glob.glob('src/components/*.tsx')):
    parts.append(f"// ===== {os.path.basename(f)} =====\n"+open(f).read().rstrip())
open('server/reference/components.full.txt','w').write("\n\n".join(parts))
PY
rsync -a --delete src/ web/src/deck-template/src/   # Sandpack preview = current engine
echo "  reference in sync with .bolt skill + src/."

echo "▸ starting Postgres + pgvector (docker)…"
docker compose up -d db
until [ "$(docker inspect --format '{{.State.Health.Status}}' cueai-db 2>/dev/null)" = "healthy" ]; do
  sleep 1
done
echo "  db healthy."

echo "▸ starting Gin server on :8080…"
( cd server && go run . ) &
SERVER_PID=$!

echo "▸ starting web on :5273…"
( cd web && npm run dev ) &
WEB_PID=$!

trap 'echo; echo "stopping…"; kill $SERVER_PID $WEB_PID 2>/dev/null; exit 0' INT TERM
echo
echo "  Cue AI → http://localhost:5273"
echo "  (Ctrl-C to stop server + web; db keeps running — 'docker compose down' to stop it.)"
wait
