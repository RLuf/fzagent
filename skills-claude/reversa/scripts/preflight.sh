#!/usr/bin/env bash
# preflight.sh — checa pre-requisitos antes de instalar reversa.
set -euo pipefail

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "ERR: Node 18+ requerido (atual: $(node -v 2>/dev/null || echo 'nao instalado'))"
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "WARN: git nao encontrado — recovery dificil"
fi

if [ ! -d .git ]; then
  echo "WARN: nao e repo git — recomendado 'git init' antes"
fi

echo "OK: pre-flight passou"
