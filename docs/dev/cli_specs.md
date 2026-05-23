# fzagent CLI Specifications & Reverse Engineering Report

This document outlines the architectural patterns, command structures, and implementation specifications extracted from studying modern agentic command-line interfaces, specifically Anthropic's **Claude Code** CLI and related tools, adapted to the **fzagent** daemon-based architecture.

---

## 1. Reference Architecture Analysis: Claude Code

Claude Code acts as a terminal-based interface orchestrating agentic workflows. By analyzing its public interface and behaviors, we identify key design patterns.

### 1.1 Project Structure & Tech Stack
* **Language & Runtime:** Built using Bun (compilation and execution) and TypeScript.
* **UI/UX Layer:** Uses `Ink` (React-based terminal UI library) for interactive prompts, spinners, progress bars, and rich text layout formatting in the terminal.
* **CLI Parser:** Commander.js.
* **Communication:** Direct HTTP/REST and Server-Sent Events (SSE) connections to Anthropic's backend APIs, utilizing the Model Context Protocol (MCP) locally to extend tool functionality.

### 1.2 Command Structure & Interactive Mode
Claude Code differentiates between two primary modes:
1. **Non-Interactive (Command Mode):**
   * One-shot commands like `claude "fix tests"` or `claude -p "describe this file"`.
   * Fast, scriptable, returns results to `stdout` and exits.
2. **Interactive (REPL Mode):**
   * Initiated by running `claude` without arguments or using `claude -c` to resume the last conversation.
   * Houses an inner shell with session-based slash commands (`/compact`, `/clear`, `/model`, `/diff`, `/resume`).

### 1.3 Context Compaction & RAG
* **Rolling Context:** Claude Code monitors the token budget. When the token threshold is approached, a compaction pipeline (`/compact`) is triggered.
* **Compaction Logic:** Older messages are summarized, keeping only system instructions, tool schemas, and recent conversational history intact.
* **File RAG:** Files are dynamically indexed or queried to avoid dumping entire files into the system prompt unless explicitly requested or edit operations are targeted.

### 1.4 Authentication and Storage
* **OAuth 2.0 Flow:** Launches a browser window (or uses port forwarding in SSH environments) to authenticate against `claude.ai`.
* **Token Storage:**
   * macOS: Keychain.
   * Linux: Local file storage (`~/.claude/credentials.json`).
* **Environment Bypass:** Supports API keys via `ANTHROPIC_API_KEY` for CI/CD and non-interactive workflows.

---

## 2. Proposed Daemon-Based CLI Architecture for fzagent

Unlike Claude Code, which runs entirely in the client process, **fzagent** benefits from a **Daemon-based CLI Architecture** to support persistent operations, long-running agent loops (e.g. background tasks, multi-hour refactorings), a real-time heartbeat system, and centralized memory management.

```
┌────────────────────────────────────────────────────────┐
│                        Terminal                        │
│ ┌──────────────────────────┐  ┌──────────────────────┐ │
│ │ Interactive REPL (Rich)  │  │ Non-Interactive cmd  │ │
│ └────────────┬─────────────┘  └──────────┬───────────┘ │
└──────────────┼───────────────────────────┼─────────────┘
               │ Unix Socket / JSON-RPC    │
               ▼                           ▼
┌────────────────────────────────────────────────────────┐
│                    fzagentd (Daemon)                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │                asyncio Event Loop                │  │
│  │  ┌───────────────┐ ┌───────────────┐ ┌────────┐  │  │
│  │  │ JSON-RPC Srv  │ │ WebSocket Srv │ │ Router │  │  │
│  │  └──────┬────────┘ └───────┬───────┘ └────┬───┘  │  │
│  │         │                  │              │      │  │
│  │         ▼                  ▼              ▼      │  │
│  │  ┌───────────────┐ ┌───────────────┐ ┌────────┐  │  │
│  │  │ Memory Store  │ │  Tool/Skills  │ │ Agent  │  │  │
│  │  │ SQLite/Qdrant │ │   Registry    │ │ Loops  │  │  │
│  │  └───────────────┘ └───────────────┘ └────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### 2.1 The Daemon Process (`fzagentd`)
* **Role:** A long-running background service implemented in **Python 3.8+** using `asyncio`.
* **Responsibilities:**
  * Coordinates background execution of LLM agentic loops.
  * Manages connections to the hybrid RAG database (SQLite + Qdrant).
  * Exposes a Unix socket IPC endpoint for control commands.
  * Runs a WebSocket server for real-time status telemetry (for logs and Web UI integration).
  * Periodically scans and loads skills/tools dynamically without CLI restarts.

### 2.2 IPC Protocol: JSON-RPC over Unix Sockets
Communication between the CLI frontend client (`fzagent-cli`) and the daemon uses JSON-RPC 2.0 over a local Unix domain socket (e.g., `/tmp/fzagent.sock`).

#### Request Schema:
```json
{
  "jsonrpc": "2.0",
  "method": "agent.start_loop",
  "params": {
    "task": "Fix lint errors in packages/core",
    "model": "gemini-2.5-flash"
  },
  "id": 1
}
```

#### Response Schema:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "session_id": "sess-4a8b9c1d",
    "status": "started"
  },
  "id": 1
}
```

### 2.3 Real-Time WebSocket Server
The daemon hosts a WebSocket server (default port `7331`) exposing a live event feed.
* **Events emitted:**
  * `heartbeat`: Periodic daemon health info.
  * `agent_status`: State updates of the active agent loops (`idle`, `thinking`, `executing_tool`, `aborted`, `completed`).
  * `tool_invocation`: Real-time notification when a tool (e.g., `shell.exec`) is invoked.
  * `compaction`: Context window compact events.

### 2.4 Command Interface & Syntax
The CLI tool `fzagent` (written in Python using **Typer** and styled with **Rich**) maps user invocations to IPC calls.

* `fzagent daemon start/stop/status/restart` - Manages the daemon process (integrates with systemd on Linux).
* `fzagent run "<prompt>"` - Sends a task to the daemon, streams live updates to the console, and exits.
* `fzagent chat` - Launches interactive REPL mode.
* `fzagent skill list/describe <name>` - Lists and inspects available skills.
* `fzagent tools list/describe <name>` - Lists and inspects available tools.
* `fzagent wiki ingest/query <args>` - Interacts with the secondary brain.
* `fzagent config` - Prints effective configurations.

---

## 3. Configuration & Credential Management

### 3.1 Hierarchical Configuration
Config resolves in order:
1. Environment variables (`.env`)
2. Local config file (`fzagent.conf` - INI or JSON structure parsed by python-dotenv/json)
3. Daemon defaults

### 3.2 Secure Credential Storage
* In interactive terminal sessions, credentials are encrypted and stored using standard platform keystores (e.g., `keyring` library in Python connecting to DBus Secret Service on Linux, Keychain on macOS).
* For headless environments, fallback to reading masked variables from `.env` or `~/.config/fzagent/credentials`.

---

## 4. Plugin and Tool Discovery System

The daemon dynamically loads extensions and third-party plugins:
* **Builtin Tools:** Statically loaded at runtime.
* **User Skills:** Scanned from `genaisrc/` directory. The Python daemon listens to filesystem events (using `watchdog` or `asyncio` loops) and triggers hot-reloads of the skill manifests.
* **MCP Servers Integration:** Native Model Context Protocol support allows fzagent to register third-party MCP servers (expressed in JSON configuration) and dynamically wrap their schema declarations as standard tool definitions.
