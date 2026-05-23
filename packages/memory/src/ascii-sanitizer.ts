// ASCII Sanitizer para o ONNX embedder.
//
// Replicado do fazai-ng/src/rag/ascii-sanitizer.ts (fix v3.37):
// O ONNX embedder local (BGE-base-en-v1.5) quebra com chars nao-ASCII;
// normalizar antes de qualquer geracao de embedding e mandatorio.
//
// Pipeline (a ordem importa):
//  1. NFD: decompor acentos (a -> a + combining tilde).
//  2. Remover marcas diacriticas (combining marks U+0300-U+036F).
//  3. Remover todo char fora de ASCII basico (>U+007F): emojis, simbolos.
//  4. Colapsar whitespace.
//  5. Trim.
//
// Fix v3.37: a remocao de combining marks usa a faixa U+0300-U+036F
// (combining diacritical marks). Combiner reapos NFD GARANTE que o
// caractere base ja foi separado do diacritico antes da remocao.

// Faixas ASCII e Unicode hardcoded como controle proposital — regras
// no-control-regex e no-useless-escape sao desabilitadas onde aplicaveis.
/* eslint-disable no-control-regex */
const DIACRITICAL_MARKS = /[̀-ͯ]/g; // U+0300 .. U+036F
const NON_ASCII = /[^\x00-\x7f]/g;
const NON_ASCII_U = /[^\x00-\x7f]/gu;
/* eslint-enable no-control-regex */

export function sanitizeForEmbedding(text: string): string {
  if (!text || typeof text !== 'string') return '';

  return text
    .normalize('NFD')
    .replace(DIACRITICAL_MARKS, '') // diacritical marks (apos NFD)
    .replace(NON_ASCII, '') // resto: emojis, simbolos nao-ASCII
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeBatch(texts: string[]): string[] {
  return texts.map(sanitizeForEmbedding);
}

// Recursivamente sanitiza strings em payloads para Qdrant.
export function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (typeof v === 'string') {
      out[k] = sanitizeForEmbedding(v);
    } else if (Array.isArray(v)) {
      out[k] = v.map((item) => (typeof item === 'string' ? sanitizeForEmbedding(item) : item));
    } else if (v && typeof v === 'object') {
      out[k] = sanitizePayload(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// eslint-disable-next-line no-control-regex
const ASCII_ONLY = /^[\x00-\x7f]*$/;

export function isAsciiOnly(text: string): boolean {
  return ASCII_ONLY.test(text);
}

export function getNonAsciiChars(text: string): string[] {
  // flag `u` para tratar surrogate pairs como unico char (emojis 4-byte).
  const matches = text.match(NON_ASCII_U);
  return matches ? Array.from(new Set(matches)) : [];
}
