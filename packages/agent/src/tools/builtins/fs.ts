// fs.read e fs.write — operacoes basicas de arquivo.
// Permissions: read=low, write=medium.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';

import { z } from 'zod';

import { defineTool } from '../types.js';

const FsReadInput = z.object({
  path: z.string().min(1),
  encoding: z.enum(['utf8', 'base64']).default('utf8'),
});

export const fsRead = defineTool({
  name: 'fs.read',
  description: 'Le um arquivo do disco. Caminhos relativos sao resolvidos contra ctx.cwd.',
  inputSchema: FsReadInput,
  permissions: 'low',
  async run(ctx, input) {
    const abs = isAbsolute(input.path) ? input.path : resolve(ctx.cwd, input.path);
    return await readFile(abs, input.encoding);
  },
});

const FsWriteInput = z.object({
  path: z.string().min(1),
  content: z.string(),
  encoding: z.enum(['utf8', 'base64']).default('utf8'),
  // Cria diretorios intermediarios se nao existirem.
  mkdirp: z.boolean().default(true),
});

export const fsWrite = defineTool({
  name: 'fs.write',
  description: 'Escreve conteudo em um arquivo. Cria diretorios intermediarios por padrao.',
  inputSchema: FsWriteInput,
  permissions: 'medium',
  async run(ctx, input) {
    const abs = isAbsolute(input.path) ? input.path : resolve(ctx.cwd, input.path);
    if (input.mkdirp) await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, input.content, input.encoding);
    return `wrote ${input.content.length} bytes to ${abs}`;
  },
});
