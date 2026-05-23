import { describe, expect, it } from 'vitest';

import {
  anthropicStopReasonToOurs,
  messagesToAnthropic,
  toolChoiceToAnthropic,
  toolToAnthropic,
} from './anthropic.js';
import { messagesToOllama, ollamaDoneReasonToOurs, toolToOllama } from './ollama.js';
import {
  messagesToOpenAI,
  openaiFinishReasonToOurs,
  toolChoiceToOpenAI,
  toolToOpenAI,
} from './openai.js';

describe('Anthropic translators', () => {
  it('extracts system messages into system field (api_key mode)', () => {
    const r = messagesToAnthropic(
      [
        { role: 'system', content: 'be helpful' },
        { role: 'user', content: 'hi' },
      ],
      'topology',
    );
    expect(r.system).toBe('topology\n\nbe helpful');
    expect(r.messages).toHaveLength(1);
    expect(r.messages[0]?.role).toBe('user');
  });

  it('OAuth mode: system is undefined and combined system is prepended to first user', () => {
    const r = messagesToAnthropic(
      [
        { role: 'system', content: 'be helpful' },
        { role: 'user', content: 'hi' },
        { role: 'user', content: 'hi 2' },
      ],
      'topology',
      true,
    );
    expect(r.system).toBeUndefined();
    expect(r.messages[0]?.role).toBe('user');
    expect(r.messages[0]?.content).toBe('topology\n\nbe helpful\n\nhi');
    // segunda user nao recebe prepend
    expect(r.messages[1]?.content).toBe('hi 2');
  });

  it('translates assistant tool_calls into content blocks', () => {
    const r = messagesToAnthropic([
      {
        role: 'assistant',
        content: 'thinking...',
        tool_calls: [{ id: 't1', name: 'fs.read', input: { path: '/x' } }],
      },
    ]);
    expect(r.messages[0]?.role).toBe('assistant');
    const content = r.messages[0]?.content;
    expect(Array.isArray(content)).toBe(true);
    if (Array.isArray(content)) {
      expect(content[0]?.type).toBe('text');
      expect(content[1]?.type).toBe('tool_use');
    }
  });

  it('translates tool message into user with tool_result block', () => {
    const r = messagesToAnthropic([{ role: 'tool', content: 'file contents', tool_call_id: 't1' }]);
    expect(r.messages[0]?.role).toBe('user');
    const content = r.messages[0]?.content;
    if (Array.isArray(content)) {
      expect(content[0]?.type).toBe('tool_result');
    }
  });

  it('toolToAnthropic preserves shape and sanitizes name (dot -> underscore)', () => {
    const t = toolToAnthropic({
      name: 'web.fetch',
      description: 'fetch URL',
      inputSchema: { type: 'object', properties: { url: { type: 'string' } } },
    });
    // Anthropic exige regex ^[a-zA-Z0-9_-]{1,128}$ — dot eh sanitizado on-wire.
    expect(t.name).toBe('web_fetch');
    expect(t.input_schema.type).toBe('object');
  });

  it('toolChoiceToAnthropic maps each variant', () => {
    expect(toolChoiceToAnthropic('auto')).toEqual({ type: 'auto' });
    expect(toolChoiceToAnthropic('none')).toEqual({ type: 'none' });
    expect(toolChoiceToAnthropic('required')).toEqual({ type: 'any' });
    expect(toolChoiceToAnthropic({ name: 'x' })).toEqual({ type: 'tool', name: 'x' });
  });

  it('anthropicStopReasonToOurs maps known reasons', () => {
    expect(anthropicStopReasonToOurs('end_turn')).toBe('end_turn');
    expect(anthropicStopReasonToOurs('tool_use')).toBe('tool_use');
    expect(anthropicStopReasonToOurs('max_tokens')).toBe('max_tokens');
    expect(anthropicStopReasonToOurs('stop_sequence')).toBe('stop_sequence');
    expect(anthropicStopReasonToOurs('weird')).toBe('error');
    expect(anthropicStopReasonToOurs(null)).toBe('error');
  });
});

describe('OpenAI translators', () => {
  it('keeps system messages in array', () => {
    const r = messagesToOpenAI([
      { role: 'system', content: 'be polite' },
      { role: 'user', content: 'hi' },
    ]);
    expect(r[0]?.role).toBe('system');
    expect(r[1]?.role).toBe('user');
  });

  it('serializes tool_call args as JSON string', () => {
    const r = messagesToOpenAI([
      {
        role: 'assistant',
        content: '',
        tool_calls: [{ id: 't1', name: 'fs.read', input: { path: '/x' } }],
      },
    ]);
    const m = r[0];
    if (m && m.role === 'assistant' && m.tool_calls) {
      expect(m.tool_calls[0]?.function?.arguments).toBe('{"path":"/x"}');
    } else {
      throw new Error('expected assistant with tool_calls');
    }
  });

  it('toolToOpenAI wraps in function envelope and sanitizes name', () => {
    const t = toolToOpenAI({
      name: 'web.fetch',
      description: 'fetch URL',
      inputSchema: { type: 'object' },
    });
    expect(t.type).toBe('function');
    // OpenAI exige regex ^[a-zA-Z0-9_-]{1,64}$ — dot eh sanitizado on-wire.
    expect(t.function.name).toBe('web_fetch');
  });

  it('toolChoiceToOpenAI maps each variant', () => {
    expect(toolChoiceToOpenAI('auto')).toBe('auto');
    expect(toolChoiceToOpenAI('none')).toBe('none');
    expect(toolChoiceToOpenAI('required')).toBe('required');
    expect(toolChoiceToOpenAI({ name: 'x' })).toEqual({
      type: 'function',
      function: { name: 'x' },
    });
  });

  it('openaiFinishReasonToOurs maps known values', () => {
    expect(openaiFinishReasonToOurs('stop')).toBe('end_turn');
    expect(openaiFinishReasonToOurs('tool_calls')).toBe('tool_use');
    expect(openaiFinishReasonToOurs('length')).toBe('max_tokens');
    expect(openaiFinishReasonToOurs('content_filter')).toBe('error');
  });
});

// Google translators removidos — GoogleProvider agora usa subprocess (gemini CLI),
// nao SDK. Os helpers de formatacao para CLI sao testados em google.test.ts.

describe('Ollama translators', () => {
  it('keeps roles inline', () => {
    const r = messagesToOllama([
      { role: 'system', content: 'be ok' },
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ]);
    expect(r.map((m) => m.role)).toEqual(['system', 'user', 'assistant']);
  });

  it('toolToOllama emits function envelope', () => {
    const t = toolToOllama({
      name: 'fs.read',
      description: 'read',
      inputSchema: { type: 'object' },
    });
    expect(t.type).toBe('function');
    expect(t.function.name).toBe('fs.read');
  });

  it('ollamaDoneReasonToOurs prioritizes tool_use when there are calls', () => {
    expect(ollamaDoneReasonToOurs('stop', true)).toBe('tool_use');
    expect(ollamaDoneReasonToOurs('stop', false)).toBe('end_turn');
    expect(ollamaDoneReasonToOurs('length', false)).toBe('max_tokens');
    expect(ollamaDoneReasonToOurs(undefined, false)).toBe('end_turn');
  });
});
