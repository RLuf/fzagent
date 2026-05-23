# Comprehensive CLI & Daemon Architecture for fzagent

Create a Python-based CLI interface and background daemon for fzagent to handle asynchronous, long-running agentic loops, real-time updates via WebSockets, heartbeats, configuration management, and dynamic tool/skill loading.

## User Review Required

> [!IMPORTANT]
> **Python Version Support:** The host machine currently runs Python 3.7.3. While Python 3.8+ was requested, we will design the CLI and Daemon codebase to be strictly compatible with Python 3.7.3+ (avoiding assignment expressions `:=`, positional-only arguments, and using `typing.List`/`typing.Dict` instead of `list`/`dict` generics).
>
> **Command Bindings:** The Python CLI acts as a client wrapper communicating with the Daemon process via JSON-RPC over Unix sockets, or invoking existing Node.js commands directly as a fallback.

---

## Open Questions

> [!NOTE]
> No critical open questions remain. We will proceed with implementing the Python CLI and Daemon using Typer, asyncio, and Pytest.

---

## Proposed Changes

We will introduce a new component `packages/cli-py` to host the Python CLI codebase, daemon, IPC protocols, and test suite.

### Python CLI & Daemon Component (`packages/cli-py`)

This component implements the daemon, Typer commands, and pytest integration.

#### [NEW] [cli.py](file:///home/rluft/fzagent/packages/cli-py/src/cli.py)
Entry point for the CLI. Defines Typer commands for running agent loops, interacting with the wiki, viewing configuration, managing the daemon process, and listing tools/skills.

#### [NEW] [daemon.py](file:///home/rluft/fzagent/packages/cli-py/src/daemon.py)
The core asyncio-based daemon process. It listens for incoming connections on a Unix socket, executes requested commands (e.g. initiating agent runs), manages process heartbeats, and broadcasts live events.

#### [NEW] [ipc.py](file:///home/rluft/fzagent/packages/cli-py/src/ipc.py)
Implements the JSON-RPC 2.0 communication protocol over Unix Domain Sockets for command transmission between CLI client and background daemon.

#### [NEW] [websocket.py](file:///home/rluft/fzagent/packages/cli-py/src/websocket.py)
A lightweight WebSocket server module running on top of the daemon to emit real-time event updates to any connected client (like the web UI).

#### [NEW] [config.py](file:///home/rluft/fzagent/packages/cli-py/src/config.py)
Handles parsing `.env` and `fzagent.conf` configurations and interacts with the platform credential stores.

#### [NEW] [requirements.txt](file:///home/rluft/fzagent/packages/cli-py/requirements.txt)
Python package dependency definitions (`typer`, `rich`, `websockets`, `pytest`, `pytest-asyncio`).

#### [NEW] [test_cli.py](file:///home/rluft/fzagent/packages/cli-py/tests/test_cli.py)
Pytest test suites validating the CLI parser, JSON-RPC IPC mechanism, and WebSocket broadcast channels.

---

## Verification Plan

### Automated Tests
- Run pytest inside the virtual environment:
  ```bash
  cd packages/cli-py
  .venv/bin/pytest tests/
  ```

### Manual Verification
- Start the daemon:
  ```bash
  python3 packages/cli-py/src/cli.py daemon start
  ```
- Send commands using the client:
  ```bash
  python3 packages/cli-py/src/cli.py run "some task"
  python3 packages/cli-py/src/cli.py skill list
  ```
- Check daemon status and logs.
