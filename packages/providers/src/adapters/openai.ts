// OpenAIProvider — gpt-4o e familia. Abstrai a logica em
// OpenAIProtocolProvider (abstract) para permitir reuso pelo OpenRouter sem
// herdar o tipo literal '"openai"' de name.
//
// Decisoes:
// 1. system messages aparecem como role:'system' no array (nao tem campo separado).
// 2. assistant com tool_calls usa formato OpenAI: tool_calls com function.arguments
//    como JSON string; precisamos parse no retorno.
// 3. tool messages usam role:'tool' com tool_call_id.

import OpenAI from 'openai';

import type { LLMProviderName, Message, ToolCall } from '@fzagent/core';
import { ProviderError } from '@fzagent/core';

import { BaseLLMProvider, type BaseProviderOptions } from '../base.js';
import type {
  CompleteOptions,
  CompleteResult,
  StopReason,
  StreamChunk,
  ToolChoice,
  ToolDefinition,
} from '../types.js';
import { buildToolNameMap, denormalizeToolName, sanitizeToolName } from '../utils/tool-names.js';

const DEFAULT_OPENAI_MODELS: readonly string[] = ['gpt-4o', 'gpt-4o-mini'];

// Abstract base — implementa a logica usando this.client e this.name.
// Subclasses fornecem name (literal), models, client (configurado).
export abstract class OpenAIProtocolProvider extends BaseLLMProvider {
  abstract override readonly name: LLMProviderName;
  abstract override readonly models: readonly string[];
  protected abstract readonly client: OpenAI;

  async complete(messages: Message[], options: CompleteOptions): Promise<CompleteResult> {
    const oaiMessages = messagesToOpenAI(messages, options.systemPrompt);
    const tools = options.tools?.map(toolToOpenAI);
    // Map sanitized -> original para denormalizar names retornados pela API.
    const nameMap = buildToolNameMap(options.tools);
    const start = Date.now();

    const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
      model: options.model,
      messages: oaiMessages,
      ...(options.maxTokens !== undefined && { max_tokens: options.maxTokens }),
      ...(options.temperature !== undefined && { temperature: options.temperature }),
      ...(options.topP !== undefined && { top_p: options.topP }),
      ...(options.stopSequences !== undefined && { stop: options.stopSequences }),
      ...(tools && tools.length > 0 && { tools }),
      ...(options.toolChoice !== undefined && {
        tool_choice: toolChoiceToOpenAI(options.toolChoice),
      }),
    };

    const reqOpts = options.signal !== undefined ? { signal: options.signal } : undefined;
    const resp = await this.client.chat.completions.create(params, reqOpts);

    const choice = resp.choices[0];
    if (!choice) {
      throw new ProviderError(`${this.name} returned no choices`, this.name);
    }

    const content = choice.message.content ?? '';
    const toolCalls: ToolCall[] = [];
    for (const tc of choice.message.tool_calls ?? []) {
      if (tc.type === 'function') {
        let input: Record<string, unknown>;
        try {
          input = JSON.parse(tc.function.arguments) as Record<string, unknown>;
        } catch {
          input = { _raw: tc.function.arguments };
        }
        toolCalls.push({
          id: tc.id,
          name: denormalizeToolName(tc.function.name, nameMap),
          input,
        });
      }
    }

    this.logger.debug(
      {
        model: options.model,
        latencyMs: Date.now() - start,
        toolCalls: toolCalls.length,
        finishReason: choice.finish_reason,
      },
      `${this.name}.complete ok`,
    );

    return {
      content,
      toolCalls,
      stopReason: openaiFinishReasonToOurs(choice.finish_reason),
      usage: {
        inputTokens: resp.usage?.prompt_tokens ?? 0,
        outputTokens: resp.usage?.completion_tokens ?? 0,
      },
      model: resp.model,
      provider: this.name,
    };
  }

  async *stream(messages: Message[], options: CompleteOptions): AsyncIterable<StreamChunk> {
    const oaiMessages = messagesToOpenAI(messages, options.systemPrompt);
    const tools = options.tools?.map(toolToOpenAI);
    const nameMap = buildToolNameMap(options.tools);

    const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
      model: options.model,
      messages: oaiMessages,
      stream: true,
      ...(options.maxTokens !== undefined && { max_tokens: options.maxTokens }),
      ...(options.temperature !== undefined && { temperature: options.temperature }),
      ...(tools && tools.length > 0 && { tools }),
      ...(options.toolChoice !== undefined && {
        tool_choice: toolChoiceToOpenAI(options.toolChoice),
      }),
    };

    const reqOpts = options.signal !== undefined ? { signal: options.signal } : undefined;
    const stream = await this.client.chat.completions.create(params, reqOpts);

    const toolAcc = new Map<number, { id: string; name: string; json: string; started: boolean }>();

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;
      const delta = choice.delta;

      if (delta.content) {
        yield { type: 'text-delta', textDelta: delta.content };
      }

      if (delta.tool_calls) {
        for (const tcDelta of delta.tool_calls) {
          const idx = tcDelta.index;
          const acc = toolAcc.get(idx) ?? {
            id: '',
            name: '',
            json: '',
            started: false,
          };
          if (tcDelta.id !== undefined) acc.id = tcDelta.id;
          if (tcDelta.function?.name !== undefined) {
            // Denormaliza nome (shell_exec -> shell.exec) imediatamente para
            // que tool-call-start ja saia com nome canonico.
            acc.name = denormalizeToolName(tcDelta.function.name, nameMap);
          }
          if (!acc.started && acc.id && acc.name) {
            acc.started = true;
            yield { type: 'tool-call-start', toolCallId: acc.id, toolName: acc.name };
          }
          if (tcDelta.function?.arguments !== undefined) {
            acc.json += tcDelta.function.arguments;
            if (acc.started) {
              yield {
                type: 'tool-call-delta',
                toolCallId: acc.id,
                inputJsonDelta: tcDelta.function.arguments,
              };
            }
          }
          toolAcc.set(idx, acc);
        }
      }

      if (choice.finish_reason !== null && choice.finish_reason !== undefined) {
        for (const acc of toolAcc.values()) {
          if (acc.started) {
            let input: Record<string, unknown>;
            try {
              input = acc.json ? (JSON.parse(acc.json) as Record<string, unknown>) : {};
            } catch {
              input = { _raw: acc.json };
            }
            yield { type: 'tool-call-end', toolCallId: acc.id, input };
          }
        }
        if (chunk.usage) {
          yield {
            type: 'usage',
            usage: {
              inputTokens: chunk.usage.prompt_tokens ?? 0,
              outputTokens: chunk.usage.completion_tokens ?? 0,
            },
          };
        }
        yield { type: 'stop', stopReason: openaiFinishReasonToOurs(choice.finish_reason) };
      }
    }
  }
}

export class OpenAIProvider extends OpenAIProtocolProvider {
  override readonly name = 'openai' as const;
  override readonly models: readonly string[];
  protected readonly client: OpenAI;

  constructor(opts: BaseProviderOptions) {
    super(opts);
    if (!opts.config.apiKey) {
      throw new ProviderError('OpenAIProvider requires apiKey', 'openai');
    }
    this.models = opts.config.models.length > 0 ? opts.config.models : DEFAULT_OPENAI_MODELS;
    this.client = new OpenAI({
      apiKey: opts.config.apiKey,
      ...(opts.config.baseUrl !== undefined && { baseURL: opts.config.baseUrl }),
      timeout: this.defaultTimeoutMs,
    });
  }
}

// ---------- translators (exportados) ----------

export function messagesToOpenAI(
  messages: Message[],
  systemHint?: string,
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const out: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (systemHint !== undefined && systemHint.length > 0) {
    out.push({ role: 'system', content: systemHint });
  }

  for (const msg of messages) {
    if (msg.role === 'system') {
      out.push({ role: 'system', content: msg.content });
      continue;
    }
    if (msg.role === 'tool') {
      out.push({
        role: 'tool',
        tool_call_id: msg.tool_call_id ?? 'unknown',
        content: msg.content,
      });
      continue;
    }
    if (msg.role === 'user') {
      out.push({ role: 'user', content: msg.content });
      continue;
    }
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      out.push({
        role: 'assistant',
        content: msg.content,
        tool_calls: msg.tool_calls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          // OpenAI/OpenRouter exigem regex ^[a-zA-Z0-9_-]{1,64}$ no name.
          // Sanitiza historico outbound; ToolCall em CompleteResult ja sai
          // denormalizado (via denormalizeToolName em complete()/stream()).
          function: { name: sanitizeToolName(tc.name), arguments: JSON.stringify(tc.input) },
        })),
      });
    } else {
      out.push({ role: 'assistant', content: msg.content });
    }
  }
  return out;
}

export function toolToOpenAI(tool: ToolDefinition): OpenAI.Chat.Completions.ChatCompletionTool {
  return {
    type: 'function',
    function: {
      // Sanitiza nome para casar regex da API (^[a-zA-Z0-9_-]{1,64}$).
      name: sanitizeToolName(tool.name),
      description: tool.description,
      parameters: tool.inputSchema as Record<string, unknown>,
    },
  };
}

export function toolChoiceToOpenAI(
  choice: ToolChoice,
): OpenAI.Chat.Completions.ChatCompletionToolChoiceOption {
  if (choice === 'auto') return 'auto';
  if (choice === 'none') return 'none';
  if (choice === 'required') return 'required';
  return { type: 'function', function: { name: choice.name } };
}

export function openaiFinishReasonToOurs(reason: string | null | undefined): StopReason {
  switch (reason) {
    case 'stop':
      return 'end_turn';
    case 'tool_calls':
      return 'tool_use';
    case 'length':
      return 'max_tokens';
    case 'content_filter':
      return 'error';
    default:
      return 'error';
  }
}
