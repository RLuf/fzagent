import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadConfig } from './index.js';
import { ConfigError } from '../errors/index.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'fzagent-config-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('loadConfig', () => {
  it('returns defaults when no files and clean env', () => {
    const { conf, env } = loadConfig({ cwd: dir, env: {} });
    expect(conf.PROVIDER_FALLBACK_ORDER).toEqual([
      'anthropic',
      'openai',
      'google',
      'openrouter',
      'ollama',
    ]);
    expect(conf.AGENTIC_MAX_ITERATIONS).toBe(20);
    expect(conf.EMBEDDINGS_DIM).toBe(768);
    expect(env.OLLAMA_BASE_URL).toBe('http://192.168.0.101:11434');
    // LOG_LEVEL agora vive no fzagent.conf (override via env opcional).
    expect(conf.LOG_LEVEL).toBe('info');
    expect(env.LOG_LEVEL).toBeUndefined();
  });

  it('reads fzagent.conf when present', () => {
    writeFileSync(join(dir, 'fzagent.conf'), 'AGENTIC_MAX_ITERATIONS=50\nDEFAULT_MODEL=gpt-4o\n');
    const { conf } = loadConfig({ cwd: dir, env: {} });
    expect(conf.AGENTIC_MAX_ITERATIONS).toBe(50);
    expect(conf.DEFAULT_MODEL).toBe('gpt-4o');
  });

  it('reads .env when present', () => {
    writeFileSync(join(dir, '.env'), 'ANTHROPIC_API_KEY=sk-test\nLOG_LEVEL=debug\n');
    const { env } = loadConfig({ cwd: dir, env: {} });
    expect(env.ANTHROPIC_API_KEY).toBe('sk-test');
    expect(env.LOG_LEVEL).toBe('debug');
  });

  it('process.env overrides files', () => {
    writeFileSync(join(dir, 'fzagent.conf'), 'AGENTIC_MAX_ITERATIONS=10\n');
    const { conf } = loadConfig({ cwd: dir, env: { AGENTIC_MAX_ITERATIONS: '99' } });
    expect(conf.AGENTIC_MAX_ITERATIONS).toBe(99);
  });

  it('coerces CSVs into arrays', () => {
    const { conf } = loadConfig({
      cwd: dir,
      env: { PROVIDER_FALLBACK_ORDER: 'openai,ollama' },
    });
    expect(conf.PROVIDER_FALLBACK_ORDER).toEqual(['openai', 'ollama']);
  });

  it('throws ConfigError on invalid value', () => {
    expect(() =>
      loadConfig({
        cwd: dir,
        env: { AGENTIC_MAX_ITERATIONS: 'not-a-number' },
      }),
    ).toThrow(ConfigError);
  });

  it('respects ignoreFiles', () => {
    writeFileSync(join(dir, 'fzagent.conf'), 'AGENTIC_MAX_ITERATIONS=50\n');
    const { conf } = loadConfig({ cwd: dir, env: {}, ignoreFiles: true });
    expect(conf.AGENTIC_MAX_ITERATIONS).toBe(20);
  });
});
