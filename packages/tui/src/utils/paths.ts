// packages/tui/src/utils/paths.ts — gestão de paths e perms do TUI.
//
// Diretorio raiz: ~/.fzagent-tui/  (separado de ~/.fzcode/ pra nao misturar
// com o standalone). Sessoes do agent ficam no SQLite do fzagent;
// aqui guardamos so o que eh local do REPL (memory.md livre, snapshots).

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';

export const HOME = process.env['HOME'] ?? os.homedir();
export const ROOT = path.join(HOME, '.fzagent-tui');
export const MEMORY_FILE = path.join(ROOT, 'memory.md');

export function ensureDirs(): void {
  fs.mkdirSync(ROOT, { recursive: true, mode: 0o700 });
  try {
    fs.chmodSync(ROOT, 0o700);
  } catch {
    // best-effort
  }
}

export function newReplId(): string {
  return new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 4);
}

export function readMemory(): string {
  if (!fs.existsSync(MEMORY_FILE)) {
    fs.writeFileSync(MEMORY_FILE, '# fzagent TUI memory\n\n', { mode: 0o600 });
  } else {
    try {
      fs.chmodSync(MEMORY_FILE, 0o600);
    } catch {
      // best-effort
    }
  }
  return fs.readFileSync(MEMORY_FILE, 'utf8');
}
