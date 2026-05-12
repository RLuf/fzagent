// Tool-name wire serialization.
//
// Problema: as tools canonicas do fzagent usam dot-namespacing (shell.exec,
// fs.read, wiki.ingest). Anthropic exige `^[a-zA-Z0-9_-]{1,128}$` e OpenAI
// exige `^[a-zA-Z0-9_-]{1,64}$` — ponto rejeitado em ambos.
//
// Estrategia: sanitizar outbound substituindo `.` por `_`, manter map para
// denormalizar o name retornado em tool_use/tool_calls antes de devolver
// CompleteResult para o agent loop (que continua falando o nome canonico).
//
// A funcao eh idempotente para nomes sem `.` (no-op).

export function sanitizeToolName(name: string): string {
  return name.replace(/\./g, '_');
}

// Constroi map { sanitized -> original } a partir da lista de tools que sera
// enviada. Usado para denormalizar nomes recebidos.
export function buildToolNameMap(
  tools: ReadonlyArray<{ name: string }> | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  if (!tools) return map;
  for (const t of tools) {
    map.set(sanitizeToolName(t.name), t.name);
  }
  return map;
}

// Desfaz a sanitizacao usando o map. Fallback: devolve o nome recebido
// (caso o adapter receba algo que nao foi enviado por nos — edge raro).
export function denormalizeToolName(wireName: string, map: Map<string, string>): string {
  return map.get(wireName) ?? wireName;
}
