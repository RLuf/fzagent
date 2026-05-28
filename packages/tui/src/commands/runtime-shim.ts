// packages/tui/src/commands/runtime-shim.ts — runtime injetado pelo CLI.
// Usamos shape estrutural (interface) em vez de importar as classes concretas,
// pra evitar conflitos de identidade de classe entre o package source e o
// build .d.ts (private fields colidem em strict mode).

import type { AgentEvent, RunInput } from '@fzagent/agent';
import type { Message } from '@fzagent/core';

export interface SessionRowShape {
  id: string;
  agentId: string;
  source: string;
  task: string | null;
  startedAt: number;
  endedAt: number | null;
  status: string;
}

export interface SessionStoreShape {
  listSessions(agentId: string, limit?: number): SessionRowShape[];
  getRecentTurns(sessionId: string, limit?: number): Message[];
  close(): void;
}

export interface SkillEntryShape {
  name: string;
  description: string;
}

export interface ToolEntryShape {
  name: string;
  description: string;
}

export interface SkillsRegistryShape {
  list(): readonly SkillEntryShape[];
}

export interface ToolsRegistryShape {
  list(): readonly ToolEntryShape[];
}

export interface TuiConfShape {
  DEFAULT_MODEL: string;
  MODELS_ANTHROPIC: readonly string[];
  MODELS_OLLAMA: readonly string[];
  MODELS_GOOGLE?: readonly string[];
  MODELS_OPENAI?: readonly string[];
  MODELS_OPENROUTER?: readonly string[];
  AGENTIC_HISTORY_TURNS: number;
  [key: string]: unknown;
}

export interface TuiRuntime {
  sessionStore: SessionStoreShape;
  skills: SkillsRegistryShape;
  tools: ToolsRegistryShape;
  conf: TuiConfShape;
  indexer: { close(): void };
}

// Agent factory provida pelo CLI — cria um Agent ja vinculado ao runtime.
// AgentLike eh o subset que o TUI consome (somente run()).
export interface AgentLike {
  run(input: RunInput): AsyncIterable<AgentEvent>;
}

export type AgentFactory = () => AgentLike;

// Re-export do AgentEvent + RunInput pra TUI consumir tipos.
export type { AgentEvent, RunInput };
