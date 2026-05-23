# fzagent skill — workflow detalhado

## Roteamento

Identifique a intencao do usuario:

- "ingerir / indexar / ler fonte X" → **ingest**
- "consultar / pergunta sobre X" → **query**
- "auditar / lintar / verificar wiki" → **lint**
- "gerar slides / tabela / diagrama" → **artefato**

## Workflow ingest

1. Localize o arquivo em `raw/` (se for caminho relativo, resolva contra cwd).
2. `fzagent wiki ingest <path> [--summarize]`.
3. Reporte: pageId, sha256 (12 chars), bytes.
4. Se houver erro de credencial Qdrant ou Anthropic: instrua o usuario a
   ajustar `.env` e tente de novo.

## Workflow query

1. Refraseie a pergunta para conter os termos-chave.
2. `fzagent wiki query "<q>" --top 5 --synthesize`.
3. Apresente:
   - Sintese (se `--synthesize`).
   - Top 5 hits com source (`fts5` | `qdrant` | `hybrid`) + excerpt.
4. Sugira proximas perguntas baseadas nos hits.

## Workflow lint

1. `fzagent wiki lint`.
2. Apresente totais por categoria.
3. Liste primeiros 10 de cada.
4. Para cada orfa: sugira link de entrada candidato baseado em similaridade.
5. Para cada broken link: sugira pagina existente que casa com `anchor_text`.

## Workflow artefato — Marp slides

1. Leia `wiki/analyses/<slug>.md` (peca o slug ao usuario se nao souber).
2. Estruture em slides Marp:

   ```markdown
   ---
   marp: true
   theme: default
   ---

   # <Titulo>

   ---

   ## Slide 2

   ...
   ```

3. Salve em `_fzagent_artifacts/slides/<slug>.md`.
4. Sugira: "Para gerar PDF: `npx @marp-team/marp-cli@latest <path> -o <pdf>`".

## Workflow artefato — comparacao tabular

1. Faca duas queries: `fzagent wiki query "<conceito A>"` e `<conceito B>`.
2. Extraia os top 3 trechos de cada.
3. Construa tabela markdown:
   ```markdown
   | Aspecto | Conceito A | Conceito B |
   | ------- | ---------- | ---------- |
   | ...     | [[slug-a]] | [[slug-b]] |
   ```
4. Salve em `_fzagent_artifacts/comparisons/<slug-a>-vs-<slug-b>.md`.

## Workflow artefato — diagrama mermaid

1. Pergunte ao usuario o escopo (paginas com tag X, todas as relacoes).
2. Use `fzagent wiki query` para listar paginas relevantes.
3. Gere mermaid:
   ```mermaid
   graph LR
     A[Pagina A] --> B[Pagina B]
     A --> C[Pagina C]
   ```
4. Salve em `_fzagent_artifacts/diagrams/<topico>.mmd`.

## Estado

Caso o usuario tenha sessao longa em curso, mantenha estado em
`.fzagent/state.json` com forma similar ao reversa:

```json
{
  "phase": "ingestao" | "consulta" | "geracao",
  "completed": ["..."],
  "pending": ["..."],
  "artifacts": ["caminho1", "caminho2"]
}
```

Salve checkpoints apos cada operacao bem-sucedida.

## Estouro de contexto

Salve `state.json` imediatamente. Diga: "Pausando aqui. Digite
`/fzagent` em sessao nova para retomar."
