// @fzagent/core — superficie publica do pacote.
// Tudo aqui e estavel para consumo dos outros packages do monorepo.

export const FZAGENT_CORE_VERSION = '0.1.0';

// types
export * from './types/index.js';

// logger
export { createLogger } from './logger/index.js';
export type { FzagentLogger, LoggerConfig, LogFormat } from './logger/index.js';

// config
export {
  loadConfig,
  parseConfFile,
  EnvSchema,
  FzagentConfSchema,
  type LoadConfigOptions,
  type LoadedConfig,
  type FzagentConf,
  type FzagentEnv,
} from './config/index.js';

// events
export { createEventBus } from './events/index.js';
export type {
  EventHandler,
  FzagentEventBus,
  FzagentEventMap,
  FzagentEventName,
  WildcardHandler,
} from './events/index.js';

// errors
export {
  FzagentError,
  ConfigError,
  ValidationError,
  ProviderError,
  CircuitBreakerError,
  BudgetExceededError,
} from './errors/index.js';
