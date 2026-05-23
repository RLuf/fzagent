// Parser k=v estilo fazai.conf / .env.
// - Linhas vazias e comentarios (#) sao ignorados.
// - Valores entre aspas (' ou ") sao despidos.
// - Comentarios inline NAO sao suportados (use aspas se precisar de #).

export function parseConfFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (!key) continue;

    // strip surrounding quotes (matched pair)
    if (value.length >= 2) {
      const first = value.charAt(0);
      const last = value.charAt(value.length - 1);
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        value = value.slice(1, -1);
      }
    }

    result[key] = value;
  }

  return result;
}
