// GoogleProvider — suporte nativo a Google Generative AI (Gemini) com Tool Calling.
//
// Este adapter substitui a versao CLI por uma integracao direta via SDK.
// Permite suporte completo a ferramentas, streaming e contagem de tokens.
//
// Decisoes:
// 1. Usa @google/generative-ai para chamadas diretas.
// 2. Transpila mensagens do fzagent para o formato do Gemini.
// 3. Suporta Tool Calling (function calling) nativamente.

import {
  GoogleGenerativeAI,
  type Content,
  type GenerateContentRequest,
  type Part,
  type Tool,
  type GenerationConfig,
  type ModelParams,
} from '@google/generative-ai';

import type { Message, ToolCall } from '@fzagent/core';
import { ProviderError } from '@fzagent/core';

import { BaseLLMProvider, type BaseProviderOptions } from '../base.js';
import { buildToolNameMap, denormalizeToolName, sanitizeToolName } from '../utils/tool-names.js';
import type {
  CompleteOptions,
  CompleteResult,
  StopReason,
  StreamChunk,
  ToolDefinition,
} from '../types.js';

export class GoogleProvider extends BaseLLMProvider {
  readonly name = 'google' as const;
  readonly models: readonly string[];
  override readonly supportsTools = true;
  private readonly genAI: GoogleGenerativeAI;

  constructor(opts: BaseProviderOptions) {
    super(opts);
    if (!opts.config.apiKey) {
      throw new ProviderError('GoogleProvider requires GOOGLE_API_KEY', 'google');
    }
    if (!opts.config.models || opts.config.models.length === 0) {
      throw new ProviderError(
        'GoogleProvider: Nao ha modelos configurados em MODELS_GOOGLE no fzagent.conf',
        'google',
      );
    }
    this.models = opts.config.models;
    this.genAI = new GoogleGenerativeAI(opts.config.apiKey);
  }

  async complete(messages: Message[], options: CompleteOptions): Promise<CompleteResult> {
    const start = Date.now();
    const modelId: string = options.model || (this.models[0] as string);

    const modelParams: ModelParams = { model: modelId };
    if (options.systemPrompt) modelParams.systemInstruction = options.systemPrompt;

    const model = this.genAI.getGenerativeModel(modelParams);

    const contents = messagesToGemini(messages);
    const tools = options.tools ? [toolsToGemini(options.tools)] : undefined;
    const nameMap = buildToolNameMap(options.tools);

    const generationConfig: GenerationConfig = {};
    if (options.maxTokens !== undefined) generationConfig.maxOutputTokens = options.maxTokens;
    if (options.temperature !== undefined) generationConfig.temperature = options.temperature;
    if (options.topP !== undefined) generationConfig.topP = options.topP;
    if (options.stopSequences !== undefined) generationConfig.stopSequences = options.stopSequences;

    const request: GenerateContentRequest = {
      contents,
      ...(tools && { tools }),
      generationConfig,
    };

    try {
      const result = await model.generateContent(request);
      const response = result.response;
      const candidates = response.candidates || [];
      const firstCandidate = candidates[0];

      if (!firstCandidate) {
        throw new ProviderError('No candidates returned from Google', 'google');
      }

      const parts = firstCandidate.content.parts || [];
      let content = '';
      const toolCalls: ToolCall[] = [];

      for (const part of parts) {
        if (part.text) content += part.text;
        if (part.functionCall) {
          toolCalls.push({
            id: 'call_' + Math.random().toString(36).substring(2, 9),
            name: denormalizeToolName(part.functionCall.name, nameMap),
            input: (part.functionCall.args as Record<string, unknown>) || {},
          });
        }
      }

      this.logger.debug(
        {
          model: modelId,
          latencyMs: Date.now() - start,
          toolCalls: toolCalls.length,
        },
        'google.complete ok',
      );

      return {
        content,
        toolCalls,
        stopReason: geminiFinishReasonToOurs(firstCandidate.finishReason),
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        },
        model: modelId,
        provider: 'google',
      };
    } catch (err) {
      throw new ProviderError(
        `Google API Error: ${err instanceof Error ? err.message : String(err)}`,
        'google',
      );
    }
  }

  async *stream(messages: Message[], options: CompleteOptions): AsyncIterable<StreamChunk> {
    const modelId: string = options.model || (this.models[0] as string);

    const modelParams: ModelParams = { model: modelId };
    if (options.systemPrompt) modelParams.systemInstruction = options.systemPrompt;

    const model = this.genAI.getGenerativeModel(modelParams);

    const contents = messagesToGemini(messages);
    const tools = options.tools ? [toolsToGemini(options.tools)] : undefined;
    const nameMap = buildToolNameMap(options.tools);

    const generationConfig: GenerationConfig = {};
    if (options.maxTokens !== undefined) generationConfig.maxOutputTokens = options.maxTokens;
    if (options.temperature !== undefined) generationConfig.temperature = options.temperature;

    const request: GenerateContentRequest = {
      contents,
      ...(tools && { tools }),
      generationConfig,
    };

    try {
      const result = await model.generateContentStream(request);

      for await (const chunk of result.stream) {
        const parts = chunk.candidates?.[0]?.content.parts || [];
        for (const part of parts) {
          if (part.text) {
            yield { type: 'text-delta', textDelta: part.text };
          }
          if (part.functionCall) {
            const toolCallId = 'call_' + Math.random().toString(36).substring(2, 9);
            yield {
              type: 'tool-call-start',
              toolCallId,
              toolName: denormalizeToolName(part.functionCall.name, nameMap),
            };
            yield {
              type: 'tool-call-end',
              toolCallId,
              input: (part.functionCall.args as Record<string, unknown>) || {},
            };
          }
        }
      }

      const finalResponse = await result.response;
      yield {
        type: 'usage',
        usage: {
          inputTokens: finalResponse.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: finalResponse.usageMetadata?.candidatesTokenCount ?? 0,
        },
      };
      yield { type: 'stop', stopReason: 'end_turn' };
    } catch (err) {
      throw new ProviderError(
        `Google Stream Error: ${err instanceof Error ? err.message : String(err)}`,
        'google',
      );
    }
  }
}

// ---------- Helpers ----------

function messagesToGemini(messages: Message[]): Content[] {
  const contents: Content[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || msg.role === 'system') continue;

    const parts: Part[] = [];

    if (msg.role === 'tool') {
      // Procura o nome da ferramenta na mensagem anterior (que deve ser a do assistente com o tool_call)
      let toolName = 'unknown';
      for (let j = i - 1; j >= 0; j--) {
        const prev = messages[j];
        if (!prev) continue;
        const tc = prev.tool_calls?.find((t) => t.id === msg.tool_call_id);
        if (tc) {
          toolName = tc.name;
          break;
        }
      }

      parts.push({
        functionResponse: {
          name: sanitizeToolName(toolName),
          response: { result: msg.content },
        },
      });
      contents.push({ role: 'function', parts });
      continue;
    }

    if (msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        parts.push({
          functionCall: {
            name: sanitizeToolName(tc.name),
            args: (tc.input as Record<string, unknown>) || {},
          },
        });
      }
    }

    if (msg.content) {
      parts.push({ text: msg.content });
    }

    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts,
    });
  }

  return contents;
}

function toolsToGemini(tools: ToolDefinition[]): Tool {
  return {
    functionDeclarations: tools.map((t) => ({
      name: sanitizeToolName(t.name),
      description: t.description,
      parameters: t.inputSchema as any,
    })),
  };
}

function geminiFinishReasonToOurs(reason: string | undefined): StopReason {
  switch (reason) {
    case 'STOP':
      return 'end_turn';
    case 'MAX_TOKENS':
      return 'max_tokens';
    case 'SAFETY':
      return 'error';
    default:
      return 'end_turn';
  }
}
