// Contrato canonico de provider de LLM. Decisoes:
// 1. complete() retorna resposta completa; stream() emite chunks via async iterable.
// 2. ToolDefinition usa JSON Schema cru — cada adapter traduz para o dialeto
//    do provider (Anthropic input_schema, OpenAI parameters, Google parameters).
// 3. Stop reasons normalizados: end_turn (resposta natural), tool_use (modelo
//    pediu tool), max_tokens, stop_sequence, error.
// 4. Usage com input/output tokens e (opcional) prompt-cache info da Anthropic.

import type { LLMProviderName, Message, ToolCall } from '@fzagent/core';

export interface ToolDefinition {
  name: string;
  description: string;
  // JSON Schema (Draft-07 compativel) descrevendo o input da tool.
  inputSchema: Record<string, unknown>;
}

export type ToolChoice = 'auto' | 'none' | 'required' | { name: string };

export interface CompleteOptions {
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  // systemPrompt sobrescreve qualquer Message{role:'system'} em messages.
  systemPrompt?: string;
  tools?: ToolDefinition[];
  toolChoice?: ToolChoice;
  signal?: AbortSignal;
  // metadata pass-through (e.g., user_id) — usada por providers que aceitam.
  metadata?: Record<string, string>;
}

export type StopReason = 'end_turn' | 'tool_use' | 'stop_sequence' | 'max_tokens' | 'error';

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  // prompt-cache (Anthropic): tokens criados/lidos do cache.
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
}

export interface CompleteResult {
  content: string;
  toolCalls: ToolCall[];
  stopReason: StopReason;
  usage: Usage;
  // model retornado pelo provider (pode diferir do solicitado em routing layers)
  model: string;
  provider: LLMProviderName;
}

// Streaming chunks discriminados por type.
// Adapters sao responsaveis por agregar inputJsonDelta em input completo
// quando emitirem 'tool-call-end'.
export type StreamChunk =
  | { type: 'text-delta'; textDelta: string }
  | { type: 'tool-call-start'; toolCallId: string; toolName: string }
  | { type: 'tool-call-delta'; toolCallId: string; inputJsonDelta: string }
  | { type: 'tool-call-end'; toolCallId: string; input: Record<string, unknown> }
  | { type: 'usage'; usage: Usage }
  | { type: 'stop'; stopReason: StopReason };

export interface LLMProvider {
  readonly name: LLMProviderName;
  readonly models: readonly string[];
  complete(messages: Message[], options: CompleteOptions): Promise<CompleteResult>;
  stream(messages: Message[], options: CompleteOptions): AsyncIterable<StreamChunk>;
}
