// MockProvider — implementacao em memoria para testes do router e do agente.
// Aceita callbacks customizados ou uma fila de respostas pre-canned.
// NAO faz validacao do schema de inputs/tools — confiamos nos chamadores.

import type { LLMProviderName, Message } from '@fzagent/core';

import type { CompleteOptions, CompleteResult, LLMProvider, StreamChunk, Usage } from '../types.js';

export interface MockBehavior {
  // Retorna a proxima resposta da fila ou aplica fn(messages, options).
  responses?: CompleteResult[];
  fn?: (messages: Message[], options: CompleteOptions) => Promise<CompleteResult> | CompleteResult;
  // Erro a lancar; sobrescreve responses/fn.
  error?: unknown;
  // Stream chunks pre-canned.
  streamChunks?: StreamChunk[];
  // Override do supportsTools (default true). Permite testar skip behavior
  // do router quando um provider declara false.
  supportsTools?: boolean;
}

export class MockProvider implements LLMProvider {
  readonly name: LLMProviderName;
  readonly models: readonly string[];
  readonly supportsTools: boolean;
  public callCount = 0;
  public lastMessages: Message[] = [];
  public lastOptions: CompleteOptions | undefined;

  constructor(
    name: LLMProviderName,
    models: readonly string[] = ['mock-model'],
    private readonly behavior: MockBehavior = {},
  ) {
    this.name = name;
    this.models = models;
    this.supportsTools = behavior.supportsTools ?? true;
  }

  async complete(messages: Message[], options: CompleteOptions): Promise<CompleteResult> {
    this.callCount += 1;
    this.lastMessages = messages;
    this.lastOptions = options;
    if (this.behavior.error !== undefined) {
      throw this.behavior.error;
    }
    if (this.behavior.fn) {
      return await this.behavior.fn(messages, options);
    }
    if (this.behavior.responses && this.behavior.responses.length > 0) {
      const idx = Math.min(this.callCount - 1, this.behavior.responses.length - 1);
      return this.behavior.responses[idx]!;
    }
    return defaultMockResult(this.name, options.model);
  }

  async *stream(_messages: Message[], _options: CompleteOptions): AsyncIterable<StreamChunk> {
    if (this.behavior.error !== undefined) throw this.behavior.error;
    for (const chunk of this.behavior.streamChunks ?? []) {
      yield chunk;
    }
  }
}

function defaultMockResult(provider: LLMProviderName, model: string): CompleteResult {
  const usage: Usage = { inputTokens: 1, outputTokens: 1 };
  return {
    content: `[mock:${provider}] ok`,
    toolCalls: [],
    stopReason: 'end_turn',
    usage,
    model,
    provider,
  };
}
