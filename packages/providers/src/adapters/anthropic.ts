// AnthropicProvider — fetch nativo, OAuth-first (Claude Code Max).
//
// Replicado do fazai-ng/src/services/anthropic-auth.ts:
// 1. Prioridade EXATA: CLAUDE_CODE_OAUTH_TOKEN > ANTHROPIC_OAUTH_TOKEN > ANTHROPIC_API_KEY.
// 2. Quando OAuth: Authorization: Bearer + headers de masquerade Claude Code CLI
//    (anthropic-beta, user-agent, x-app=cli) e o system_field e substituido
//    pelo prompt canonico do Claude Code; o system real do usuario e prepended
//    a primeira mensagem user. Isso e exigido pela API quando o token e OAuth.
// 3. Quando api_key: header x-api-key padrao.
// 4. Endpoint: https://api.anthropic.com/v1/messages, anthropic-version: 2023-06-01.
// 5. Streaming via SSE (event-stream).

import type { Message, ToolCall } from '@fzagent/core';
import { ProviderError } from '@fzagent/core';

import { BaseLLMProvider, type BaseProviderOptions } from '../base.js';
import { getAnthropicAuth } from '../credentials.js';
import type {
  CompleteOptions,
  CompleteResult,
  StopReason,
  StreamChunk,
  ToolChoice,
  ToolDefinition,
} from '../types.js';
import {
  ANTHROPIC_BETA_HEADER,
  ANTHROPIC_OAUTH_SYSTEM,
  ANTHROPIC_USER_AGENT,
} from '../utils/decode.js';
import { fetchWithTimeout } from '../utils/fetch.js';
import { parseSSE } from '../utils/sse.js';

const DEFAULT_MODELS: readonly string[] = ['claude-sonnet-4-5', 'claude-haiku-4-5'];
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Tipos minimos da API (escopo do que usamos — sem dep de SDK).
interface AnthMessage {
  role: 'user' | 'assistant';
  content: string | AnthBlock[];
}
type AnthBlock =
  | { type: 'text'; text: string }
  | {
      type: 'tool_use';
      id: string;
      name: string;
      input: Record<string, unknown>;
    }
  | {
      type: 'tool_result';
      tool_use_id: string;
      content: string;
      is_error?: boolean;
    };
interface AnthTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}
type AnthToolChoice =
  | { type: 'auto' }
  | { type: 'none' }
  | { type: 'any' }
  | { type: 'tool'; name: string };

interface AnthRequestBody {
  model: string;
  max_tokens: number;
  messages: AnthMessage[];
  system?: string | Array<{ type: 'text'; text: string }>;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
  tools?: AnthTool[];
  tool_choice?: AnthToolChoice;
  stream?: boolean;
}

interface AnthResponse {
  id: string;
  model: string;
  content: AnthBlock[];
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

interface AnthropicAdapterOptions extends BaseProviderOptions {
  // Permite injetar process.env-like; default = process.env real.
  env?: Record<string, string | undefined>;
}

export class AnthropicProvider extends BaseLLMProvider {
  readonly name = 'anthropic' as const;
  readonly models: readonly string[];
  private readonly env: Record<string, string | undefined>;
  private readonly endpoint: string;

  constructor(opts: AnthropicAdapterOptions) {
    super(opts);
    this.models = opts.config.models.length > 0 ? opts.config.models : DEFAULT_MODELS;
    this.env = opts.env ?? (process.env as Record<string, string | undefined>);
    this.endpoint = opts.config.baseUrl ?? ANTHROPIC_API_URL;

    // valida na construcao para falhar cedo + mensagem clara
    if (!opts.config.apiKey && getAnthropicAuth(this.env) === null) {
      throw new ProviderError(
        'AnthropicProvider requires CLAUDE_CODE_OAUTH_TOKEN, ANTHROPIC_OAUTH_TOKEN or ANTHROPIC_API_KEY',
        'anthropic',
      );
    }
  }

  async complete(messages: Message[], options: CompleteOptions): Promise<CompleteResult> {
    const start = Date.now();
    const { headers, body } = this.buildRequest(messages, options, false);

    const reqInit: RequestInit & { timeoutMs?: number } = {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    };
    if (options.signal !== undefined) reqInit.signal = options.signal;
    if (this.defaultTimeoutMs !== undefined) reqInit.timeoutMs = this.defaultTimeoutMs;

    const resp = await fetchWithTimeout(this.endpoint, reqInit, 'anthropic');

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw Object.assign(new ProviderError(`Anthropic HTTP ${resp.status}: ${text}`, this.name), {
        status: resp.status,
      });
    }

    const data = (await resp.json()) as AnthResponse | { error: { type: string; message: string } };
    if ('error' in data) {
      throw new ProviderError(`Anthropic: ${data.error.type} - ${data.error.message}`, this.name);
    }

    let content = '';
    const toolCalls: ToolCall[] = [];
    for (const block of data.content) {
      if (block.type === 'text') content += block.text;
      else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input ?? {},
        });
      }
    }

    this.logger.debug(
      {
        model: options.model,
        latencyMs: Date.now() - start,
        toolCalls: toolCalls.length,
        stopReason: data.stop_reason,
      },
      'anthropic.complete ok',
    );

    return {
      content,
      toolCalls,
      stopReason: anthropicStopReasonToOurs(data.stop_reason),
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        ...(data.usage.cache_creation_input_tokens != null && {
          cacheCreationInputTokens: data.usage.cache_creation_input_tokens,
        }),
        ...(data.usage.cache_read_input_tokens != null && {
          cacheReadInputTokens: data.usage.cache_read_input_tokens,
        }),
      },
      model: data.model,
      provider: 'anthropic',
    };
  }

  async *stream(messages: Message[], options: CompleteOptions): AsyncIterable<StreamChunk> {
    const { headers, body } = this.buildRequest(messages, options, true);

    const reqInit: RequestInit & { timeoutMs?: number } = {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    };
    if (options.signal !== undefined) reqInit.signal = options.signal;
    if (this.defaultTimeoutMs !== undefined) reqInit.timeoutMs = this.defaultTimeoutMs;

    const resp = await fetchWithTimeout(this.endpoint, reqInit, 'anthropic');
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw Object.assign(new ProviderError(`Anthropic HTTP ${resp.status}: ${text}`, this.name), {
        status: resp.status,
      });
    }
    if (!resp.body) {
      throw new ProviderError('Anthropic returned empty body', this.name);
    }

    const toolAcc = new Map<number, { id: string; name: string; json: string }>();

    for await (const event of parseSSE(resp.body)) {
      const t = event.event;
      const data = event.data;
      if (!data) continue;

      if (t === 'content_block_start') {
        const cb = data['content_block'] as { type: string; id?: string; name?: string };
        const idx = data['index'] as number;
        if (cb.type === 'tool_use' && cb.id && cb.name) {
          toolAcc.set(idx, { id: cb.id, name: cb.name, json: '' });
          yield { type: 'tool-call-start', toolCallId: cb.id, toolName: cb.name };
        }
      } else if (t === 'content_block_delta') {
        const delta = data['delta'] as { type: string; text?: string; partial_json?: string };
        const idx = data['index'] as number;
        if (delta.type === 'text_delta' && delta.text !== undefined) {
          yield { type: 'text-delta', textDelta: delta.text };
        } else if (delta.type === 'input_json_delta' && delta.partial_json !== undefined) {
          const acc = toolAcc.get(idx);
          if (acc) {
            acc.json += delta.partial_json;
            yield {
              type: 'tool-call-delta',
              toolCallId: acc.id,
              inputJsonDelta: delta.partial_json,
            };
          }
        }
      } else if (t === 'content_block_stop') {
        const idx = data['index'] as number;
        const acc = toolAcc.get(idx);
        if (acc) {
          let input: Record<string, unknown>;
          try {
            input = acc.json ? (JSON.parse(acc.json) as Record<string, unknown>) : {};
          } catch {
            input = { _raw: acc.json };
          }
          yield { type: 'tool-call-end', toolCallId: acc.id, input };
        }
      } else if (t === 'message_delta') {
        const delta = data['delta'] as { stop_reason?: string };
        const usage = data['usage'] as
          | { input_tokens?: number; output_tokens?: number }
          | undefined;
        if (usage) {
          yield {
            type: 'usage',
            usage: {
              inputTokens: usage.input_tokens ?? 0,
              outputTokens: usage.output_tokens ?? 0,
            },
          };
        }
        if (delta.stop_reason) {
          yield { type: 'stop', stopReason: anthropicStopReasonToOurs(delta.stop_reason) };
        }
      }
    }
  }

  // ---------- builder privado ----------

  private buildRequest(
    messages: Message[],
    options: CompleteOptions,
    stream: boolean,
  ): { headers: Record<string, string>; body: AnthRequestBody } {
    const auth = getAnthropicAuth(this.env);
    if (!auth) {
      throw new ProviderError('AnthropicProvider: nenhuma credencial encontrada em env', this.name);
    }

    const isOAuth = auth.authType === 'oauth_token';

    // System: combina options.systemPrompt + role:system messages.
    // - OAuth: campo system fica com canonico Claude Code, e o system real
    //   do usuario e prepended a primeira user message (exigencia da API
    //   para tokens emitidos pelo claude setup-token).
    // - api_key: campo system recebe o conteudo combinado normalmente.
    const { system: combinedSystem, messages: anthMessages } = messagesToAnthropic(
      messages,
      options.systemPrompt,
      isOAuth,
    );
    const systemField = isOAuth ? ANTHROPIC_OAUTH_SYSTEM : combinedSystem;

    const tools = options.tools?.map(toolToAnthropic);

    const body: AnthRequestBody = {
      model: options.model,
      max_tokens: options.maxTokens ?? 4096,
      messages: anthMessages,
      ...(systemField !== undefined && {
        system: [{ type: 'text', text: systemField }],
      }),
      ...(options.temperature !== undefined && { temperature: options.temperature }),
      ...(options.topP !== undefined && { top_p: options.topP }),
      ...(options.stopSequences !== undefined && { stop_sequences: options.stopSequences }),
      ...(tools && tools.length > 0 && { tools }),
      ...(options.toolChoice !== undefined && {
        tool_choice: toolChoiceToAnthropic(options.toolChoice),
      }),
      ...(stream && { stream: true }),
    };

    const headers: Record<string, string> = {
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    };

    if (isOAuth) {
      headers['Authorization'] = `Bearer ${auth.credential}`;
      headers['anthropic-beta'] = ANTHROPIC_BETA_HEADER;
      headers['user-agent'] = ANTHROPIC_USER_AGENT;
      headers['x-app'] = 'cli';
    } else {
      headers['x-api-key'] = auth.credential;
    }

    return { headers, body };
  }
}

// ---------- translators (exportados para teste) ----------

// Combina systemHint + role:system messages.
// - isOAuth=false: retorna o combined em `system`, messages sem alteracao.
// - isOAuth=true: retorna `system: undefined` e prepende o combined a primeira
//   user message (exigencia da API quando o token vem de claude setup-token).
export function messagesToAnthropic(
  messages: Message[],
  systemHint?: string,
  isOAuth = false,
): { system: string | undefined; messages: AnthMessage[] } {
  const systemParts: string[] = [];
  if (systemHint !== undefined && systemHint.length > 0) systemParts.push(systemHint);

  const out: AnthMessage[] = [];
  let oauthSystemPrepended = false;

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemParts.push(msg.content);
      continue;
    }
    if (msg.role === 'tool') {
      out.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: msg.tool_call_id ?? 'unknown',
            content: msg.content,
          },
        ],
      });
      continue;
    }
    if (msg.role === 'user') {
      let content = msg.content;
      if (isOAuth && !oauthSystemPrepended && systemParts.length > 0) {
        content = `${systemParts.join('\n\n')}\n\n${content}`;
        oauthSystemPrepended = true;
      }
      out.push({ role: 'user', content });
      continue;
    }
    // assistant
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      const blocks: AnthBlock[] = [];
      if (msg.content.length > 0) blocks.push({ type: 'text', text: msg.content });
      for (const tc of msg.tool_calls) {
        blocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.input });
      }
      out.push({ role: 'assistant', content: blocks });
    } else {
      out.push({ role: 'assistant', content: msg.content });
    }
  }

  return {
    system: isOAuth ? undefined : systemParts.length > 0 ? systemParts.join('\n\n') : undefined,
    messages: out,
  };
}

export function toolToAnthropic(tool: ToolDefinition): AnthTool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  };
}

export function toolChoiceToAnthropic(choice: ToolChoice): AnthToolChoice {
  if (choice === 'auto') return { type: 'auto' };
  if (choice === 'none') return { type: 'none' };
  if (choice === 'required') return { type: 'any' };
  return { type: 'tool', name: choice.name };
}

export function anthropicStopReasonToOurs(reason: string | null | undefined): StopReason {
  switch (reason) {
    case 'end_turn':
      return 'end_turn';
    case 'tool_use':
      return 'tool_use';
    case 'max_tokens':
      return 'max_tokens';
    case 'stop_sequence':
      return 'stop_sequence';
    default:
      return 'error';
  }
}
