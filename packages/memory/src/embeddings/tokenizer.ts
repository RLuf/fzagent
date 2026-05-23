// WordPiece tokenizer minimalista compativel com BGE-base (BERT-style).
//
// Carrega vocab.txt (uma palavra por linha, indice = numero da linha).
// Pipeline:
//  1. lower-case (BGE-base-en e uncased).
//  2. clean: remove control chars + colapsa whitespace.
//  3. tokenize por whitespace + punctuation split.
//  4. WordPiece greedy longest-match com prefixo "##" para sub-tokens.
//  5. Adiciona [CLS] no inicio e [SEP] no fim.
//  6. Pad ate maxLength com [PAD]; trunca se exceder.
//
// Saida: { input_ids, attention_mask, token_type_ids } compativel com a
// assinatura ONNX do BGE.

import { readFileSync } from 'node:fs';

export interface TokenizerOptions {
  // caminho para vocab.txt
  vocabPath: string;
  // default 512 (limite do BGE)
  maxLength?: number;
  // tokens especiais (defaults BERT/BGE)
  clsToken?: string;
  sepToken?: string;
  padToken?: string;
  unkToken?: string;
  // case-fold no input (BGE-base-en e uncased)
  doLowerCase?: boolean;
}

export interface Encoded {
  inputIds: BigInt64Array;
  attentionMask: BigInt64Array;
  tokenTypeIds: BigInt64Array;
  length: number;
}

// Punctuation: faixas ASCII !-/, :-@, [-`, {-~ (BERT BasicTokenizer).
const PUNCTUATION_REGEX = /[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]/;
// eslint-disable-next-line no-control-regex
const CONTROL_REGEX = /[\x00-\x1f]/g;
const WHITESPACE_REGEX = /\s+/g;

export class WordPieceTokenizer {
  private readonly vocab = new Map<string, number>();
  readonly maxLength: number;
  readonly clsId: number;
  readonly sepId: number;
  readonly padId: number;
  readonly unkId: number;
  readonly doLowerCase: boolean;

  constructor(opts: TokenizerOptions) {
    const text = readFileSync(opts.vocabPath, 'utf8');
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const w = lines[i];
      if (w !== undefined && w.length > 0) this.vocab.set(w, i);
    }
    this.maxLength = opts.maxLength ?? 512;
    this.doLowerCase = opts.doLowerCase ?? true;
    const cls = opts.clsToken ?? '[CLS]';
    const sep = opts.sepToken ?? '[SEP]';
    const pad = opts.padToken ?? '[PAD]';
    const unk = opts.unkToken ?? '[UNK]';
    const id = (t: string): number => {
      const v = this.vocab.get(t);
      if (v === undefined) throw new Error(`Tokenizer vocab missing: ${t}`);
      return v;
    };
    this.clsId = id(cls);
    this.sepId = id(sep);
    this.padId = id(pad);
    this.unkId = id(unk);
  }

  encode(text: string): Encoded {
    const cleaned = clean(text, this.doLowerCase);
    const wordPieces = this.tokenize(cleaned);
    // reserva 2 slots para [CLS] e [SEP]
    const room = this.maxLength - 2;
    const trimmed = wordPieces.slice(0, room);
    const ids: number[] = [this.clsId, ...trimmed, this.sepId];
    const mask: number[] = new Array(ids.length).fill(1);
    while (ids.length < this.maxLength) {
      ids.push(this.padId);
      mask.push(0);
    }
    const types: number[] = new Array(this.maxLength).fill(0);
    return {
      inputIds: BigInt64Array.from(ids.map((n) => BigInt(n))),
      attentionMask: BigInt64Array.from(mask.map((n) => BigInt(n))),
      tokenTypeIds: BigInt64Array.from(types.map((n) => BigInt(n))),
      length: this.maxLength,
    };
  }

  // Greedy longest-match WordPiece sobre tokens basicos.
  private tokenize(text: string): number[] {
    const out: number[] = [];
    for (const word of basicTokenize(text)) {
      if (word.length === 0) continue;
      out.push(...this.wordpiece(word));
    }
    return out;
  }

  private wordpiece(word: string): number[] {
    const tokens: number[] = [];
    let start = 0;
    while (start < word.length) {
      let end = word.length;
      let cur: number | undefined;
      while (start < end) {
        let sub = word.slice(start, end);
        if (start > 0) sub = '##' + sub;
        const id = this.vocab.get(sub);
        if (id !== undefined) {
          cur = id;
          break;
        }
        end -= 1;
      }
      if (cur === undefined) {
        return [this.unkId];
      }
      tokens.push(cur);
      start = end;
    }
    return tokens;
  }
}

// ---------- helpers ----------

function clean(text: string, lower: boolean): string {
  let out = text.replace(CONTROL_REGEX, ' ').replace(WHITESPACE_REGEX, ' ').trim();
  if (lower) out = out.toLowerCase();
  return out;
}

// Splits on whitespace and around ASCII punctuation (BERT-style).
function basicTokenize(text: string): string[] {
  const out: string[] = [];
  for (const word of text.split(/\s+/)) {
    if (!word) continue;
    let buf = '';
    for (const ch of word) {
      if (PUNCTUATION_REGEX.test(ch)) {
        if (buf) out.push(buf);
        out.push(ch);
        buf = '';
      } else {
        buf += ch;
      }
    }
    if (buf) out.push(buf);
  }
  return out;
}
