# `.fzagent/state.json` schema

```json
{
  "version": "0.1.0",
  "project": "<nome do projeto>",
  "phase": "ingestao" | "consulta" | "geracao" | null,
  "completed": ["..."],
  "pending": ["..."],
  "artifacts": [
    {
      "kind": "slides" | "comparison" | "diagram",
      "path": "_fzagent_artifacts/slides/circuit-breaker.md",
      "ts": 1715200000000
    }
  ],
  "last_query": {
    "q": "...",
    "ts": 1715200000000,
    "results_count": 5
  }
}
```

## Como atualizar

Apos cada operacao bem-sucedida (ingest, query, lint, geracao):

1. Leia o JSON existente (se houver).
2. Atualize os campos relevantes.
3. `fs.write .fzagent/state.json <novo-json>`.

Se o JSON estiver corrompido: backup em `.fzagent/state.json.bak` e
reinicie do zero.
