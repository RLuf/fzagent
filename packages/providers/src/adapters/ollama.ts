// OllamaProvider — Ollama local via fetch nativo (sem SDK).
// Decisoes:
// 1. /api/chat e o endpoint canonico (mais novo que /api/generate).
// 2. tools sao suportadas em modelos compativeis (qwen3, llama3.x, mistral).
//    Modelos sem suporte vao ignorar o campo silenciosamente.
// 3. Streaming = NDJSON (uma linha JSON por chunk).
// 4. Sem rate limiting/auth — Ollama default e local.
// 5. Erros HTTP 5xx do Ollama (status field) sao retentaveis pelo router.

import type { Message, ToolCall } from '@fzagent/core';
import { ProviderError } from '@fzagent/core';

import { BaseLLMProvider, type BaseProviderOptions } from '../base.js';
import type {
  CompleteOptions,
  CompleteResult,
  StopReason,
  StreamChunk,
  ToolDefinition,
} from '../types.js';

// Default models: aceitam tanto modelos locais (qwen3, phi3, gemma3, llama3.2)
// quanto modelos cloud expostos pelo proxy Ollama (papaimach na rede).
const DEFAULT_MODELS: readonly string[] = [
  'qwen3:14b',
  'qwen3-coder:30b',
  'phi3:medium',
  'gemma3:12b',
  'llama3.2:3b',
];

// Default URL aponta para o servidor papaimach (rede local). Override
// via env OLLAMA_BASE_URL para localhost ou cloud.
const DEFAULT_BASE_URL = 'http://192.168.0.101:11434';

interface OllamaToolCall {
  function: { name: string; arguments: Record<string, unknown> };
}

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: OllamaToolCall[];
  // tool result (when role === 'tool')
  tool_name?: string;
}

interface OllamaChatResponse {
  message: OllamaMessage;
  done: boolean;
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
  model: string;
}

export class OllamaProvider extends BaseLLMProvider {
  readonly name = 'ollama' as const;
  readonly models: readonly string[];
  private readonly baseUrl: string;

  constructor(opts: BaseProviderOptions) {
    super(opts);
    this.models = opts.config.models.length > 0 ? opts.config.models : DEFAULT_MODELS;
    this.baseUrl = (opts.config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  }

  async complete(messages: Message[], options: CompleteOptions): Promise<CompleteResult> {
    const ollamaMessages = messagesToOllama(messages, options.systemPrompt);
    const tools = options.tools?.map(toolToOllama);

    const body: Record<string, unknown> = {
      model: options.model,
      messages: ollamaMessages,
      stream: false,
      options: {
        ...(options.temperature !== undefined && { temperature: options.temperature }),
        ...(options.topP !== undefined && { top_p: options.topP }),
        ...(options.maxTokens !== undefined && { num_predict: options.maxTokens }),
        ...(options.stopSequences !== undefined && { stop: options.stopSequences }),
      },
    };
    if (tools && tools.length > 0) body['tools'] = tools;

    const start = Date.now();
    const url = `${this.baseUrl}/api/chat`;

    const reqInit: RequestInit = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    };
    if (options.signal !== undefined) reqInit.signal = options.signal;

    const resp = await fetch(url, reqInit);
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw Object.assign(new ProviderError(`Ollama HTTP ${resp.status}: ${text}`, this.name), {
        status: resp.status,
      });
    }
    const data = (await resp.json()) as OllamaChatResponse;

    const content = data.message.content;
    const toolCalls: ToolCall[] = [];
    for (const tc of data.message.tool_calls ?? []) {
      toolCalls.push({
        id: `${this.name}-${toolCalls.length}`,
        name: tc.function.name,
        input: tc.function.arguments,
      });
    }

    this.logger.debug(
      { model: options.model, latencyMs: Date.now() - start, toolCalls: toolCalls.length },
      'ollama.complete ok',
    );

    return {
      content,
      toolCalls,
      stopReason: ollamaDoneReasonToOurs(data.done_reason, toolCalls.length > 0),
      usage: {
        inputTokens: data.prompt_eval_count ?? 0,
        outputTokens: data.eval_count ?? 0,
      },
      model: data.model,
      provider: 'ollama',
    };
  }

  async *stream(messages: Message[], options: CompleteOptions): AsyncIterable<StreamChunk> {
    const ollamaMessages = messagesToOllama(messages, options.systemPrompt);
    const tools = options.tools?.map(toolToOllama);

    const body: Record<string, unknown> = {
      model: options.model,
      messages: ollamaMessages,
      stream: true,
      options: {
        ...(options.temperature !== undefined && { temperature: options.temperature }),
        ...(options.maxTokens !== undefined && { num_predict: options.maxTokens }),
      },
    };
    if (tools && tools.length > 0) body['tools'] = tools;

    const reqInit: RequestInit = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    };
    if (options.signal !== undefined) reqInit.signal = options.signal;

    const resp = await fetch(`${this.baseUrl}/api/chat`, reqInit);
    if (!resp.ok) {
      throw Object.assign(new ProviderError(`Ollama HTTP ${resp.status}`, this.name), {
        status: resp.status,
      });
    }
    if (!resp.body) {
      throw new ProviderError('Ollama returned empty body', this.name);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let toolIdx = 0;
    let usage: { inputTokens: number; outputTokens: number } | undefined;
    let stopReason: StopReason = 'error';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let lineEnd = buffer.indexOf('\n');
      while (lineEnd !== -1) {
        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);
        lineEnd = buffer.indexOf('\n');
        if (!line) continue;

        let parsed: OllamaChatResponse;
        try {
          parsed = JSON.parse(line) as OllamaChatResponse;
        } catch {
          continue;
        }

        if (parsed.message.content) {
          yield { type: 'text-delta', textDelta: parsed.message.content };
        }
        for (const tc of parsed.message.tool_calls ?? []) {
          const id = `${this.name}-${toolIdx++}`;
          yield { type: 'tool-call-start', toolCallId: id, toolName: tc.function.name };
          yield {
            type: 'tool-call-delta',
            toolCallId: id,
            inputJsonDelta: JSON.stringify(tc.function.arguments),
          };
          yield { type: 'tool-call-end', toolCallId: id, input: tc.function.arguments };
        }
        if (parsed.done) {
          usage = {
            inputTokens: parsed.prompt_eval_count ?? 0,
            outputTokens: parsed.eval_count ?? 0,
          };
          stopReason = ollamaDoneReasonToOurs(parsed.done_reason, false);
        }
      }
    }

    if (usage) yield { type: 'usage', usage };
    yield { type: 'stop', stopReason };
  }
}

// ---------- translators ----------

export function messagesToOllama(messages: Message[], systemHint?: string): OllamaMessage[] {
  const out: OllamaMessage[] = [];
  if (systemHint !== undefined && systemHint.length > 0) {
    out.push({ role: 'system', content: systemHint });
  }
  for (const msg of messages) {
    if (msg.role === 'system') {
      out.push({ role: 'system', content: msg.content });
    } else if (msg.role === 'user') {
      out.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'tool') {
      out.push({ role: 'tool', content: msg.content, tool_name: msg.tool_call_id ?? 'unknown' });
    } else {
      // assistant
      const m: OllamaMessage = { role: 'assistant', content: msg.content };
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        m.tool_calls = msg.tool_calls.map((tc) => ({
          function: { name: tc.name, arguments: tc.input },
        }));
      }
      out.push(m);
    }
  }
  return out;
}

export function toolToOllama(tool: ToolDefinition): {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
} {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  };
}

export function ollamaDoneReasonToOurs(
  reason: string | undefined,
  hasToolCalls: boolean,
): StopReason {
  if (hasToolCalls) return 'tool_use';
  switch (reason) {
    case 'stop':
      return 'end_turn';
    case 'length':
      return 'max_tokens';
    default:
      return 'end_turn';
  }
}
