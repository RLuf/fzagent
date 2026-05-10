// SessionStore — persistencia SQLite de sessoes, turnos e tool_calls.

import { randomUUID } from 'node:crypto';

import type { FzagentLogger, Message, ToolCall } from '@fzagent/core';
import Database from 'better-sqlite3';

import { SESSION_SCHEMA_DDL } from './schema.js';

export type SessionStatus = 'running' | 'completed' | 'failed' | 'aborted';

export interface CreateSessionInput {
  agentId: string;
  source?: string;
  task?: string;
}

export interface SessionRow {
  id: string;
  agentId: string;
  source: string;
  task: string | null;
  startedAt: number;
  endedAt: number | null;
  status: SessionStatus;
}

export interface TurnRow {
  id: number;
  sessionId: string;
  role: string;
  content: Message;
  tokensIn: number;
  tokensOut: number;
  ts: number;
}

export interface SessionStoreOptions {
  dbPath: string;
  logger?: FzagentLogger;
}

export class SessionStore {
  private readonly db: Database.Database;
  private readonly logger: FzagentLogger | undefined;

  constructor(opts: SessionStoreOptions) {
    this.db = new Database(opts.dbPath);
    this.db.exec(SESSION_SCHEMA_DDL);
    this.logger = opts.logger?.child({ scope: 'session-store' });
  }

  close(): void {
    this.db.close();
  }

  createSession(input: CreateSessionInput): SessionRow {
    const id = randomUUID();
    const startedAt = Date.now();
    const source = input.source ?? 'cli';
    this.db
      .prepare(
        'INSERT INTO sessions (id, agent_id, source, task, started_at, status) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(id, input.agentId, source, input.task ?? null, startedAt, 'running');
    this.logger?.debug({ sessionId: id, agentId: input.agentId }, 'session created');
    return {
      id,
      agentId: input.agentId,
      source,
      task: input.task ?? null,
      startedAt,
      endedAt: null,
      status: 'running',
    };
  }

  closeSession(sessionId: string, status: SessionStatus): void {
    this.db
      .prepare('UPDATE sessions SET ended_at = ?, status = ? WHERE id = ?')
      .run(Date.now(), status, sessionId);
  }

  getSession(sessionId: string): SessionRow | null {
    const row = this.db
      .prepare(
        'SELECT id, agent_id as agentId, source, task, started_at as startedAt, ended_at as endedAt, status FROM sessions WHERE id = ?',
      )
      .get(sessionId) as SessionRow | undefined;
    return row ?? null;
  }

  // Append turn. Retorna o id auto-increment para uso em recordToolCall.
  recordTurn(
    sessionId: string,
    message: Message,
    usage: { tokensIn?: number; tokensOut?: number } = {},
  ): number {
    const result = this.db
      .prepare(
        'INSERT INTO turns (session_id, role, content_json, tokens_in, tokens_out, ts) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(
        sessionId,
        message.role,
        JSON.stringify(message),
        usage.tokensIn ?? 0,
        usage.tokensOut ?? 0,
        Date.now(),
      );
    return Number(result.lastInsertRowid);
  }

  recordToolCall(
    turnId: number,
    call: ToolCall,
    output: unknown,
    durationMs: number,
    ok: boolean,
  ): void {
    this.db
      .prepare(
        'INSERT INTO tool_calls (turn_id, tool_call_id, name, input_json, output_json, duration_ms, ok, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        turnId,
        call.id,
        call.name,
        JSON.stringify(call.input),
        JSON.stringify(output),
        durationMs,
        ok ? 1 : 0,
        Date.now(),
      );
  }

  // Recupera os ultimos N turnos de uma sessao (para resumir / restaurar).
  getRecentTurns(sessionId: string, limit = 200): Message[] {
    const rows = this.db
      .prepare(
        'SELECT content_json as content FROM turns WHERE session_id = ? ORDER BY id DESC LIMIT ?',
      )
      .all(sessionId, limit) as Array<{ content: string }>;
    return rows.reverse().map((r) => JSON.parse(r.content) as Message);
  }

  countTurns(sessionId: string): number {
    return (
      this.db.prepare('SELECT COUNT(*) as c FROM turns WHERE session_id = ?').get(sessionId) as {
        c: number;
      }
    ).c;
  }

  totalTokens(sessionId: string): { in: number; out: number } {
    const r = this.db
      .prepare(
        'SELECT COALESCE(SUM(tokens_in),0) as i, COALESCE(SUM(tokens_out),0) as o FROM turns WHERE session_id = ?',
      )
      .get(sessionId) as { i: number; o: number };
    return { in: r.i, out: r.o };
  }
}
