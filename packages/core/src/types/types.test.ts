import { describe, expect, it } from 'vitest';

import {
  AgentConfigSchema,
  IngestEventSchema,
  MessageSchema,
  SkillManifestSchema,
  ToolCallSchema,
  WikiPageSchema,
} from './index.js';

describe('Message schema', () => {
  it('parses a user message', () => {
    const m = MessageSchema.parse({ role: 'user', content: 'hi' });
    expect(m.role).toBe('user');
  });

  it('parses an assistant message with tool_calls', () => {
    const m = MessageSchema.parse({
      role: 'assistant',
      content: '',
      tool_calls: [{ id: 't1', name: 'fs.read', input: { path: '/etc/hostname' } }],
    });
    expect(m.tool_calls?.[0]?.name).toBe('fs.read');
  });

  it('rejects invalid role', () => {
    const r = MessageSchema.safeParse({ role: 'oracle', content: '' });
    expect(r.success).toBe(false);
  });
});

describe('ToolCall schema', () => {
  it('requires non-empty id and name', () => {
    expect(ToolCallSchema.safeParse({ id: '', name: 'x', input: {} }).success).toBe(false);
    expect(ToolCallSchema.safeParse({ id: 'x', name: '', input: {} }).success).toBe(false);
    expect(ToolCallSchema.safeParse({ id: 'a', name: 'b', input: {} }).success).toBe(true);
  });
});

describe('AgentConfig schema', () => {
  it('rejects negative budgets', () => {
    const r = AgentConfigSchema.safeParse({
      maxIterations: 10,
      tokenBudget: -1,
      circuitBreakerMaxFailures: 3,
      circuitBreakerCooldownMs: 0,
      heartbeatIntervalMs: 0,
      historyTurns: 100,
      compactionThresholdPct: 80,
      defaultModel: 'm',
      maxConcurrencyPerAgent: 1,
    });
    expect(r.success).toBe(false);
  });
});

describe('SkillManifest schema', () => {
  it('applies default permissions and category', () => {
    const m = SkillManifestSchema.parse({
      name: 'cleaner',
      description: 'remove orfaos',
      inputs: { type: 'object' },
      outputs: { type: 'object' },
      filePath: '/abs/genaisrc/cleaner.genai.mjs',
    });
    expect(m.permissions).toBe('low');
    expect(m.category).toBe('custom');
    expect(m.version).toBe('0.1.0');
  });
});

describe('WikiPage schema', () => {
  it('parses with default frontmatter and sourceCount', () => {
    const p = WikiPageSchema.parse({
      id: 'p1',
      path: 'wiki/sources/foo.md',
      title: 'foo',
      type: 'source',
      slug: 'foo',
      body: '# hello',
      createdAt: 1,
      updatedAt: 2,
    });
    expect(p.frontmatter).toEqual({});
    expect(p.sourceCount).toBe(0);
  });
});

describe('IngestEvent schema', () => {
  it('requires sha256 and bytes', () => {
    const r = IngestEventSchema.safeParse({
      rawPath: 'raw/x.md',
      sha256: 'abc',
      ingestedAt: Date.now(),
      bytes: 100,
    });
    expect(r.success).toBe(true);
  });
});
