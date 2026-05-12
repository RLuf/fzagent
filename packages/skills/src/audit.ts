// SkillAuditor — log append-only de invocacoes de skills.
//
// JSONL e a forma certa: cada linha e um evento independente, multiplos
// processos podem appendar em paralelo (linha < PIPE_BUF e atomica em POSIX),
// e o parser e trivial (split por \n + JSON.parse).
//
// Os payloads de input/output NAO ficam no log — sao hasheados (sha256). O
// objetivo do log e governance e correlacao forense, nao archive. Quando o
// payload completo for necessario, busca na session (SQLite).

import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';

import type { FzagentLogger } from '@fzagent/core';

export type SkillInvocationDecision = 'auto' | 'confirmed' | 'denied';
export type SkillInvocationOutcome = 'ok' | 'error';

export interface SkillAuditEvent {
  timestamp: string;
  skill: string;
  targetDomain: string | undefined;
  permissions: string | undefined;
  isDestructive: boolean | undefined;
  inputHash: string;
  outputHash: string | null;
  decision: SkillInvocationDecision;
  outcome: SkillInvocationOutcome;
  durationMs: number;
  error: string | null;
  agentId: string | undefined;
  sessionId: string | undefined;
}

export interface SkillAuditor {
  record(event: SkillAuditEvent): void;
}

export interface JsonlSkillAuditorOptions {
  filePath: string;
  logger?: FzagentLogger;
}

export class JsonlSkillAuditor implements SkillAuditor {
  private readonly filePath: string;
  private readonly logger: FzagentLogger | undefined;
  private dirEnsured = false;

  constructor(opts: JsonlSkillAuditorOptions) {
    this.filePath = opts.filePath;
    this.logger = opts.logger?.child({ scope: 'skill-auditor' });
  }

  record(event: SkillAuditEvent): void {
    try {
      if (!this.dirEnsured) {
        mkdirSync(dirname(this.filePath), { recursive: true });
        this.dirEnsured = true;
      }
      appendFileSync(this.filePath, JSON.stringify(event) + '\n');
    } catch (err) {
      // Auditoria nunca derruba a invocacao real. Falha silenciosa com warn.
      this.logger?.warn(
        { error: err instanceof Error ? err.message : String(err), filePath: this.filePath },
        'failed to append skill audit event',
      );
    }
  }
}

// Auditor em-memoria, util para testes e introspeccao em tempo real.
export class MemorySkillAuditor implements SkillAuditor {
  readonly events: SkillAuditEvent[] = [];
  record(event: SkillAuditEvent): void {
    this.events.push(event);
  }
  clear(): void {
    this.events.length = 0;
  }
}

export function hashPayload(value: unknown): string {
  let serialized: string;
  try {
    serialized = JSON.stringify(value ?? null);
  } catch {
    serialized = String(value);
  }
  return createHash('sha256').update(serialized).digest('hex').slice(0, 16);
}
