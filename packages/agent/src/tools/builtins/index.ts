// Builtin tools — exporta todas e fabrica para registrar de uma vez.

import type { ToolRegistry } from '../registry.js';

import { agentDelegate } from './delegate.js';
import { fsRead, fsWrite } from './fs.js';
import { shellExec } from './shell.js';
import { skillInvoke } from './skill.js';
import { webFetch, webSearch } from './web.js';
import { wikiIngest, wikiLint, wikiQuery } from './wiki.js';

export {
  agentDelegate,
  fsRead,
  fsWrite,
  shellExec,
  skillInvoke,
  webFetch,
  webSearch,
  wikiIngest,
  wikiLint,
  wikiQuery,
};

// Registra os 10 builtins canonicos no registry passado.
export function registerBuiltinTools(reg: ToolRegistry): ToolRegistry {
  return reg.registerMany([
    shellExec,
    fsRead,
    fsWrite,
    webFetch,
    webSearch,
    wikiIngest,
    wikiQuery,
    wikiLint,
    skillInvoke,
    agentDelegate,
  ]);
}
