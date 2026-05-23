import { describe, expect, it } from 'vitest';

import {
  checkProviderAvailable,
  detectAnthropicAuthType,
  getAnthropicAuth,
  getEnvVarName,
  getOllamaBaseUrl,
} from './credentials.js';

describe('detectAnthropicAuthType', () => {
  it('detects sk-ant-oat as oauth', () => {
    expect(detectAnthropicAuthType('sk-ant-oat-1234')).toBe('oauth_token');
  });

  it('detects sk-ant- as api_key', () => {
    expect(detectAnthropicAuthType('sk-ant-api03-abc')).toBe('api_key');
  });

  it('treats length > 100 as oauth', () => {
    expect(detectAnthropicAuthType('x'.repeat(150))).toBe('oauth_token');
  });

  it('defaults to api_key for short unknown', () => {
    expect(detectAnthropicAuthType('mystery')).toBe('api_key');
  });
});

describe('getAnthropicAuth', () => {
  it('returns null when nothing is set', () => {
    expect(getAnthropicAuth({})).toBeNull();
  });

  it('prefers CLAUDE_CODE_OAUTH_TOKEN above all', () => {
    const r = getAnthropicAuth({
      CLAUDE_CODE_OAUTH_TOKEN: 'cco',
      ANTHROPIC_OAUTH_TOKEN: 'aot',
      ANTHROPIC_AUTH_TOKEN: 'aat',
      ANTHROPIC_API_KEY: 'sk-ant-api03-fallback',
    });
    expect(r).toEqual({ authType: 'oauth_token', credential: 'cco' });
  });

  it('uses ANTHROPIC_OAUTH_TOKEN when CLAUDE_CODE_OAUTH_TOKEN is absent', () => {
    const r = getAnthropicAuth({
      ANTHROPIC_OAUTH_TOKEN: 'aot',
      ANTHROPIC_API_KEY: 'sk-ant-api03',
    });
    expect(r).toEqual({ authType: 'oauth_token', credential: 'aot' });
  });

  it('uses ANTHROPIC_AUTH_TOKEN as third priority', () => {
    const r = getAnthropicAuth({
      ANTHROPIC_AUTH_TOKEN: 'aat',
      ANTHROPIC_API_KEY: 'sk-ant-api03',
    });
    expect(r).toEqual({ authType: 'oauth_token', credential: 'aat' });
  });

  it('falls back to ANTHROPIC_API_KEY when no OAuth env', () => {
    const r = getAnthropicAuth({ ANTHROPIC_API_KEY: 'sk-ant-api03-xyz' });
    expect(r).toEqual({ authType: 'api_key', credential: 'sk-ant-api03-xyz' });
  });

  it('detects oauth from API key prefix sk-ant-oat', () => {
    const r = getAnthropicAuth({ ANTHROPIC_API_KEY: 'sk-ant-oat-foo' });
    expect(r?.authType).toBe('oauth_token');
  });

  it('treats empty string as missing', () => {
    expect(
      getAnthropicAuth({
        CLAUDE_CODE_OAUTH_TOKEN: '',
        ANTHROPIC_API_KEY: '',
      }),
    ).toBeNull();
  });
});

describe('getOllamaBaseUrl', () => {
  it('returns env value when set', () => {
    expect(getOllamaBaseUrl({ OLLAMA_BASE_URL: 'http://x:1234' })).toBe('http://x:1234');
  });

  it('returns papaimach default when missing', () => {
    expect(getOllamaBaseUrl({})).toBe('http://192.168.0.101:11434');
  });

  it('respects custom fallback', () => {
    expect(getOllamaBaseUrl({}, 'http://localhost:11434')).toBe('http://localhost:11434');
  });
});

describe('checkProviderAvailable', () => {
  it('anthropic true with OAuth', () => {
    expect(checkProviderAvailable('anthropic', { CLAUDE_CODE_OAUTH_TOKEN: 'x' })).toBe(true);
  });

  it('anthropic false without any token', () => {
    expect(checkProviderAvailable('anthropic', {})).toBe(false);
  });

  it('openai true with key', () => {
    expect(checkProviderAvailable('openai', { OPENAI_API_KEY: 'sk-x' })).toBe(true);
  });

  it('openrouter true with key', () => {
    expect(checkProviderAvailable('openrouter', { OPENROUTER_API_KEY: 'sk-or-x' })).toBe(true);
  });

  it('ollama always available (local, sem credencial)', () => {
    expect(checkProviderAvailable('ollama', {})).toBe(true);
  });

  // Google passou de CLI subprocess para SDK direto em 2026-05-13 — agora
  // exige GOOGLE_API_KEY como qualquer provider via API.
  it('google requires GOOGLE_API_KEY (SDK-based desde 2026-05-13)', () => {
    expect(checkProviderAvailable('google', {})).toBe(false);
    expect(checkProviderAvailable('google', { GOOGLE_API_KEY: 'fake-key' })).toBe(true);
  });
});

describe('getEnvVarName', () => {
  it('switches to ANTHROPIC_AUTH_TOKEN when OAuth is configured', () => {
    expect(getEnvVarName('anthropic', { CLAUDE_CODE_OAUTH_TOKEN: 'x' })).toBe(
      'ANTHROPIC_AUTH_TOKEN',
    );
  });

  it('returns ANTHROPIC_API_KEY by default', () => {
    expect(getEnvVarName('anthropic', {})).toBe('ANTHROPIC_API_KEY');
  });

  it('maps each provider correctly', () => {
    expect(getEnvVarName('openai')).toBe('OPENAI_API_KEY');
    expect(getEnvVarName('openrouter')).toBe('OPENROUTER_API_KEY');
    expect(getEnvVarName('google')).toBe('GOOGLE_API_KEY');
    expect(getEnvVarName('ollama')).toBe('OLLAMA_BASE_URL');
  });
});
