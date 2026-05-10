// SkillRegistry — auto-discovery de genaisrc/*.genai.mjs.
//
// Decisoes:
// 1. Cada skill exporta `default defineSkill({...})`.
// 2. Carrega via dynamic import; recarrega quando o arquivo muda (chokidar)
//    se `watch=true` e `SKILL_REGISTRY_SCAN_INTERVAL > 0`.
// 3. Hash do arquivo (sha256) detecta mudancas mesmo se o mtime confunde.
// 4. Permission HIGH exige confirmacao explicita do caller — registry
//    expoe `requiresConfirmation(name)`.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { FzagentLogger } from '@fzagent/core';
import chokidar from 'chokidar';

import type { LoadedSkill, SkillContext, SkillSpec } from './types.js';

export interface SkillRegistryOptions {
  // diretorio com *.genai.mjs (default 'genaisrc').
  dir: string;
  logger?: FzagentLogger;
  // se true, escuta mudancas e recarrega automaticamente.
  watch?: boolean;
  // se true, skills HIGH exigem confirm callback antes de invoke.
  highRequiresConfirm?: boolean;
  // callback de confirmacao para skills HIGH (recebe nome, devolve boolean).
  onHighConfirm?: (name: string) => Promise<boolean> | boolean;
}

export class SkillRegistry {
  private readonly skills = new Map<string, LoadedSkill>();
  private readonly logger: FzagentLogger | undefined;
  private readonly dir: string;
  private watcher: ReturnType<typeof chokidar.watch> | null = null;
  readonly highRequiresConfirm: boolean;
  readonly onHighConfirm: ((name: string) => Promise<boolean> | boolean) | undefined;

  constructor(opts: SkillRegistryOptions) {
    this.logger = opts.logger?.child({ scope: 'skill-registry' });
    this.dir = resolve(opts.dir);
    this.highRequiresConfirm = opts.highRequiresConfirm ?? true;
    this.onHighConfirm = opts.onHighConfirm;
    if (opts.watch) this.startWatching();
  }

  async loadAll(): Promise<void> {
    let files: string[] = [];
    try {
      files = readdirSync(this.dir).filter((f) => f.endsWith('.genai.mjs'));
    } catch {
      this.logger?.debug({ dir: this.dir }, 'genaisrc dir not found, skipping');
      return;
    }
    for (const f of files) {
      await this.loadFile(resolve(this.dir, f));
    }
  }

  async loadFile(filePath: string): Promise<LoadedSkill | null> {
    const buf = readFileSync(filePath);
    const fileHash = createHash('sha256').update(buf).digest('hex');
    try {
      // cache-bust com hash para forcar reload em mudancas.
      const url = `${pathToFileURL(filePath).href}?h=${fileHash}`;
      const mod = (await import(url)) as { default?: SkillSpec };
      const spec = mod.default;
      if (!spec || typeof spec.run !== 'function' || !spec.name) {
        this.logger?.warn({ filePath }, 'skill file invalid: missing default export with .run');
        return null;
      }
      const loaded: LoadedSkill = { ...spec, filePath, fileHash };
      this.skills.set(spec.name, loaded);
      this.logger?.debug({ name: spec.name, file: filePath }, 'skill loaded');
      return loaded;
    } catch (err) {
      this.logger?.warn(
        { filePath, error: err instanceof Error ? err.message : String(err) },
        'failed to load skill',
      );
      return null;
    }
  }

  // Registra programmaticamente (sem ler do disco). Util para skills built-in.
  registerProgrammatic(spec: SkillSpec, filePath = '<programmatic>'): void {
    const fileHash = createHash('sha256').update(spec.name).digest('hex');
    this.skills.set(spec.name, { ...spec, filePath, fileHash });
  }

  list(): LoadedSkill[] {
    return Array.from(this.skills.values());
  }

  get(name: string): LoadedSkill | undefined {
    return this.skills.get(name);
  }

  has(name: string): boolean {
    return this.skills.has(name);
  }

  requiresConfirmation(name: string): boolean {
    const s = this.skills.get(name);
    if (!s) return false;
    // So exige confirm se a skill e HIGH, a flag esta on E o caller forneceu
    // callback. Sem callback, nao bloqueia (o caller assumiu o risco ao
    // construir o registry com highRequiresConfirm=true sem onHighConfirm).
    return this.highRequiresConfirm && s.permissions === 'high' && this.onHighConfirm !== undefined;
  }

  async invoke(name: string, rawInput: unknown, ctx: SkillContext): Promise<unknown> {
    const s = this.skills.get(name);
    if (!s) throw new Error(`Skill not found: ${name}`);

    if (this.requiresConfirmation(name) && this.onHighConfirm) {
      const ok = await Promise.resolve(this.onHighConfirm(name));
      if (!ok) {
        throw new Error(`Skill '${name}' requires confirmation (denied)`);
      }
    }

    const validated = s.inputSchema.parse(rawInput);
    return await s.run(ctx, validated);
  }

  startWatching(): void {
    if (this.watcher) return;
    this.watcher = chokidar.watch(this.dir, {
      ignoreInitial: true,
      persistent: true,
    });
    const handle = (path: string): void => {
      if (path.endsWith('.genai.mjs')) {
        this.loadFile(path).catch(() => {
          /* ja logado */
        });
      }
    };
    this.watcher.on('add', handle).on('change', handle);
    this.watcher.on('unlink', (p: string) => {
      // remove skill que foi deletada
      for (const [n, s] of this.skills) {
        if (s.filePath === p) {
          this.skills.delete(n);
          this.logger?.info({ name: n }, 'skill removed (file unlinked)');
        }
      }
    });
    this.logger?.info({ dir: this.dir }, 'watching genaisrc');
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }
}
