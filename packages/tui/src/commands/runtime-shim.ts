// packages/tui/src/commands/runtime-shim.ts — re-exporta tipos do runtime
// do CLI sem criar dep circular. CLI cria o runtime e injeta no startTuiRepl;
// TUI nao constroi runtime nem mexe em auth (proibido por contrato).

import type { Agent, SessionStore, ToolRegistry } from '@fzagent/agent';
import type { SkillRegistry } from '@fzagent/skills';

// Apenas o sub-conjunto que o TUI consome do FzagentRuntime do CLI.
// Em runtime, CLI passa o objeto inteiro; cast seguro pois usamos so estes.
export interface TuiRuntime {
  sessionStore: SessionStore;
  skills: SkillRegistry;
  tools: ToolRegistry;
  conf: {
    DEFAULT_MODEL: string;
    MODELS_ANTHROPIC: string;
    MODELS_OLLAMA: string;
    MODELS_GOOGLE?: string;
    MODELS_OPENAI?: string;
    AGENTIC_HISTORY_TURNS: number;
    [key: string]: unknown;
  };
  indexer: { close(): void };
}

// Factory provida pelo CLI: cria um Agent novo para cada session.
export type AgentFactory = () => Agent;
