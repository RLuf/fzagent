// Base class minimalista para adapters. Decisoes:
// 1. Retry/backoff fica no Router (FASE 3 final), nao na base — adapter so
//    faz UMA tentativa. Razao: separacao de responsabilidades + permite
//    politicas de retry diferentes por sessao.
// 2. AbortSignal e propagado direto para a SDK do provider quando suportado.
// 3. Logger filho com binding {provider} para facilitar grep.

import type { FzagentLogger, LLMProviderName, Message, ProviderConfig } from '@fzagent/core';

import type { CompleteOptions, CompleteResult, LLMProvider, StreamChunk } from './types.js';

export interface BaseProviderOptions {
  config: ProviderConfig;
  logger: FzagentLogger;
  defaultTimeoutMs?: number;
}

export abstract class BaseLLMProvider implements LLMProvider {
  abstract readonly name: LLMProviderName;
  abstract readonly models: readonly string[];

  protected readonly config: ProviderConfig;
  protected readonly logger: FzagentLogger;
  protected readonly defaultTimeoutMs: number;

  constructor(opts: BaseProviderOptions) {
    this.config = opts.config;
    this.logger = opts.logger.child({ provider: opts.config.name });
    this.defaultTimeoutMs = opts.defaultTimeoutMs ?? 60_000;
  }

  abstract complete(messages: Message[], options: CompleteOptions): Promise<CompleteResult>;

  abstract stream(messages: Message[], options: CompleteOptions): AsyncIterable<StreamChunk>;
}
