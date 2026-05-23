// Session store schema: sessions, turns, tool_calls.

export const SESSION_SCHEMA_DDL = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  agent_id    TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'cli',
  task        TEXT,
  started_at  INTEGER NOT NULL,
  ended_at    INTEGER,
  status      TEXT NOT NULL DEFAULT 'running'
);
CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

CREATE TABLE IF NOT EXISTS turns (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role          TEXT NOT NULL,
  content_json  TEXT NOT NULL,
  tokens_in     INTEGER NOT NULL DEFAULT 0,
  tokens_out    INTEGER NOT NULL DEFAULT 0,
  ts            INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id, ts);

CREATE TABLE IF NOT EXISTS tool_calls (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  turn_id       INTEGER NOT NULL REFERENCES turns(id) ON DELETE CASCADE,
  tool_call_id  TEXT NOT NULL,
  name          TEXT NOT NULL,
  input_json    TEXT NOT NULL,
  output_json   TEXT,
  duration_ms   INTEGER,
  ok            INTEGER NOT NULL DEFAULT 1,
  ts            INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tool_calls_turn ON tool_calls(turn_id);
`;
