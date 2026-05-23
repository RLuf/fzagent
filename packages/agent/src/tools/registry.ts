// ToolRegistry: registra tools, expoe schemas LLM-friendly e dispatch validado.
//
// Gate de confirmacao (paridade com SkillRegistry): tools com permissions==='high'
// passam por onHighConfirm callback quando highRequiresConfirm=true. Sem callback,
// a politica eh deny (seguro por default em runtime nao-interativo).

import type { ToolDefinition } from '@fzagent/providers';

import type { Tool, ToolContext } from './types.js';
import { zodToJsonSchema } from './zod-to-jsonschema.js';

export interface ExecuteResult {
  ok: boolean;
  output: unknown;
  durationMs: number;
}

export interface ToolRegistryOptions {
  // Quando true, tools com permissions==='high' passam por onHighConfirm
  // callback antes de executar. Sem callback, o gate eh deny.
  highRequiresConfirm?: boolean;
  // Callback de confirmacao para tools HIGH (recebe nome, devolve boolean).
  // Async-aware: pode retornar Promise<boolean>.
  onHighConfirm?: (toolName: string) => Promise<boolean> | boolean;
}

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();
  readonly highRequiresConfirm: boolean;
  readonly onHighConfirm: ((toolName: string) => Promise<boolean> | boolean) | undefined;

  constructor(opts: ToolRegistryOptions = {}) {
    this.highRequiresConfirm = opts.highRequiresConfirm ?? false;
    this.onHighConfirm = opts.onHighConfirm;
  }

  register<TIn, TOut>(tool: Tool<TIn, TOut>): this {
    if (this.tools.has(tool.name)) {
      throw new Error(`ToolRegistry: tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool as Tool);
    return this;
  }

  registerMany(tools: Tool[]): this {
    for (const t of tools) this.register(t);
    return this;
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  // Converte para o formato usado pelo LLM (ToolDefinition do providers).
  toLLMTools(): ToolDefinition[] {
    return this.list().map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.inputSchema),
    }));
  }

  async execute(name: string, rawInput: unknown, ctx: ToolContext): Promise<ExecuteResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        ok: false,
        output: `Tool not found: ${name}`,
        durationMs: 0,
      };
    }
    const start = Date.now();

    // Gate HIGH: tools com permissions==='high' passam por callback de confirm
    // quando flag esta on. Sem callback: deny (seguro por default).
    if (tool.permissions === 'high' && this.highRequiresConfirm) {
      if (!this.onHighConfirm) {
        return {
          ok: false,
          output: `Tool '${name}' requires HIGH confirmation but no onHighConfirm callback is configured (denied)`,
          durationMs: Date.now() - start,
        };
      }
      const allowed = await Promise.resolve(this.onHighConfirm(name));
      if (!allowed) {
        return {
          ok: false,
          output: `Tool '${name}' HIGH execution denied by confirmation callback`,
          durationMs: Date.now() - start,
        };
      }
    }

    let parsed: unknown;
    try {
      parsed = tool.inputSchema.parse(rawInput);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        output: `Invalid input for tool '${name}': ${msg}`,
        durationMs: Date.now() - start,
      };
    }

    try {
      const out = await tool.run(ctx, parsed);
      return { ok: true, output: out, durationMs: Date.now() - start };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, output: msg, durationMs: Date.now() - start };
    }
  }
}
