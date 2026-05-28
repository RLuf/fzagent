// packages/tui/src/commands/types.ts — contrato dos slash commands.

import type { ReactElement } from 'react';
import type { Message } from '@fzagent/core';
import type { TuiRuntime } from './runtime-shim.js';

export type CommandType = 'local' | 'local-jsx';

export interface CommandMeta {
  name: string;
  desc: string;
  type: CommandType;
  aliases?: string[];
  availability?: (ctx: CommandContext) => boolean | Promise<boolean>;
}

export interface CommandTextResult {
  type: 'text' | 'compact';
  content: string;
}

export interface CommandJsxResult {
  type: 'jsx';
  element: ReactElement;
  onDone?: () => void;
}

export interface CommandSkipResult {
  type: 'skip';
}

export type CommandResult = CommandTextResult | CommandJsxResult | CommandSkipResult | string;

export interface CommandContext {
  runtime: TuiRuntime;
  registry: CommandRegistry;
  pushMsg: (role: Message['role'], content: string) => void;
  getMessages: () => Message[];
  setMessages: (msgs: Message[]) => void;
  getModel: () => string | undefined;
  setModel: (m: string | undefined) => void;
  getTokens: () => number;
  getSessionId: () => string | undefined;
  setSessionId: (id: string | undefined) => void;
  exit: () => void;
}

export interface CommandModule {
  meta: CommandMeta;
  run: (ctx: CommandContext, args: string[]) => Promise<CommandResult>;
}

export interface CommandRegistry {
  register: (name: string, factory: () => Promise<{ default: CommandModule }>) => void;
  run: (ctx: CommandContext, raw: string) => Promise<Exclude<CommandResult, string>>;
  list: () => Promise<CommandMeta[]>;
  listLoaded: () => CommandMeta[];
  names: () => string[];
  matchPrefix: (prefix: string) => CommandMeta[];
}
