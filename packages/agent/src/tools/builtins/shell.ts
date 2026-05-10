// shell.exec — executa comando bash com timeout e captura de stdout/stderr.
// Permission HIGH (modificacao do sistema). Sandbox basico via cwd e env.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { z } from 'zod';

import { defineTool } from '../types.js';

const execFileAsync = promisify(execFile);

const ShellExecInput = z.object({
  command: z.string().min(1).describe('comando bash a executar'),
  cwd: z.string().optional().describe('working directory; default = ctx.cwd'),
  timeoutMs: z.number().int().positive().default(30_000),
});

export const shellExec = defineTool({
  name: 'shell.exec',
  description: 'Executa um comando bash. Retorna stdout. Falha em exit != 0.',
  inputSchema: ShellExecInput,
  permissions: 'high',
  async run(ctx, input) {
    const opts: Parameters<typeof execFileAsync>[2] = {
      cwd: input.cwd ?? ctx.cwd,
      timeout: input.timeoutMs,
      maxBuffer: 4 * 1024 * 1024,
    };
    if (ctx.signal !== undefined) opts.signal = ctx.signal;
    const { stdout, stderr } = await execFileAsync('bash', ['-lc', input.command], opts);
    return stderr ? `${stdout}\n--stderr--\n${stderr}` : stdout;
  },
});
