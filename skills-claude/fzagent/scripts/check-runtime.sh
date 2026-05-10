#!/usr/bin/env bash
# check-runtime.sh — verifica pre-requisitos para a skill fzagent.
set -euo pipefail

err=0

if ! command -v fzagent >/dev/null 2>&1 && [ ! -x packages/cli/dist/cli.js ]; then
  echo "ERR: fzagent CLI nao encontrado — rode 'npm install && npm run build'"
  err=1
fi

if [ ! -d wiki ]; then
  echo "WARN: pasta wiki/ nao existe — sera criada no primeiro ingest"
fi

if [ ! -f .env ]; then
  echo "WARN: .env ausente — copie de .env.example"
fi

if [ ! -f fzagent.conf ] && [ ! -f fzagent.conf.example ]; then
  echo "WARN: nenhum fzagent.conf — usando defaults"
fi

# Qdrant ping
QDRANT_URL=${QDRANT_URL:-http://localhost:6333}
if ! curl -sf --max-time 3 "$QDRANT_URL/" >/dev/null 2>&1; then
  echo "WARN: Qdrant ($QDRANT_URL) nao responde — query semantica vai falhar"
fi

if [ "$err" -eq 0 ]; then
  echo "OK: runtime checks passaram (com possiveis warnings)"
fi
exit $err
