#!/bin/bash
# FIX DEFINITIVO: Wrapper que INJETA contexto no prompt do agente

echo "=== CONTEXTO AUTO-CARREGADO ==="
cd /home/rluft/fzagent
python3 auto_continuity_check.py 2>/dev/null || echo "[CONTINUITY] Sistema indisponivel"
echo "================================"

# Executa comando original
exec "$@"