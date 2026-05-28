// packages/tui/src/utils/terminal.ts — alt-screen + cleanup robusto.
// Suporta SIGINT/SIGTERM/SIGHUP/uncaughtException/unhandledRejection.

const ALT_SCREEN_ON = '\x1b[?1049h\x1b[H';
const ALT_SCREEN_OFF = '\x1b[?1049l';
const CURSOR_SHOW = '\x1b[?25h';

let installed = false;
let cleaned = false;

function cleanup(): void {
  if (cleaned) return;
  cleaned = true;
  try {
    process.stdout.write(ALT_SCREEN_OFF);
  } catch {
    // ignore
  }
  try {
    process.stdout.write(CURSOR_SHOW);
  } catch {
    // ignore
  }
}

export function enterAltScreen(): void {
  if (installed) return;
  installed = true;
  process.stdout.write(ALT_SCREEN_ON);
  process.once('exit', cleanup);
  process.once('SIGINT', () => {
    cleanup();
    process.exit(130);
  });
  process.once('SIGTERM', () => {
    cleanup();
    process.exit(143);
  });
  process.once('SIGHUP', () => {
    cleanup();
    process.exit(129);
  });
  process.once('uncaughtException', (err) => {
    cleanup();
    process.stderr.write(`[fzagent-tui fatal] ${(err as Error)?.stack ?? String(err)}\n`);
    process.exit(1);
  });
  process.once('unhandledRejection', (reason: unknown) => {
    cleanup();
    const msg = reason instanceof Error ? reason.stack : String(reason);
    process.stderr.write(`[fzagent-tui unhandledRejection] ${msg}\n`);
    process.exit(1);
  });
}

export function leaveAltScreen(): void {
  cleanup();
}

export function onResize(callback: () => void): () => void {
  const handler = (): void => {
    try {
      callback();
    } catch {
      // ignore
    }
  };
  process.on('SIGWINCH', handler);
  return () => process.off('SIGWINCH', handler);
}
