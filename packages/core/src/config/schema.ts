// Schemas Zod para fzagent.conf e .env.
// Decisoes:
// 1. z.coerce.* aceita strings (vindas de arquivo) e numeros (injecao em testes).
// 2. CSVs viram arrays via .transform; defaults sao aplicados pre-transform.
// 3. Booleanos aceitam 'true'/'false'/'1'/'0'/'yes'/'no' case-insensitive.
// 4. Cada chave tem default sensato — fzagent roda sem fzagent.conf nenhum.

import { z } from 'zod';

const csvList = (defaultValue: string) =>
  z
    .string()
    .default(defaultValue)
    .transform((s) =>
      s
        .split(',')
        .map((x) => x.trim())
        .filter((x) => x.length > 0),
    );

const intStr = (defaultValue: number) => z.coerce.number().int().default(defaultValue);

const numStr = (defaultValue: number) => z.coerce.number().default(defaultValue);

const TRUTHY = new Set(['true', '1', 'yes', 'on']);
const boolStr = (defaultValue: boolean) =>
  z
    .union([z.boolean(), z.string()])
    .default(defaultValue)
    .transform((v) => (typeof v === 'boolean' ? v : TRUTHY.has(v.toLowerCase().trim())));

// fzagent.conf — toda config operacional nao-secreta.
export const FzagentConfSchema = z.object({
  // OpenRouter deprecated do default (free tier 429 rate-limit hostil).
  // Adapter mantido — re-incluir manualmente neste CSV para reativar.
  PROVIDER_FALLBACK_ORDER: csvList('anthropic,google,ollama,openai'),

  MODELS_ANTHROPIC: csvList('claude-sonnet-4-5,claude-haiku-4-5'),
  MODELS_OPENAI: csvList('gpt-4o,gpt-4o-mini'),
  MODELS_GOOGLE: csvList('gemini-2.5-pro,gemini-2.5-flash'),
  MODELS_OPENROUTER: csvList('anthropic/claude-sonnet-4.5,openai/gpt-4o'),
  MODELS_OLLAMA: csvList('qwen3:14b,phi3:medium,gemma3:12b,llama3.2:3b'),

  DEFAULT_MODEL: z.string().default('claude-sonnet-4-5'),

  AGENTIC_MAX_ITERATIONS: intStr(20),
  AGENTIC_TOKEN_BUDGET: intStr(200000),
  AGENTIC_CIRCUIT_BREAKER_MAX_FAILURES: intStr(3),
  AGENTIC_CIRCUIT_BREAKER_COOLDOWN_MS: intStr(30000),
  AGENTIC_HEARTBEAT_INTERVAL: intStr(30000),
  AGENTIC_HISTORY_TURNS: intStr(200),
  AGENTIC_COMPACTION_THRESHOLD_PCT: intStr(80),
  // FCC fix (Fractura de Coerencia Contextual) — reinjecao periodica da
  // tarefa original a cada N iteracoes. Mitiga "lost in the middle".
  AGENTIC_REINJECT_EVERY: intStr(5),
  // Task pinning: tarefa aparece no TOPO e no fim do system prompt (sandwich).
  // Desligavel para teste de regressao com comportamento legado.
  AGENTIC_TASK_PINNING_ENABLED: boolStr(true),
  // Compaction: quantas unidades atomicas (user solo OU assistant+tool_results)
  // preservar intactas no fim ao comprimir o meio do historico. Sub-sessao 2.
  AGENTIC_COMPACTION_KEEP_RECENT: intStr(4),

  GENAISRC_DIR: z.string().default('genaisrc'),
  SKILL_REGISTRY_SCAN_INTERVAL: intStr(60000),
  SKILL_HIGH_PERMISSION_REQUIRES_CONFIRM: boolStr(true),
  TOOL_HIGH_PERMISSION_REQUIRES_CONFIRM: boolStr(true),
  // Auto-aprova tools HIGH sem prompt interativo. Util em dev/CI/runtime
  // headless. Em prod (TTY), preferir manter false e responder ao prompt.
  // Env var FZAGENT_AUTO_CONFIRM_HIGH=1 ainda funciona como override one-shot.
  AUTO_CONFIRM_HIGH: boolStr(false),

  WIKI_DIR: z.string().default('wiki'),
  WIKI_DB: z.string().default('db/wiki.sqlite'),
  RAG_SIMILARITY_THRESHOLD: numStr(0.6),
  RAG_TOP_K: intStr(5),
  QDRANT_COLLECTIONS: csvList(
    'fzagent_kb,fzagent_memory,fzagent_learning,fzagent_personality,fzagent_inference,fzagent_semantic_cache',
  ),

  EMBEDDINGS_MODEL: z.string().default('bge-base-en-v1.5'),
  EMBEDDINGS_DIM: intStr(768),
  EMBEDDINGS_CACHE_SIZE: intStr(100000),

  WEB_SEARCH_PROVIDER: z.enum(['brave', 'none']).default('brave'),
  WEB_READ_PROVIDER: z.enum(['fetch', 'none']).default('fetch'),
  WEB_FETCH_TIMEOUT_MS: intStr(15000),
  WEB_FETCH_MAX_BYTES: intStr(2000000),

  SERVER_HOST: z.string().default('127.0.0.1'),
  SERVER_PORT: intStr(7331),
  SERVER_WS_ENABLED: boolStr(true),

  MAX_CONCURRENCY_PER_AGENT: intStr(4),

  DB_DIR: z.string().default('db'),
  RAW_DIR: z.string().default('raw'),
  SKILLS_CLAUDE_DIR: z.string().default('skills-claude'),
  LOGS_DIR: z.string().default('logs'),
  SKILL_AUDIT_FILE: z.string().default('skill-invocations.jsonl'),

  // Logging — defaults aqui; .env (LOG_LEVEL/LOG_FORMAT/LOG_FILE) tem precedencia.
  // LOG_LEVEL vocabulario oficial: verbose | debug | info | silent.
  //   - verbose: alias de debug (conveniencia operacional)
  //   - debug:   tudo (info + diagnostico interno)
  //   - info:    eventos operacionais normais (default)
  //   - silent:  nada
  LOG_LEVEL: z.string().default('info'),
  // Override por sink. Vazio = herda LOG_LEVEL para ambos. Permite
  // console silencioso com arquivo verboso (e vice-versa).
  LOG_LEVEL_CONSOLE: z.string().optional(),
  LOG_LEVEL_FILE: z.string().optional(),
  LOG_FORMAT: z.enum(['pretty', 'json', 'silent']).default('pretty'),
  // LOG_FILE: caminho relativo ao cwd OU absoluto. Vazio = console-only.
  // Quando setado, escreve em arquivo JSON estruturado ADEMAIS do console.
  LOG_FILE: z.string().optional(),
});

export type FzagentConf = z.infer<typeof FzagentConfSchema>;

// .env — credenciais e endpoints. Mantem flexibilidade (passthrough)
// para variaveis nao listadas (e.g., NODE_ENV).
//
// Anthropic: prioridade EXATA (replicada do fazai-ng):
//   CLAUDE_CODE_OAUTH_TOKEN > ANTHROPIC_OAUTH_TOKEN > ANTHROPIC_AUTH_TOKEN > ANTHROPIC_API_KEY
// O AnthropicProvider chama getAnthropicAuth(env) e decide Bearer vs x-api-key.
//
// OLLAMA_BASE_URL default = papaimach (servidor local de modelos), nao localhost.
export const EnvSchema = z
  .object({
    // Anthropic — OAuth-first
    CLAUDE_CODE_OAUTH_TOKEN: z.string().optional(),
    ANTHROPIC_OAUTH_TOKEN: z.string().optional(),
    ANTHROPIC_AUTH_TOKEN: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    // OpenAI
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_BASE_URL: z.string().url().optional(),
    // Google
    GOOGLE_API_KEY: z.string().optional(),
    GEMINI_CLI_COMMAND: z.string().optional(),
    // OpenRouter
    OPENROUTER_API_KEY: z.string().optional(),
    OPENROUTER_REFERER: z.string().optional(),
    OPENROUTER_TITLE: z.string().optional(),
    // Ollama (papaimach default)
    OLLAMA_BASE_URL: z.string().url().default('http://192.168.0.101:11434'),
    // Qdrant
    QDRANT_URL: z.string().url().default('http://localhost:6333'),
    QDRANT_API_KEY: z.string().optional(),
    // Web search
    BRAVE_SEARCH_API_KEY: z.string().optional(),
    // Logs — override do conf (env tem precedencia, mas defaults vivem no conf).
    LOG_LEVEL: z.string().optional(),
    LOG_LEVEL_CONSOLE: z.string().optional(),
    LOG_LEVEL_FILE: z.string().optional(),
    LOG_FORMAT: z.enum(['pretty', 'json', 'silent']).optional(),
    LOG_FILE: z.string().optional(),
  })
  .passthrough();

export type FzagentEnv = z.infer<typeof EnvSchema>;
