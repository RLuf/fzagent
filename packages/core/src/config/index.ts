// Config loader: le .env e fzagent.conf, valida com Zod, retorna { conf, env }.
// Ordem de precedencia (do mais forte para o mais fraco):
//   1. process.env (injetado pelo OS / container)
//   2. arquivo .env
//   3. arquivo fzagent.conf
//   4. defaults dos schemas
// Decisoes:
// - Sem dotenv como dependencia — parser proprio (parseConfFile) cobre o caso.
// - .env e fzagent.conf compartilham keys quando faz sentido (e.g., LOG_LEVEL).
// - Schemas separados (FzagentConfSchema vs EnvSchema) garantem que cada um
//   so valide o que e seu, mas o merge feito aqui permite usar arquivos
//   intercambiavelmente.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ConfigError } from '../errors/index.js';
import { parseConfFile } from './parser.js';
import { EnvSchema, FzagentConfSchema, type FzagentConf, type FzagentEnv } from './schema.js';

export interface LoadConfigOptions {
  cwd?: string;
  confPath?: string;
  envPath?: string;
  // Override do process.env (util em testes).
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  // Se true, ignora arquivos no disco e usa apenas `env` + defaults.
  ignoreFiles?: boolean;
}

export interface LoadedConfig {
  conf: FzagentConf;
  env: FzagentEnv;
}

export function loadConfig(opts: LoadConfigOptions = {}): LoadedConfig {
  const cwd = opts.cwd ?? process.cwd();
  const ignoreFiles = opts.ignoreFiles ?? false;

  // 1. .env (se existir e nao ignorado)
  const envPath = opts.envPath ?? resolve(cwd, '.env');
  const fileEnv: Record<string, string> =
    !ignoreFiles && existsSync(envPath) ? parseConfFile(readFileSync(envPath, 'utf8')) : {};

  // 2. fzagent.conf (se existir e nao ignorado)
  const confPath = opts.confPath ?? resolve(cwd, 'fzagent.conf');
  const fileConf: Record<string, string> =
    !ignoreFiles && existsSync(confPath) ? parseConfFile(readFileSync(confPath, 'utf8')) : {};

  // 3. process.env (precedencia maxima)
  const processEnv = (opts.env ?? process.env) as Record<string, string | undefined>;

  // Merge: fileConf < fileEnv < processEnv. Filtra undefined para nao
  // sobrescrever defaults com vazio.
  const merged: Record<string, string> = { ...fileConf, ...fileEnv };
  for (const [k, v] of Object.entries(processEnv)) {
    if (typeof v === 'string') merged[k] = v;
  }

  const confResult = FzagentConfSchema.safeParse(merged);
  if (!confResult.success) {
    throw new ConfigError(`fzagent.conf invalido: ${formatZodIssues(confResult.error.issues)}`, {
      cause: confResult.error,
    });
  }

  const envResult = EnvSchema.safeParse(merged);
  if (!envResult.success) {
    throw new ConfigError(`.env invalido: ${formatZodIssues(envResult.error.issues)}`, {
      cause: envResult.error,
    });
  }

  return {
    conf: confResult.data,
    env: envResult.data as FzagentEnv,
  };
}

interface ZodIssueLite {
  path: (string | number)[];
  message: string;
}

function formatZodIssues(issues: readonly ZodIssueLite[]): string {
  return issues.map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`).join('; ');
}

export { EnvSchema, FzagentConfSchema, type FzagentConf, type FzagentEnv } from './schema.js';
export { parseConfFile } from './parser.js';
