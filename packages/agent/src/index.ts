// @fzagent/agent — superficie publica.

export const FZAGENT_AGENT_VERSION = '0.1.0';

export { Agent, generateSessionId } from './agent.js';
export type { AgentEvent, AgentOptions, AgentRunConfig, RunInput } from './agent.js';

export { AgentCircuitBreaker } from './circuit-breaker.js';
export type {
  AgentCircuitBreakerConfig,
  AgentCircuitBreakerSnapshot,
  CircuitState,
} from './circuit-breaker.js';

export { assembleSystemPrompt } from './context-assembler.js';
export type {
  AssembleInput,
  IdentityLayer,
  PersonalityLayer,
  RAGSource,
} from './context-assembler.js';

export { WORAHeartbeat } from './heartbeat.js';
export type { HeartbeatOptions, HeartbeatTickResult } from './heartbeat.js';

export { SessionStore } from './session/store.js';
export type {
  CreateSessionInput,
  SessionRow,
  SessionStatus,
  SessionStoreOptions,
  TurnRow,
} from './session/store.js';
export { SESSION_SCHEMA_DDL } from './session/schema.js';

export { defineTool, ToolRegistry, zodToJsonSchema } from './tools/index.js';
export type { ExecuteResult, Tool, ToolContext, ToolPermission } from './tools/index.js';

export {
  agentDelegate,
  fsRead,
  fsWrite,
  registerBuiltinTools,
  shellExec,
  skillInvoke,
  webFetch,
  webSearch,
  wikiIngest,
  wikiLint,
  wikiQuery,
} from './tools/builtins/index.js';
