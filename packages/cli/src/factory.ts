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
import { registerBuiltinSkills, SkillRegistry } from '@fzagent/skills';

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

export function buildRuntime(opts: BuildOptions = {}): FzagentRuntime {
  const cwd = opts.cwd ?? process.cwd();
  const { conf, env } = loadConfig({ cwd });
  const logger = createLogger({ level: env.LOG_LEVEL, format: env.LOG_FORMAT });
  const eventBus = createEventBus();

  // Provider construction com tolerancia a credencial faltando.
  const providers: LLMProvider[] = [];
  const cfg = (name: 'anthropic' | 'openai' | 'openrouter' | 'google' | 'ollama') => ({
    name,
    models: [] as string[],
  });
  const tryAdd = (factory: () => LLMProvider): void => {
    try {
      providers.push(factory());
    } catch (err) {
      if (!opts.silent) {
        logger.debug(
          { error: err instanceof Error ? err.message : String(err) },
          'provider not available — skipping',
        );
      }
    }
  };

  tryAdd(
    () =>
      new AnthropicProvider({
        config: { ...cfg('anthropic'), models: conf.MODELS_ANTHROPIC },
        logger,
        env: env as unknown as Record<string, string | undefined>,
      }),
  );
  tryAdd(
    () =>
      new OpenAIProvider({
        config: { ...cfg('openai'), apiKey: env.OPENAI_API_KEY ?? '', models: conf.MODELS_OPENAI },
        logger,
      }),
  );
  tryAdd(
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
    () =>
      new GoogleProvider({
        config: { ...cfg('google'), models: conf.MODELS_GOOGLE },
        logger,
        env: env as unknown as Record<string, string | undefined>,
      }),
  );
  tryAdd(
    () =>
      new OllamaProvider({
        config: { ...cfg('ollama'), baseUrl: env.OLLAMA_BASE_URL, models: conf.MODELS_OLLAMA },
        logger,
      }),
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
  const skills = new SkillRegistry({
    dir: join(cwd, conf.GENAISRC_DIR),
    logger,
    highRequiresConfirm: conf.SKILL_HIGH_PERMISSION_REQUIRES_CONFIRM,
  });
  registerBuiltinSkills(skills);

  // Tools
  const tools = new ToolRegistry();
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

export function buildAgent(runtime: FzagentRuntime, agentId = 'fzagent'): Agent {
  const cfg: AgentRunConfig = {
    maxIterations: runtime.conf.AGENTIC_MAX_ITERATIONS,
    tokenBudget: runtime.conf.AGENTIC_TOKEN_BUDGET,
    circuitBreakerMaxFailures: runtime.conf.AGENTIC_CIRCUIT_BREAKER_MAX_FAILURES,
    circuitBreakerCooldownMs: runtime.conf.AGENTIC_CIRCUIT_BREAKER_COOLDOWN_MS,
    defaultModel: runtime.conf.DEFAULT_MODEL,
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
