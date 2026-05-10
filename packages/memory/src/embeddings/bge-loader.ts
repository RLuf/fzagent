// Loader do BGE-base-en-v1.5: download on-demand de model.onnx + vocab.txt
// para ~/.cache/fzagent/models/. Idempotente (skip se ja existir).

import { createWriteStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import type { FzagentLogger } from '@fzagent/core';

const HF_BASE = 'https://huggingface.co/BAAI/bge-base-en-v1.5/resolve/main';
const MODEL_NAME = 'bge-base-en-v1.5';

export interface BgeAssets {
  modelPath: string;
  vocabPath: string;
  cacheDir: string;
}

export interface BgeLoaderOptions {
  cacheDir?: string;
  logger?: FzagentLogger;
  // override de URLs (testes / mirrors privados)
  modelUrl?: string;
  vocabUrl?: string;
}

export function defaultCacheDir(): string {
  return join(homedir(), '.cache', 'fzagent', 'models', MODEL_NAME);
}

// Garante que model.onnx e vocab.txt estao baixados em cacheDir.
// Retorna paths absolutos.
export async function ensureBgeAssets(opts: BgeLoaderOptions = {}): Promise<BgeAssets> {
  const cacheDir = opts.cacheDir ?? defaultCacheDir();
  const logger = opts.logger?.child({ scope: 'bge-loader' });
  mkdirSync(cacheDir, { recursive: true });

  const modelPath = join(cacheDir, 'model.onnx');
  const vocabPath = join(cacheDir, 'vocab.txt');

  if (!existsSync(modelPath) || statSync(modelPath).size < 1_000_000) {
    const url = opts.modelUrl ?? `${HF_BASE}/onnx/model.onnx`;
    logger?.info({ url, dest: modelPath }, 'downloading BGE model.onnx (~440MB)');
    await downloadTo(url, modelPath);
    logger?.info({ size: statSync(modelPath).size }, 'BGE model.onnx ready');
  }

  if (!existsSync(vocabPath) || statSync(vocabPath).size < 1000) {
    const url = opts.vocabUrl ?? `${HF_BASE}/vocab.txt`;
    logger?.info({ url, dest: vocabPath }, 'downloading BGE vocab.txt');
    await downloadTo(url, vocabPath);
  }

  return { modelPath, vocabPath, cacheDir };
}

async function downloadTo(url: string, dest: string): Promise<void> {
  mkdirSync(dirname(dest), { recursive: true });
  const resp = await fetch(url, { redirect: 'follow' });
  if (!resp.ok || !resp.body) {
    throw new Error(`bge-loader: HTTP ${resp.status} fetching ${url}`);
  }
  const tmp = `${dest}.part`;
  await pipeline(Readable.fromWeb(resp.body as never), createWriteStream(tmp));
  // atomic rename
  await import('node:fs/promises').then((fs) => fs.rename(tmp, dest));
}

// Util: le um arquivo de cache caso ja exista, sem baixar.
export function readVocabIfPresent(cacheDir = defaultCacheDir()): string | null {
  const p = join(cacheDir, 'vocab.txt');
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}
