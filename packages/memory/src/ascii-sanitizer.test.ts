import { describe, expect, it } from 'vitest';

import {
  getNonAsciiChars,
  isAsciiOnly,
  sanitizeBatch,
  sanitizeForEmbedding,
  sanitizePayload,
} from './ascii-sanitizer.js';

describe('sanitizeForEmbedding', () => {
  it('removes Portuguese accents', () => {
    expect(sanitizeForEmbedding('função')).toBe('funcao');
    expect(sanitizeForEmbedding('configuração')).toBe('configuracao');
    expect(sanitizeForEmbedding('São Paulo')).toBe('Sao Paulo');
    expect(sanitizeForEmbedding('não')).toBe('nao');
  });

  it('removes emojis and non-ASCII symbols', () => {
    expect(sanitizeForEmbedding('🚀 rocket')).toBe('rocket');
    expect(sanitizeForEmbedding('hello → world')).toBe('hello world');
    expect(sanitizeForEmbedding('café ☕')).toBe('cafe');
  });

  it('collapses whitespace', () => {
    expect(sanitizeForEmbedding('a    b\n\nc\td')).toBe('a b c d');
  });

  it('trims edges', () => {
    expect(sanitizeForEmbedding('   foo   ')).toBe('foo');
  });

  it('handles empty / non-string input', () => {
    expect(sanitizeForEmbedding('')).toBe('');
    // @ts-expect-error testing runtime safety
    expect(sanitizeForEmbedding(null)).toBe('');
    // @ts-expect-error testing runtime safety
    expect(sanitizeForEmbedding(undefined)).toBe('');
    // @ts-expect-error testing runtime safety
    expect(sanitizeForEmbedding(123)).toBe('');
  });

  it('preserves ASCII passthrough', () => {
    expect(sanitizeForEmbedding('Hello, world!')).toBe('Hello, world!');
  });
});

describe('sanitizeBatch', () => {
  it('processes array', () => {
    expect(sanitizeBatch(['ação', 'não', 'foo'])).toEqual(['acao', 'nao', 'foo']);
  });
});

describe('sanitizePayload', () => {
  it('sanitizes nested string values recursively', () => {
    const r = sanitizePayload({
      title: 'configuração',
      tags: ['açúcar', 'pão'],
      meta: { description: 'café da manhã' },
      score: 0.9,
    });
    expect(r['title']).toBe('configuracao');
    expect(r['tags']).toEqual(['acucar', 'pao']);
    expect((r['meta'] as Record<string, unknown>)['description']).toBe('cafe da manha');
    expect(r['score']).toBe(0.9);
  });
});

describe('isAsciiOnly', () => {
  it('detects pure ASCII', () => {
    expect(isAsciiOnly('hello')).toBe(true);
    expect(isAsciiOnly('hello, world!')).toBe(true);
  });

  it('detects non-ASCII', () => {
    expect(isAsciiOnly('São Paulo')).toBe(false);
    expect(isAsciiOnly('🚀')).toBe(false);
  });
});

describe('getNonAsciiChars', () => {
  it('returns unique non-ASCII chars', () => {
    expect(getNonAsciiChars('São São')).toEqual(['ã']);
    expect(getNonAsciiChars('🚀 → ☕')).toEqual(['🚀', '→', '☕']);
    expect(getNonAsciiChars('hello')).toEqual([]);
  });
});
