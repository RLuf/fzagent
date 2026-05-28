// packages/tui/src/commands/registry.ts — Registry com lazy load + aliases.

import type {
  CommandContext,
  CommandMeta,
  CommandModule,
  CommandRegistry,
  CommandResult,
} from './types.js';

interface Entry {
  factory: () => Promise<{ default: CommandModule }>;
  module: { default: CommandModule } | null;
  meta: CommandMeta | null;
}

export function createRegistry(): CommandRegistry {
  const entries = new Map<string, Entry>();
  const aliasMap = new Map<string, string>();

  function register(name: string, factory: () => Promise<{ default: CommandModule }>): void {
    entries.set(name, { factory, module: null, meta: null });
  }

  async function _load(name: string): Promise<{ default: CommandModule } | null> {
    const e = entries.get(name);
    if (!e) return null;
    if (e.module) return e.module;
    const mod = await e.factory();
    e.module = mod;
    e.meta = mod.default.meta;
    for (const a of mod.default.meta.aliases ?? []) aliasMap.set(a, name);
    return mod;
  }

  async function _resolveName(rawName: string): Promise<string | null> {
    if (entries.has(rawName)) return rawName;
    if (aliasMap.has(rawName)) return aliasMap.get(rawName)!;
    // vasculha lazy
    for (const name of entries.keys()) {
      await _load(name);
      if (aliasMap.has(rawName)) return aliasMap.get(rawName)!;
    }
    return null;
  }

  async function run(ctx: CommandContext, raw: string): Promise<Exclude<CommandResult, string>> {
    const parts = raw.trim().split(/\s+/);
    const cmd = parts[0] ?? '';
    const args = parts.slice(1);
    const resolved = await _resolveName(cmd);
    if (!resolved)
      return { type: 'text', content: `comando desconhecido: ${cmd}. /help pra lista.` };
    const mod = await _load(resolved);
    if (!mod?.default?.run) {
      return { type: 'text', content: `comando ${resolved} sem handler run().` };
    }
    if (typeof mod.default.meta.availability === 'function') {
      try {
        const ok = await mod.default.meta.availability(ctx);
        if (!ok) return { type: 'text', content: `comando ${resolved} indisponivel.` };
      } catch {
        // ignore — segue execucao
      }
    }
    try {
      const r = await mod.default.run(ctx, args);
      if (typeof r === 'string') return { type: 'text', content: r };
      return r;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { type: 'text', content: `[erro em ${resolved}] ${msg}` };
    }
  }

  async function list(): Promise<CommandMeta[]> {
    const out: CommandMeta[] = [];
    for (const name of entries.keys()) {
      const mod = await _load(name);
      if (mod) out.push(mod.default.meta);
    }
    return out;
  }

  function listLoaded(): CommandMeta[] {
    const out: CommandMeta[] = [];
    for (const e of entries.values()) {
      if (e.meta) out.push(e.meta);
    }
    return out;
  }

  function names(): string[] {
    return Array.from(entries.keys());
  }

  function matchPrefix(prefix: string): CommandMeta[] {
    const out: CommandMeta[] = [];
    for (const [name, e] of entries.entries()) {
      if (name.startsWith(prefix)) {
        out.push(e.meta ?? { name, desc: '(carregando…)', type: 'local' });
      }
    }
    return out;
  }

  return { register, run, list, listLoaded, names, matchPrefix };
}
