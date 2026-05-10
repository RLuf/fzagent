// fzagent CLI binario.
//
// Uso:
//   fzagent "<prompt>"                    one-shot (auto-detect)
//   fzagent --cli                         loop interativo
//   fzagent agent loop "<task>"           loop agentico explicito
//   fzagent agent budget "<task>" -i 30 --token-budget 200000
//   fzagent agent skills | use <id>
//   fzagent wiki ingest <path>
//   fzagent wiki query "<q>"
//   fzagent wiki lint
//   fzagent wiki stats
//   fzagent vector validate
//   fzagent vector recreate
//   fzagent config
//   fzagent --version

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';
import pc from 'picocolors';

import { buildAgent, buildRuntime } from './factory.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(here, '..', 'package.json'), 'utf8')) as {
  version: string;
};

const program = new Command();
program
  .name('fzagent')
  .description('Superagente OpenClaw-style com cerebro secundario.')
  .version(pkg.version, '-v, --version')
  .option('--cli', 'modo CLI interativo')
  .option('--dry-run', 'nao executa tools com side-effects (impl gradual)')
  .argument('[prompt]', 'one-shot prompt');

// agent
const agent = program.command('agent').description('comandos do nucleo agent');
agent
  .command('loop')
  .argument('<task>', 'tarefa para o agente')
  .option('-m, --model <model>', 'modelo')
  .action(async (task: string, opts: { model?: string }) => {
    await runAgentLoop(task, opts);
  });

agent
  .command('budget')
  .argument('<task>')
  .option('-i, --max-iterations <n>', 'max iterations', String(20))
  .option('--token-budget <n>', 'token budget', String(100_000))
  .action(async (task: string, opts: { maxIterations: string; tokenBudget: string }) => {
    await runAgentLoop(task, {
      maxIterations: Number(opts.maxIterations),
      tokenBudget: Number(opts.tokenBudget),
    });
  });

agent
  .command('skills')
  .description('lista skills disponiveis')
  .action(() => {
    const rt = buildRuntime({ silent: true });
    for (const s of rt.skills.list()) {
      console.log(`${pc.cyan(s.name)} [${s.permissions ?? 'low'}] — ${s.description}`);
    }
  });

agent
  .command('use <skillId>')
  .argument('[args...]')
  .description('invoca uma skill com input JSON')
  .action(async (skillId: string, args: string[]) => {
    const rt = buildRuntime({ silent: true });
    const input = args.length > 0 ? JSON.parse(args.join(' ')) : {};
    const out = await rt.skills.invoke(skillId, input, { cwd: process.cwd(), logger: rt.logger });
    console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 2));
  });

// wiki
const wiki = program.command('wiki').description('cerebro secundario');
wiki
  .command('ingest <path>')
  .option('--summarize', 'gera resumo via LLM')
  .action(async (path: string, opts: { summarize?: boolean }) => {
    const rt = buildRuntime({ silent: true });
    try {
      const { ingest } = await import('@fzagent/memory');
      const ev = await ingest(
        path,
        {
          indexer: rt.indexer,
          qdrant: rt.qdrant,
          embeddings: rt.embeddings,
          router: rt.router,
          logger: rt.logger,
        },
        { summarize: opts.summarize === true },
      );
      console.log(pc.green('OK'), `pageId=${ev.pageId} sha256=${ev.sha256.slice(0, 12)}`);
    } finally {
      rt.indexer.close();
      rt.sessionStore.close();
    }
  });

wiki
  .command('query <q>')
  .option('--top <n>', 'top-K', '5')
  .option('--synthesize', 'sintetiza resposta via LLM')
  .action(async (q: string, opts: { top: string; synthesize?: boolean }) => {
    const rt = buildRuntime({ silent: true });
    try {
      const { query } = await import('@fzagent/memory');
      const r = await query(
        q,
        {
          indexer: rt.indexer,
          qdrant: rt.qdrant,
          embeddings: rt.embeddings,
          router: rt.router,
          logger: rt.logger,
        },
        { topK: Number(opts.top), synthesize: opts.synthesize === true },
      );
      if (r.synthesis) console.log(pc.bold('Sintese:'), r.synthesis, '\n');
      for (const [i, h] of r.results.entries()) {
        console.log(pc.dim(`[${i + 1}]`), pc.cyan(h.source), h.excerpt.slice(0, 120));
      }
    } finally {
      rt.indexer.close();
      rt.sessionStore.close();
    }
  });

wiki.command('lint').action(() => {
  const rt = buildRuntime({ silent: true });
  try {
    const r = rt.indexer.lint();
    console.log(`Orfas: ${r.orphans.length}`);
    console.log(`Links quebrados: ${r.brokenLinks.length}`);
    console.log(`Fontes nao-anexadas: ${r.unattachedSources.length}`);
    for (const o of r.orphans.slice(0, 10)) console.log(pc.yellow('  orfa:'), o.path);
    for (const b of r.brokenLinks.slice(0, 10))
      console.log(pc.red('  broken:'), `[[${b.anchorText}]]`);
  } finally {
    rt.indexer.close();
    rt.sessionStore.close();
  }
});

wiki.command('stats').action(() => {
  const rt = buildRuntime({ silent: true });
  try {
    console.log(rt.indexer.stats());
  } finally {
    rt.indexer.close();
    rt.sessionStore.close();
  }
});

// vector
const vec = program.command('vector').description('vector store (Qdrant)');
vec.command('validate').action(async () => {
  const rt = buildRuntime({ silent: true });
  try {
    const stats = await rt.qdrant.validate();
    for (const s of stats) {
      const status = s.exists && s.ok ? pc.green('OK') : pc.red('FAIL');
      console.log(
        `${status} ${s.name} — exists=${s.exists} dim=${s.dim ?? '?'} points=${s.pointsCount}`,
      );
      if (s.error) console.log(pc.dim('  ' + s.error));
    }
  } finally {
    rt.indexer.close();
    rt.sessionStore.close();
  }
});

vec
  .command('recreate <name>')
  .description('recria a collection (DESTRUTIVO)')
  .action(async (name: string) => {
    const rt = buildRuntime({ silent: true });
    try {
      await rt.qdrant.recreateCollection(name);
      console.log(pc.green('recriada:'), name);
    } finally {
      rt.indexer.close();
      rt.sessionStore.close();
    }
  });

// config
program
  .command('config')
  .description('imprime configuracao efetiva (.env + fzagent.conf merged)')
  .action(() => {
    const rt = buildRuntime({ silent: true });
    console.log(JSON.stringify({ conf: rt.conf, env: maskSecrets(rt.env) }, null, 2));
    rt.indexer.close();
    rt.sessionStore.close();
  });

// fallback: prompt one-shot ou --cli
program.action(async (prompt: string | undefined, opts: { cli?: boolean }) => {
  if (opts.cli) {
    await runInteractive();
    return;
  }
  if (prompt) {
    await runAgentLoop(prompt, {});
    return;
  }
  program.help();
});

async function runAgentLoop(
  task: string,
  opts: { model?: string; maxIterations?: number; tokenBudget?: number },
): Promise<void> {
  const rt = buildRuntime({ silent: true });
  if (opts.maxIterations !== undefined) rt.conf.AGENTIC_MAX_ITERATIONS = opts.maxIterations;
  if (opts.tokenBudget !== undefined) rt.conf.AGENTIC_TOKEN_BUDGET = opts.tokenBudget;
  const a = buildAgent(rt);
  try {
    for await (const ev of a.run({
      task,
      ...(opts.model !== undefined && { model: opts.model }),
    })) {
      switch (ev.type) {
        case 'session-started':
          console.log(pc.dim(`[session ${ev.sessionId}]`));
          break;
        case 'iteration':
          console.log(pc.dim(`--- iter ${ev.n} ---`));
          break;
        case 'assistant':
          if (ev.message.content) console.log(ev.message.content);
          break;
        case 'tool-call':
          console.log(pc.cyan(`→ ${ev.call.name}(${JSON.stringify(ev.call.input)})`));
          break;
        case 'tool-result':
          console.log(ev.ok ? pc.green('  ok') : pc.red('  err'), String(ev.output).slice(0, 200));
          break;
        case 'iteration-error':
          console.log(pc.red('error:'), ev.error);
          break;
        case 'budget-exceeded':
          console.log(pc.yellow(`budget exceeded: ${ev.reason} after ${ev.iterations} iters`));
          break;
        case 'circuit-breaker-tripped':
          console.log(pc.red('circuit breaker open'));
          break;
        case 'aborted':
          console.log(pc.yellow('aborted'));
          break;
        case 'end':
          console.log(
            pc.dim(
              `[end] stopReason=${ev.stopReason} iters=${ev.iterations} tokens=${ev.tokensUsed}`,
            ),
          );
          break;
        default:
          break;
      }
    }
  } finally {
    rt.indexer.close();
    rt.sessionStore.close();
  }
}

async function runInteractive(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log(pc.bold('fzagent') + pc.dim(' — modo interativo (vazio para sair)'));
  while (true) {
    const line = (await rl.question(pc.cyan('> '))).trim();
    if (!line) break;
    await runAgentLoop(line, {});
  }
  rl.close();
}

function maskSecrets(env: Record<string, unknown>): Record<string, unknown> {
  const SECRET_KEYS = [
    'ANTHROPIC_API_KEY',
    'CLAUDE_CODE_OAUTH_TOKEN',
    'ANTHROPIC_OAUTH_TOKEN',
    'ANTHROPIC_AUTH_TOKEN',
    'OPENAI_API_KEY',
    'GOOGLE_API_KEY',
    'OPENROUTER_API_KEY',
    'BRAVE_SEARCH_API_KEY',
    'QDRANT_API_KEY',
  ];
  const out: Record<string, unknown> = { ...env };
  for (const k of SECRET_KEYS) {
    if (typeof out[k] === 'string' && (out[k] as string).length > 0) {
      out[k] = '***' + (out[k] as string).slice(-4);
    }
  }
  return out;
}

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(pc.red('error:'), err instanceof Error ? err.message : err);
  process.exit(1);
});
