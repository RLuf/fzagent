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
  .action(async () => {
    const rt = await buildRuntime({ silent: true });
    for (const s of rt.skills.list()) {
      console.log(`${pc.cyan(s.name)} [${s.permissions ?? 'low'}] — ${s.description}`);
    }
  });

agent
  .command('use <skillId>')
  .argument('[args...]')
  .description('invoca uma skill com input JSON')
  .action(async (skillId: string, args: string[]) => {
    const rt = await buildRuntime({ silent: true });
    const input = args.length > 0 ? JSON.parse(args.join(' ')) : {};
    const out = await rt.skills.invoke(skillId, input, { cwd: process.cwd(), logger: rt.logger });
    console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 2));
  });

// skill — comandos dedicados de inspecao do registry (manifest v1).
const skill = program.command('skill').description('inspeciona o SkillRegistry');
skill
  .command('list')
  .option('--domain <d>', 'filtra por targetDomain')
  .option('--destructive', 'apenas skills declaradas destrutivas')
  .description('lista skills com manifest v1 (nome, perm, domain, destrutiva)')
  .action(async (opts: { domain?: string; destructive?: boolean }) => {
    const rt = await buildRuntime({ silent: true });
    for (const s of rt.skills.list()) {
      if (opts.domain && (s.targetDomain ?? 'custom') !== opts.domain) continue;
      if (opts.destructive && !s.isDestructive) continue;
      const dom = pc.dim(`[${s.targetDomain ?? 'custom'}]`);
      const perm = pc.yellow(`[${s.permissions ?? 'low'}]`);
      const flag = s.isDestructive ? pc.red(' DESTRUCTIVE') : '';
      console.log(`${pc.cyan(s.name)} ${perm} ${dom}${flag} — ${s.description}`);
    }
  });

skill
  .command('describe <name>')
  .description('imprime o manifest completo de uma skill')
  .action(async (name: string) => {
    const rt = await buildRuntime({ silent: true });
    const s = rt.skills.get(name);
    if (!s) {
      console.error(pc.red(`skill nao encontrada: ${name}`));
      process.exit(1);
    }
    const manifest = {
      name: s.name,
      description: s.description,
      version: s.version ?? '0.1.0',
      permissions: s.permissions ?? 'low',
      category: s.category ?? 'custom',
      targetDomain: s.targetDomain ?? 'custom',
      isDestructive: s.isDestructive ?? false,
      requiresConfirmation: rt.skills.requiresConfirmation(name),
      triggers: s.triggers ?? [],
      filePath: s.filePath,
    };
    console.log(JSON.stringify(manifest, null, 2));
  });

// tools — inspecao das tools nativas (fs, shell, web, wiki, skill.invoke, etc.)
const tools = program.command('tools').description('inspeciona as tools nativas do agente');
tools
  .command('list')
  .description('lista todas as tools nativas registradas no ToolRegistry')
  .action(async () => {
    const rt = await buildRuntime({ silent: true });
    for (const t of rt.tools.list()) {
      console.log(`${pc.cyan(t.name)} ${pc.yellow(`[${t.permissions}]`)} — ${t.description}`);
    }
  });

tools
  .command('describe <name>')
  .description('imprime schema da tool')
  .action(async (name: string) => {
    const rt = await buildRuntime({ silent: true });
    const t = rt.tools.get(name);
    if (!t) {
      console.error(pc.red(`tool nao encontrada: ${name}`));
      process.exit(1);
    }
    const llmShape = rt.tools.toLLMTools().find((x: any) => x.name === name);
    console.log(
      JSON.stringify(
        {
          name: t.name,
          description: t.description,
          permissions: t.permissions,
          inputSchema: llmShape?.inputSchema,
        },
        null,
        2,
      ),
    );
  });

// wiki
const wiki = program.command('wiki').description('cerebro secundario');
wiki
  .command('ingest <path>')
  .option('--summarize', 'gera resumo via LLM')
  .action(async (path: string, opts: { summarize?: boolean }) => {
    const rt = await buildRuntime({ silent: true });
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
    const rt = await buildRuntime({ silent: true });
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

wiki.command('lint').action(async () => {
  const rt = await buildRuntime({ silent: true });
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

wiki.command('stats').action(async () => {
  const rt = await buildRuntime({ silent: true });
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
  const rt = await buildRuntime({ silent: true });
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
    const rt = await buildRuntime({ silent: true });
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
  .action(async () => {
    const rt = await buildRuntime({ silent: true });
    console.log(JSON.stringify({ conf: rt.conf, env: maskSecrets(rt.env) }, null, 2));
    rt.indexer.close();
    rt.sessionStore.close();
  });

// server
const server = program.command('server').description('gerencia o servidor Web Central Command');

server
  .command('run', { isDefault: true })
  .description('inicia o servidor em foreground (default)')
  .option('-p, --port <port>', 'porta do servidor', '7331')
  .option('-h, --host <host>', 'host do servidor', '0.0.0.0')
  .action(async (opts: { port: string; host: string }) => {
    const rt = await buildRuntime({ silent: true });
    const { startServer } = await import('./server.js');
    await startServer(rt, {
      port: Number(opts.port),
      host: opts.host,
    });
  });

server
  .command('install')
  .description('instala o fzagent como um servico systemd (exige sudo)')
  .action(async () => {
    await handleServiceCommand('install');
  });

server
  .command('uninstall')
  .description('remove o servico systemd (exige sudo)')
  .action(async () => {
    await handleServiceCommand('uninstall');
  });

server
  .command('start')
  .description('inicia o servico via systemctl')
  .action(async () => {
    await handleServiceCommand('start');
  });

server
  .command('stop')
  .description('para o servico via systemctl')
  .action(async () => {
    await handleServiceCommand('stop');
  });

server
  .command('status')
  .description('mostra o status do servico no systemd')
  .action(async () => {
    await handleServiceCommand('status');
  });

async function handleServiceCommand(cmd: string) {
  const { execSync } = await import('node:child_process');
  const { readFileSync, writeFileSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');
  const os = await import('node:os');

  const serviceName = 'fzagent.service';
  const servicePath = `/etc/systemd/system/${serviceName}`;
  const cwd = process.cwd();
  const user = os.userInfo().username;

  // Tenta localizar o binario/script fzagent.
  // Se rodando via npx, usaremos o proprio node + path do cli.js compilado.
  const nodeBin = process.execPath;
  const scriptPath = resolve(here, 'cli.js');
  const execCmd = `${nodeBin} ${scriptPath}`;

  try {
    switch (cmd) {
      case 'install': {
        console.log(pc.blue(`Instalando servico em ${servicePath}...`));
        const rootDir = resolve(here, '../../..');
        const templatePath = join(rootDir, 'scripts/fzagent.service.template');
        if (!existsSync(templatePath)) {
          throw new Error(`Template nao encontrado em ${templatePath}`);
        }
        const template = readFileSync(templatePath, 'utf-8');
        const content = template
          .replace('{{USER}}', user)
          .replace('{{CWD}}', cwd)
          .replace('{{EXEC_COMMAND}}', execCmd);

        writeFileSync('/tmp/fzagent.service', content);
        execSync(`sudo mv /tmp/fzagent.service ${servicePath}`);
        execSync('sudo systemctl daemon-reload');
        execSync(`sudo systemctl enable ${serviceName}`);
        console.log(pc.green('Servico instalado e habilitado com sucesso!'));
        console.log(pc.dim('Use: fzagent server start'));
        break;
      }

      case 'uninstall':
        console.log(pc.blue('Removendo servico...'));
        execSync(`sudo systemctl stop ${serviceName} || true`);
        execSync(`sudo systemctl disable ${serviceName} || true`);
        execSync(`sudo rm ${servicePath}`);
        execSync('sudo systemctl daemon-reload');
        console.log(pc.green('Servico removido.'));
        break;

      case 'start':
        console.log(pc.blue('Iniciando fzagent via systemctl...'));
        execSync(`sudo systemctl start ${serviceName}`);
        console.log(pc.green('Iniciado.'));
        break;

      case 'stop':
        console.log(pc.blue('Parando fzagent via systemctl...'));
        execSync(`sudo systemctl stop ${serviceName}`);
        console.log(pc.green('Parado.'));
        break;

      case 'status':
        try {
          const out = execSync(`systemctl status ${serviceName}`, { encoding: 'utf-8' });
          console.log(out);
        } catch (err: any) {
          console.log(err.stdout || 'Servico nao esta rodando ou nao instalado.');
        }
        break;
    }
  } catch (err: any) {
    console.error(pc.red('Erro ao gerenciar servico:'), err.message);
    if (err.stderr) console.error(pc.dim(err.stderr.toString()));
  }
}

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
  const rt = await buildRuntime({ silent: true });
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
        case 'context-reinjected':
          console.log(
            pc.dim(
              `[lembrete] iter ${ev.iteration} tokens=${ev.tokensUsed} (+${ev.reminderTokens} reinjetados)`,
            ),
          );
          break;
        case 'compaction-triggered':
          console.log(pc.yellow(`[compactando contexto... tokens=${ev.tokensBefore}]`));
          break;
        case 'compaction-completed':
          console.log(
            pc.green(
              `[compactado: ${ev.messagesBefore}->${ev.messagesAfter} msgs, ~${ev.tokensSaved} tokens economizados]`,
            ),
          );
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
    const val = out[k];
    if (typeof val === 'string' && val.length > 0) {
      out[k] = '***' + val.slice(-4);
    }
  }
  return out;
}

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(pc.red('error:'), err instanceof Error ? err.message : err);
  process.exit(1);
});
