// packages/tui/src/index.ts — API publica do @fzagent/tui.
//
// Entry point: `startTuiRepl(runtime, agentFactory, opts)`. CLI invoca quando
// --tui eh passado. NAO toca em autenticacao/OAuth — apenas consome runtime.

import React from 'react';
import { render } from 'ink';
import { enterAltScreen, leaveAltScreen } from './utils/terminal.js';
import { TuiRepl } from './tui-repl.js';
import type { TuiRuntime, AgentFactory } from './commands/runtime-shim.js';

export type { TuiRuntime, AgentFactory } from './commands/runtime-shim.js';
export type { CommandModule, CommandContext, CommandResult } from './commands/types.js';

export interface StartTuiOptions {
  model?: string | undefined;
  continueLast?: boolean | undefined;
}

export async function startTuiRepl(
  runtime: TuiRuntime,
  agentFactory: AgentFactory,
  opts: StartTuiOptions = {},
): Promise<void> {
  enterAltScreen();
  const app = render(
    React.createElement(TuiRepl, {
      runtime,
      agentFactory,
      initialModel: opts.model,
      continueLast: opts.continueLast,
    }),
    { exitOnCtrlC: true },
  );
  try {
    await app.waitUntilExit();
  } finally {
    leaveAltScreen();
  }
}
