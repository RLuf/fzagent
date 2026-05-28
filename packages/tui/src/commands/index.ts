// packages/tui/src/commands/index.ts — registry com lazy load de todos os commands.

import { createRegistry } from './registry.js';
import type { CommandRegistry } from './types.js';

export function buildRegistry(): CommandRegistry {
  const reg = createRegistry();
  reg.register('/help', () => import('./help.js'));
  reg.register('/clear', () => import('./clear.js'));
  reg.register('/sessions', () => import('./sessions.js'));
  reg.register('/load', () => import('./load.js'));
  reg.register('/model', () => import('./model.js'));
  reg.register('/tools', () => import('./tools.js'));
  reg.register('/skills', () => import('./skills.js'));
  reg.register('/memory', () => import('./memory.js'));
  reg.register('/exit', () => import('./exit.js'));
  return reg;
}
