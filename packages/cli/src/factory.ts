// Factory que monta um Agent completo a partir do .env + fzagent.conf.
// Centraliza a fiacao de providers, memory, skills, tools e agent.

import { homedir } from 'node:os';
import { join } from 'node:path';

import {
  createEventBus,
  createLogger,
  loadConfig,
  type FzagentEventBus,
  type FzagentLogger,
} from '@fzagent/core';
import {
  Agent,
  registerBuiltinTools,
  SessionStore,
  ToolRegistry,
  type AgentRunConfig,
} from '@fzagent/agent';
import { EmbeddingsService, QdrantWrapper, WikiIndexer } from '@fzagent/memory';
import {
  AnthropicProvider,
  GoogleProvider,
  OllamaProvider,
  OpenAIProvider,
  OpenRouterProvider,
  ProviderRouter,
  type LLMProvider,
} from '@fzagent/providers';
import { JsonlSkillAuditor, registerBuiltinSkills, SkillRegistry } from '@fzagent/skills';

export interface FzagentRuntime {
  logger: FzagentLogger;
  eventBus: FzagentEventBus;
  conf: ReturnType<typeof loadConfig>['conf'];
  env: ReturnType<typeof loadConfig>['env'];
  router: ProviderRouter;
  indexer: WikiIndexer;
  qdrant: QdrantWrapper;
  embeddings: EmbeddingsService;
  skills: SkillRegistry;
  tools: ToolRegistry;
  sessionStore: SessionStore;
}

export interface BuildOptions {
  cwd?: string;
  // se true, nao tenta criar providers que nao tem credencial — usa apenas
  // os disponiveis. Sem isso, a falha no construtor aborta.
  silent?: boolean;
}

export async function buildRuntime(opts: BuildOptions = {}): Promise<FzagentRuntime> {
  const cwd = opts.cwd ?? process.cwd();
  const { conf, env } = loadConfig({ cwd });
  // Prioridade: .env (override) > fzagent.conf (default). Para LOG_FILE,
  // resolve caminho relativo contra o cwd quando nao for absoluto.
  const rawLogFile = env.LOG_FILE ?? conf.LOG_FILE;
  const logFilePath =
    rawLogFile && rawLogFile.length > 0
      ? rawLogFile.startsWith('/')
        ? rawLogFile
        : join(cwd, rawLogFile)
      : undefined;
  const logger = createLogger({
    level: env.LOG_LEVEL ?? conf.LOG_LEVEL,
    format: env.LOG_FORMAT ?? conf.LOG_FORMAT,
    ...(logFilePath !== undefined && { filePath: logFilePath }),
  });
  const eventBus = createEventBus();

  // Provider construction com tolerancia a credencial faltando.
  // Provider pulado eh logado em WARN (nao DEBUG) para evitar o anti-pattern
  // "falha silenciosa de configuracao" — antes era invisivel em LOG_LEVEL=info.
  const providers: LLMProvider[] = [];
  const skipped: Array<{ provider: string; reason: string }> = [];
  const cfg = (name: 'anthropic' | 'openai' | 'openrouter' | 'google' | 'ollama') => ({
    name,
    models: [] as string[],
  });
  const tryAdd = (name: string, factory: () => LLMProvider): void => {
    try {
      providers.push(factory());
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      skipped.push({ provider: name, reason });
      logger.warn({ provider: name, reason }, 'Provider unavailable — skipped');
    }
  };

  tryAdd(
    'anthropic',
    () =>
      new AnthropicProvider({
        config: { ...cfg('anthropic'), models: conf.MODELS_ANTHROPIC },
        logger,
        env: env as unknown as Record<string, string | undefined>,
      }),
  );
  tryAdd(
    'openai',
    () =>
      new OpenAIProvider({
        config: { ...cfg('openai'), apiKey: env.OPENAI_API_KEY ?? '', models: conf.MODELS_OPENAI },
        logger,
      }),
  );
  tryAdd(
    'openrouter',
    () =>
      new OpenRouterProvider({
        config: {
          ...cfg('openrouter'),
          apiKey: env.OPENROUTER_API_KEY ?? '',
          models: conf.MODELS_OPENROUTER,
          ...(env.OPENROUTER_REFERER !== undefined && { referer: env.OPENROUTER_REFERER }),
          ...(env.OPENROUTER_TITLE !== undefined && { title: env.OPENROUTER_TITLE }),
        },
        logger,
      }),
  );
  tryAdd(
    'google',
    () =>
      new GoogleProvider({
        config: { ...cfg('google'), apiKey: env.GOOGLE_API_KEY ?? '', models: conf.MODELS_GOOGLE },
        logger,
        // Resquicio legado de quando chamava gemini-cli apenas (roginho)
        // env: env as unknown as Record<string, string | undefined>,
      }),
  );
  tryAdd(
    'ollama',
    () =>
      new OllamaProvider({
        config: { ...cfg('ollama'), baseUrl: env.OLLAMA_BASE_URL, models: conf.MODELS_OLLAMA },
        logger,
      }),
  );

  // Resumo da inicializacao — ajuda diagnostico forense rapido.
  // INFO em vez de DEBUG: aparece com LOG_LEVEL=info (default), nao precisa
  // ativar verbose para descobrir que provider esta faltando.
  logger.info(
    {
      available: providers.map((p) => p.name),
      skipped: skipped.map((s) => s.provider),
      total: providers.length,
    },
    `Providers initialized: ${providers.length} available, ${skipped.length} skipped`,
  );

  const router = new ProviderRouter({
    providers,
    fallbackOrder: conf.PROVIDER_FALLBACK_ORDER as Array<
      'anthropic' | 'openai' | 'openrouter' | 'google' | 'ollama'
    >,
    logger,
    eventBus,
    circuitBreakerMaxFailures: conf.AGENTIC_CIRCUIT_BREAKER_MAX_FAILURES,
    circuitBreakerCooldownMs: conf.AGENTIC_CIRCUIT_BREAKER_COOLDOWN_MS,
  });

  // Memory
  const dbDir = join(cwd, conf.DB_DIR);
  const indexer = new WikiIndexer({ dbPath: join(cwd, conf.WIKI_DB), logger });
  const qdrant = new QdrantWrapper({
    url: env.QDRANT_URL,
    ...(env.QDRANT_API_KEY !== undefined && { apiKey: env.QDRANT_API_KEY }),
    logger,
    dim: conf.EMBEDDINGS_DIM,
    threshold: conf.RAG_SIMILARITY_THRESHOLD,
  });
  const embeddings = new EmbeddingsService({
    cacheSize: conf.EMBEDDINGS_CACHE_SIZE,
    cacheDir: join(homedir(), '.cache', 'fzagent', 'models', 'bge-base-en-v1.5'),
    logger,
  });

  // Skills
  const auditor = new JsonlSkillAuditor({
    filePath: join(cwd, conf.LOGS_DIR, conf.SKILL_AUDIT_FILE),
    logger,
  });
  const skills = new SkillRegistry({
    dir: join(cwd, conf.GENAISRC_DIR),
    logger,
    highRequiresConfirm: conf.SKILL_HIGH_PERMISSION_REQUIRES_CONFIRM,
    auditor,
  });
  registerBuiltinSkills(skills);
  await skills.loadAll();

  // Tools — com gate HIGH paridade ao SkillRegistry.
  const tools = new ToolRegistry({
    highRequiresConfirm: conf.TOOL_HIGH_PERMISSION_REQUIRES_CONFIRM,
    onHighConfirm: makeHighConfirm(logger, conf.AUTO_CONFIRM_HIGH),
  });
  registerBuiltinTools(tools);

  // Session store
  const sessionStore = new SessionStore({ dbPath: join(dbDir, 'sessions.sqlite'), logger });

  return {
    logger,
    eventBus,
    conf,
    env,
    router,
    indexer,
    qdrant,
    embeddings,
    skills,
    tools,
    sessionStore,
  };
}

// Callback TTY-aware para confirmacao de tools HIGH.
// Resolucao em ordem:
// 1. Env var FZAGENT_AUTO_CONFIRM_HIGH=1: bypassa (override one-shot).
// 2. fzagent.conf AUTO_CONFIRM_HIGH=true: bypassa (persistente).
// 3. TTY interativo: pergunta no terminal e bloqueia ate y/N.
// 4. Non-TTY (pipe, runtime headless): nega (politica safe).
function makeHighConfirm(
  logger: FzagentLogger,
  autoConfirmFromConf: boolean,
): (name: string) => Promise<boolean> | boolean {
  return async (toolName: string): Promise<boolean> => {
    if (process.env['FZAGENT_AUTO_CONFIRM_HIGH'] === '1') {
      logger.warn({ toolName }, 'HIGH tool auto-confirmed via FZAGENT_AUTO_CONFIRM_HIGH=1');
      return true;
    }
    if (autoConfirmFromConf) {
      logger.warn(
        { toolName },
        'HIGH tool auto-confirmed via AUTO_CONFIRM_HIGH=true no fzagent.conf',
      );
      return true;
    }
    const isTTY = Boolean(process.stdin.isTTY && process.stdout.isTTY);
    if (!isTTY) {
      logger.warn(
        { toolName },
        'HIGH tool denied: stdin/stdout nao sao TTY. Setar AUTO_CONFIRM_HIGH=true no fzagent.conf ou FZAGENT_AUTO_CONFIRM_HIGH=1 para bypass.',
      );
      return false;
    }
    const { createInterface } = await import('node:readline/promises');
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      const ans = await rl.question(
        `\n  ⚠  Tool HIGH '${toolName}' pediu execucao. Aprovar? [y/N]: `,
      );
      return ans.trim().toLowerCase().startsWith('y');
    } finally {
      rl.close();
    }
  };
}

export function buildAgent(runtime: FzagentRuntime, agentId = 'fzagent'): Agent {
  const cfg: AgentRunConfig = {
    maxIterations: runtime.conf.AGENTIC_MAX_ITERATIONS,
    tokenBudget: runtime.conf.AGENTIC_TOKEN_BUDGET,
    circuitBreakerMaxFailures: runtime.conf.AGENTIC_CIRCUIT_BREAKER_MAX_FAILURES,
    circuitBreakerCooldownMs: runtime.conf.AGENTIC_CIRCUIT_BREAKER_COOLDOWN_MS,
    defaultModel: runtime.conf.DEFAULT_MODEL,
    // FCC fix — wiring de chaves agora conectadas ao agent loop.
    historyTurns: runtime.conf.AGENTIC_HISTORY_TURNS,
    compactionThresholdPct: runtime.conf.AGENTIC_COMPACTION_THRESHOLD_PCT,
    reinjectEvery: runtime.conf.AGENTIC_REINJECT_EVERY,
    taskPinningEnabled: runtime.conf.AGENTIC_TASK_PINNING_ENABLED,
    compactionKeepRecent: runtime.conf.AGENTIC_COMPACTION_KEEP_RECENT,
  };
  return new Agent({
    agentId,
    router: runtime.router,
    tools: runtime.tools,
    sessionStore: runtime.sessionStore,
    config: cfg,
    logger: runtime.logger,
    eventBus: runtime.eventBus,
    contextLayers: {
      identity: {
        name: 'fzagent',
        description:
          'Voce e um superagente OpenClaw-style com cerebro secundario hibrido (FTS5 + Qdrant). Use as tools para buscar contexto, executar codigo e atualizar o wiki.',
      },
    },
    toolDeps: {
      indexer: runtime.indexer,
      qdrant: runtime.qdrant,
      embeddings: runtime.embeddings,
      skillRegistry: runtime.skills,
    },
  });
}
