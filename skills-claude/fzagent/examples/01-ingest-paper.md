# Exemplo 1: ingerir um paper PDF

## Pedido do usuario

> "Ingerir o paper em raw/attention.pdf no wiki, com resumo automatico."

## Passos do agente

1. Verifique o arquivo: `ls -la raw/attention.pdf`.
2. Execute:
   ```bash
   fzagent wiki ingest raw/attention.pdf --summarize
   ```
3. Espere ~30s (download model BGE primeira vez + LLM summary).
4. Reporte:
   ```
   OK pageId=ab12... sha256=4f8e2c...
   ```
5. Sugira: "Quer que eu rode `fzagent wiki query 'attention is all you
need'` para verificar a indexacao?"
