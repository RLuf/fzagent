// OpenRouterProvider — protocolo OpenAI-compatible com baseURL OpenRouter.
//
// Decisoes:
// 1. Usa OPENROUTER_API_KEY do env (Bearer token).
// 2. Headers HTTP-Referer e X-Title sao opcionais — recomendados para
//    aparecer no dashboard do OpenRouter.
// 3. listFreeModels() filtra modelos com sufixo `:free` no slug e expoe
//    para que o ProviderRouter possa priorizar os gratuitos quando
//    quiser economizar credito.

import OpenAI from 'openai';

import { ProviderError } from '@fzagent/core';

import type { BaseProviderOptions } from '../base.js';
import { fetchWithTimeout } from '../utils/fetch.js';
import { OpenAIProtocolProvider } from './openai.js';

const DEFAULT_MODELS: readonly string[] = [
  'qwen/qwen3-coder:free',
  'meta-llama/llama-3.3-70b:free',
  'google/gemini-2.0-flash-exp:free',
];

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

interface OpenRouterModelEntry {
  id: string;
  name?: string;
  pricing?: { prompt?: string; completion?: string };
}

interface OpenRouterModelsResponse {
  data: OpenRouterModelEntry[];
}

export class OpenRouterProvider extends OpenAIProtocolProvider {
  override readonly name = 'openrouter' as const;
  override readonly models: readonly string[];
  protected readonly client: OpenAI;
  private readonly baseURL: string;
  private readonly apiKey: string;

  constructor(opts: BaseProviderOptions) {
    super(opts);
    if (!opts.config.apiKey) {
      throw new ProviderError('OpenRouterProvider requires apiKey', 'openrouter');
    }
    this.apiKey = opts.config.apiKey;
    this.baseURL = opts.config.baseUrl ?? DEFAULT_BASE_URL;
    this.models = opts.config.models.length > 0 ? opts.config.models : DEFAULT_MODELS;

    const headers: Record<string, string> = {};
    if (opts.config.referer !== undefined) headers['HTTP-Referer'] = opts.config.referer;
    if (opts.config.title !== undefined) headers['X-Title'] = opts.config.title;

    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL,
      timeout: this.defaultTimeoutMs,
      ...(Object.keys(headers).length > 0 && { defaultHeaders: headers }),
    });
  }

  // Lista TODOS os modelos disponiveis no OpenRouter.
  async listAllModels(signal?: AbortSignal): Promise<OpenRouterModelEntry[]> {
    const reqInit: Parameters<typeof fetchWithTimeout>[1] = {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    };
    if (signal !== undefined) reqInit.signal = signal;
    const resp = await fetchWithTimeout(`${this.baseURL}/models`, reqInit, 'openrouter');
    if (!resp.ok) {
      throw new ProviderError(`OpenRouter listAllModels HTTP ${resp.status}`, this.name);
    }
    const data = (await resp.json()) as OpenRouterModelsResponse;
    return data.data ?? [];
  }

  // Filtra modelos com sufixo `:free` (preco zero garantido pelo OpenRouter).
  // Util para priorizar quando o orcamento esta apertado.
  async listFreeModels(signal?: AbortSignal): Promise<string[]> {
    const all = await this.listAllModels(signal);
    return all.filter((m) => m.id.endsWith(':free')).map((m) => m.id);
  }
}
