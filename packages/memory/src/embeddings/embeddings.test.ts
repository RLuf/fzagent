// Testes unitarios da camada de embeddings que NAO precisam do modelo ONNX.
// Carregar o modelo (~440MB) e testar inference fica para um teste de
// integracao opcional, ativado via env FZAGENT_TEST_EMBEDDINGS=1.

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { meanPoolNormalize } from './service.js';
import { WordPieceTokenizer } from './tokenizer.js';

function tmpVocab(words: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'fz-vocab-'));
  const path = join(dir, 'vocab.txt');
  writeFileSync(path, words.join('\n'));
  return path;
}

describe('WordPieceTokenizer', () => {
  it('encodes a simple sentence with cls/sep and padding', () => {
    const vocab = ['[PAD]', '[UNK]', '[CLS]', '[SEP]', 'hello', 'world', '##s'];
    const t = new WordPieceTokenizer({ vocabPath: tmpVocab(vocab), maxLength: 8 });
    const r = t.encode('Hello world');
    // [CLS] hello world [SEP] [PAD] [PAD] [PAD] [PAD]
    const ids = Array.from(r.inputIds, (n) => Number(n));
    expect(ids).toEqual([2, 4, 5, 3, 0, 0, 0, 0]);
    const mask = Array.from(r.attentionMask, (n) => Number(n));
    expect(mask).toEqual([1, 1, 1, 1, 0, 0, 0, 0]);
  });

  it('uses ## subtoken split for unknown roots', () => {
    const vocab = [
      '[PAD]',
      '[UNK]',
      '[CLS]',
      '[SEP]',
      'hello',
      'world',
      'em',
      '##bed',
      '##ding',
      '##s',
    ];
    const t = new WordPieceTokenizer({ vocabPath: tmpVocab(vocab), maxLength: 16 });
    const r = t.encode('embeddings');
    const ids = Array.from(r.inputIds, (n) => Number(n)).slice(1, 5);
    // em + ##bed + ##ding + ##s
    expect(ids).toEqual([6, 7, 8, 9]);
  });

  it('falls back to UNK for unknown chars', () => {
    const vocab = ['[PAD]', '[UNK]', '[CLS]', '[SEP]', 'hello'];
    const t = new WordPieceTokenizer({ vocabPath: tmpVocab(vocab), maxLength: 8 });
    const r = t.encode('hello xyz');
    const ids = Array.from(r.inputIds, (n) => Number(n));
    // [CLS] hello [UNK] [SEP]
    expect(ids[0]).toBe(2);
    expect(ids[1]).toBe(4);
    expect(ids[2]).toBe(1);
    expect(ids[3]).toBe(3);
  });

  it('truncates long input to maxLength', () => {
    const vocab = ['[PAD]', '[UNK]', '[CLS]', '[SEP]', 'a'];
    const t = new WordPieceTokenizer({ vocabPath: tmpVocab(vocab), maxLength: 5 });
    const r = t.encode('a a a a a a a a');
    expect(r.length).toBe(5);
    const ids = Array.from(r.inputIds, (n) => Number(n));
    expect(ids[0]).toBe(2); // [CLS]
    expect(ids[ids.length - 1]).toBe(3); // [SEP]
  });

  it('lowercases by default (BGE-base-en uncased)', () => {
    const vocab = ['[PAD]', '[UNK]', '[CLS]', '[SEP]', 'hello'];
    const t = new WordPieceTokenizer({ vocabPath: tmpVocab(vocab), maxLength: 8 });
    const r = t.encode('HELLO');
    const ids = Array.from(r.inputIds, (n) => Number(n));
    expect(ids[1]).toBe(4); // matched 'hello'
  });

  it('throws when vocab missing required tokens', () => {
    expect(() => new WordPieceTokenizer({ vocabPath: tmpVocab(['hello']) })).toThrow(/missing/);
  });
});

describe('meanPoolNormalize', () => {
  it('produces a unit vector', () => {
    // batch=1, seq=2, dim=4
    const hidden = Float32Array.from([1, 0, 0, 0, 3, 0, 0, 0]);
    const mask = BigInt64Array.from([1n, 1n]);
    const v = meanPoolNormalize(hidden, [1, 2, 4], mask);
    expect(v.length).toBe(4);
    const norm = Math.sqrt(v.reduce((a, b) => a + b * b, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it('respects attention mask (zeros are excluded)', () => {
    const hidden = Float32Array.from([1, 0, 0, 0, 100, 0, 0, 0]);
    const mask = BigInt64Array.from([1n, 0n]);
    const v = meanPoolNormalize(hidden, [1, 2, 4], mask);
    // so o primeiro token conta -> direcao [1,0,0,0]
    expect(v[0]).toBeCloseTo(1, 5);
    expect(v[1]).toBeCloseTo(0, 5);
  });

  it('handles all-zero mask gracefully', () => {
    const hidden = Float32Array.from([1, 0, 0, 0]);
    const mask = BigInt64Array.from([0n]);
    const v = meanPoolNormalize(hidden, [1, 1, 4], mask);
    expect(v).toEqual([0, 0, 0, 0]);
  });
});
