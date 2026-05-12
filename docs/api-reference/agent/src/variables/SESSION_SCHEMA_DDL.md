[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [agent/src](../README.md) / SESSION_SCHEMA_DDL

# Variable: SESSION_SCHEMA_DDL

> `const` **SESSION_SCHEMA_DDL**: "\nPRAGMA foreign_keys = ON;\nPRAGMA journal_mode = WAL;\n\nCREATE TABLE IF NOT EXISTS sessions (\n id TEXT PRIMARY KEY,\n agent_id TEXT NOT NULL,\n source TEXT NOT NULL DEFAULT 'cli',\n task TEXT,\n started_at INTEGER NOT NULL,\n ended_at INTEGER,\n status TEXT NOT NULL DEFAULT 'running'\n);\nCREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id);\nCREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);\n\nCREATE TABLE IF NOT EXISTS turns (\n id INTEGER PRIMARY KEY AUTOINCREMENT,\n session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,\n role TEXT NOT NULL,\n content_json TEXT NOT NULL,\n tokens_in INTEGER NOT NULL DEFAULT 0,\n tokens_out INTEGER NOT NULL DEFAULT 0,\n ts INTEGER NOT NULL\n);\nCREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id, ts);\n\nCREATE TABLE IF NOT EXISTS tool_calls (\n id INTEGER PRIMARY KEY AUTOINCREMENT,\n turn_id INTEGER NOT NULL REFERENCES turns(id) ON DELETE CASCADE,\n tool_call_id TEXT NOT NULL,\n name TEXT NOT NULL,\n input_json TEXT NOT NULL,\n output_json TEXT,\n duration_ms INTEGER,\n ok INTEGER NOT NULL DEFAULT 1,\n ts INTEGER NOT NULL\n);\nCREATE INDEX IF NOT EXISTS idx_tool_calls_turn ON tool_calls(turn_id);\n"

Defined in: agent/src/session/schema.ts:3
