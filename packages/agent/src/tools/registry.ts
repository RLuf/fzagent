// ToolRegistry: registra tools, expoe schemas LLM-friendly e dispatch validado.

import type { ToolDefinition } from '@fzagent/providers';

import type { Tool, ToolContext } from './types.js';
import { zodToJsonSchema } from './zod-to-jsonschema.js';

export interface ExecuteResult {
  ok: boolean;
  output: unknown;
  durationMs: number;
}

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

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
