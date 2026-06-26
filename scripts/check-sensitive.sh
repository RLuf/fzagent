#!/usr/bin/env bash
# Script para evitar commits acidentais de dados sensíveis ou logs locais.

# Nomes e extensoes proibidos
FORBIDDEN_FILES="(\.env.*|\.log|.*\.sqlite.*|MEMORY\.md|fzagentcriacao\.txt|humanidade_2_0_analysis\.json)$"

# Verifica arquivos em stage
staged_files=$(git diff --cached --name-only)

if [[ -z "$staged_files" ]]; then
  exit 0
fi

has_error=0

for file in $staged_files; do
  if [[ "$file" =~ $FORBIDDEN_FILES ]]; then
    echo "🚨 [ERRO] O arquivo $file é sensível/local e não deve ser comitado."
    has_error=1
  fi
done

if [ $has_error -eq 1 ]; then
  echo "=> Commit bloqueado por questões de segurança (dados sensíveis)."
  echo "=> Para ignorar essa restrição (não recomendado), use --no-verify."
  exit 1
fi

exit 0
