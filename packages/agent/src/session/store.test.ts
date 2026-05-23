import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SessionStore } from './store.js';

let dir: string;
let store: SessionStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'fz-session-'));
  store = new SessionStore({ dbPath: join(dir, 'sessions.sqlite') });
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('SessionStore', () => {
  it('creates and retrieves sessions', () => {
    const s = store.createSession({ agentId: 'pickle', task: 'hello' });
    expect(s.id).toBeTruthy();
    expect(store.getSession(s.id)?.agentId).toBe('pickle');
  });

  it('records turns and tool calls', () => {
    const s = store.createSession({ agentId: 'pickle' });
    const userTurn = store.recordTurn(s.id, { role: 'user', content: 'hi' });
    expect(userTurn).toBeGreaterThan(0);
    const asstTurn = store.recordTurn(
      s.id,
      {
        role: 'assistant',
        content: 'ok',
        tool_calls: [{ id: 't1', name: 'echo', input: { msg: 'x' } }],
      },
      { tokensIn: 10, tokensOut: 5 },
    );
    store.recordToolCall(
      asstTurn,
      { id: 't1', name: 'echo', input: { msg: 'x' } },
      'echo: x',
      12,
      true,
    );
    const turns = store.getRecentTurns(s.id);
    expect(turns).toHaveLength(2);
    expect(turns[0]?.role).toBe('user');
    expect(turns[1]?.role).toBe('assistant');
    const totals = store.totalTokens(s.id);
    expect(totals.in).toBe(10);
    expect(totals.out).toBe(5);
  });

  it('closes session with status', () => {
    const s = store.createSession({ agentId: 'pickle' });
    store.closeSession(s.id, 'completed');
    expect(store.getSession(s.id)?.status).toBe('completed');
    expect(store.getSession(s.id)?.endedAt).toBeGreaterThan(0);
  });
});
