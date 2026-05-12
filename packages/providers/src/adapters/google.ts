// GoogleProvider — invoca o `gemini` CLI local via subprocess.
//
// Decisao: o Google esta bloqueando OAuth para muitos casos de uso de
// servidor. Por enquanto o adapter delega para o Gemini CLI (`@google/gemini-cli`)
// instalado no PATH do usuario. O CLI gerencia auth (login, API key etc.)
// e nos so invocamos com -p "<prompt>" -m "<model>".
//
// LIMITACOES:
// - Tool calls nao sao suportadas via CLI (o stdout e texto puro).
// - Token usage nao e reportado pelo CLI.
// - Streaming e chunked-stdout (linhas) — convertemos em text-delta.
// - TODO(future): adapter direto via API key quando o usuario quiser pular o CLI.

import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';

import type { Message } from '@fzagent/core';
import { ProviderError } from '@fzagent/core';

import { BaseLLMProvider, type BaseProviderOptions } from '../base.js';
import type { CompleteOptions, CompleteResult, StopReason, StreamChunk } from '../types.js';

const DEFAULT_MODELS: readonly string[] = ['gemini-2.5-pro', 'gemini-2.5-flash'];

export interface GoogleAdapterOptions extends BaseProviderOptions {
  // Override do binario (default = 'gemini'). Util quando o usuario tem
  // outro executavel ou path absoluto.
  cliCommand?: string;
  // Permite injetar process.env-like (testes).
  env?: Record<string, string | undefined>;
}

export class GoogleProvider extends BaseLLMProvider {
  readonly name = 'google' as const;
  readonly models: readonly string[];
  // Gemini CLI nao expoe tool calling estruturado — stdout e texto puro.
  // Router precisa saber para nao roteear requests tool-using para ca.
  override readonly supportsTools = false;
  private readonly cliCommand: string;

  constructor(opts: GoogleAdapterOptions) {
    super(opts);
    this.models = opts.config.models.length > 0 ? opts.config.models : DEFAULT_MODELS;
    const env = opts.env ?? (process.env as Record<string, string | undefined>);
    this.cliCommand = opts.cliCommand ?? env['GEMINI_CLI_COMMAND'] ?? 'gemini';
  }

  async complete(messages: Message[], options: CompleteOptions): Promise<CompleteResult> {
    const prompt = formatMessagesForCLI(messages, options.systemPrompt);
    const useModel = this.models.includes(options.model) ? options.model : '';
    const args = buildGeminiArgs(prompt, useModel);
    const start = Date.now();

    const { stdout, stderr, exitCode } = await spawnCollect(this.cliCommand, args, options.signal);

    if (exitCode !== 0) {
      throw new ProviderError(
        `Gemini CLI exit ${exitCode}: ${stderr.trim() || 'no stderr'}`,
        this.name,
      );
    }

    const content = stdout.trim();
    this.logger.debug(
      { model: options.model, latencyMs: Date.now() - start, bytes: content.length },
      'google.complete ok (CLI)',
    );

    return {
      content,
      toolCalls: [],
      stopReason: 'end_turn' as StopReason,
      // CLI nao reporta tokens. Approximacoes futuras podem usar tokenizer local.
      usage: { inputTokens: 0, outputTokens: 0 },
      model: options.model,
      provider: 'google',
    };
  }

  async *stream(messages: Message[], options: CompleteOptions): AsyncIterable<StreamChunk> {
    const prompt = formatMessagesForCLI(messages, options.systemPrompt);
    const useModel = this.models.includes(options.model) ? options.model : '';
    const args = buildGeminiArgs(prompt, useModel);

    const child = spawn(this.cliCommand, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const onAbort = (): void => {
      child.kill('SIGTERM');
    };
    if (options.signal) {
      if (options.signal.aborted) onAbort();
      else options.signal.addEventListener('abort', onAbort, { once: true });
    }

    const decoder = new TextDecoder();
    const stderrChunks: string[] = [];
    child.stderr.on('data', (d: Buffer) => stderrChunks.push(decoder.decode(d)));

    const queue: string[] = [];
    let finished = false;
    let error: Error | undefined;
    let resolveNext: (() => void) | null = null;

    child.stdout.on('data', (d: Buffer) => {
      queue.push(decoder.decode(d));
      resolveNext?.();
      resolveNext = null;
    });
    child.on('error', (err) => {
      error = err;
      finished = true;
      resolveNext?.();
      resolveNext = null;
    });
    child.on('close', (code) => {
      if (code !== 0 && !error) {
        error = new ProviderError(
          `Gemini CLI exit ${code}: ${stderrChunks.join('').trim()}`,
          this.name,
        );
      }
      finished = true;
      resolveNext?.();
      resolveNext = null;
    });

    while (true) {
      if (queue.length > 0) {
        const chunk = queue.shift()!;
        if (chunk.length > 0) yield { type: 'text-delta', textDelta: chunk };
      } else if (finished) {
        if (error) throw error;
        yield { type: 'usage', usage: { inputTokens: 0, outputTokens: 0 } };
        yield { type: 'stop', stopReason: 'end_turn' };
        return;
      } else {
        await new Promise<void>((r) => {
          resolveNext = r;
        });
      }
    }
  }
}

// ---------- helpers (exportados para teste) ----------

export function formatMessagesForCLI(messages: Message[], systemHint?: string): string {
  const parts: string[] = [];
  if (systemHint !== undefined && systemHint.length > 0) {
    parts.push(`[system]\n${systemHint}`);
  }
  for (const msg of messages) {
    parts.push(`[${msg.role}]\n${msg.content}`);
  }
  return parts.join('\n\n');
}

export function buildGeminiArgs(prompt: string, model: string): string[] {
  const args = ['-p', prompt];
  if (model && model.length > 0) {
    args.push('-m', model);
  }
  return args;
}

interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function spawnCollect(
  command: string,
  args: string[],
  signal?: AbortSignal,
): Promise<SpawnResult> {
  return new Promise<SpawnResult>((resolve, reject) => {
    let child: ChildProcess;
    try {
      child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d: Buffer) => (stdout += d.toString('utf8')));
    child.stderr?.on('data', (d: Buffer) => (stderr += d.toString('utf8')));

    const onAbort = (): void => {
      child.kill('SIGTERM');
    };
    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }

    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });
  });
}
