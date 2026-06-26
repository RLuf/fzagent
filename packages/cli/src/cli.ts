// fzagent CLI binario.
//
// Uso:
//   fzagent "<prompt>"                    one-shot (auto-detect)
//   fzagent --tui                         loop interativo
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

import type { Message } from '@fzagent/core';

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
  .option('--tui', 'modo TUI interativo (REPL)')
  .option('-c, --continue', 'continua a ultima sessao (default em REPL; explicito em one-shot)')
  .option('--new', 'forca sessao nova (descarta history acumulada)')
  .option('-m, --model <model>', 'modelo LLM para esta rodada')
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

// fallback: prompt one-shot ou --tui
program.action(
  async (
    prompt: string | undefined,
    opts: { tui?: boolean; continue?: boolean; new?: boolean; model?: string },
  ) => {
    if (opts.tui) {
      // Por padrao, --tui abre o TUI fullscreen (Ink) do pacote @fzagent/tui.
      // Para forcar o REPL readline legacy, defina FZAGENT_LEGACY_CLI=1.
      if (process.env['FZAGENT_LEGACY_CLI'] === '1') {
        await runInteractive({
          ...(opts.continue && { continueLast: true }),
          ...(opts.model !== undefined && { model: opts.model }),
        });
        return;
      }
      const { startTuiRepl } = await import('@fzagent/tui');
      const rt = await buildRuntime({ silent: true });
      try {
        await startTuiRepl(rt, () => buildAgent(rt), {
          ...(opts.continue && { continueLast: true }),
          ...(opts.model !== undefined && { model: opts.model }),
        });
      } finally {
        rt.indexer.close();
        rt.sessionStore.close();
      }
      return;
    }
    if (prompt) {
      // ONE-SHOT: continuidade ATIVA por default (Roginho usa one-shot)
      // pode desligar com --new explicito.
      const continueLast = !opts.new;
      await runAgentLoop(prompt, {
        continueLast,
        ...(opts.model !== undefined && { model: opts.model }),
      });
      return;
    }
    program.help();
  },
);

async function runAgentLoop(
  task: string,
  opts: {
    model?: string;
    maxIterations?: number;
    tokenBudget?: number;
    continueLast?: boolean;
  },
): Promise<void> {
  const rt = await buildRuntime({ silent: true });
  if (opts.maxIterations !== undefined) rt.conf.AGENTIC_MAX_ITERATIONS = opts.maxIterations;
  if (opts.tokenBudget !== undefined) rt.conf.AGENTIC_TOKEN_BUDGET = opts.tokenBudget;
  const a = buildAgent(rt);
  const agentId = 'fzagent';

  // Carrega history da ULTIMA sessao do agentId, se solicitado.
  let history: Message[] = [];
  if (opts.continueLast) {
    const recent = rt.sessionStore.listSessions(agentId, 1);
    if (recent.length > 0) {
      history = rt.sessionStore.getRecentTurns(recent[0]!.id, rt.conf.AGENTIC_HISTORY_TURNS);
      console.log(
        pc.dim(`[continue] retomando de ${recent[0]!.id.slice(0, 8)} (${history.length} msgs)`),
      );
    }
  }

  try {
    for await (const ev of a.run({
      task,
      history,
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

async function runInteractive(
  opts: { continueLast?: boolean; model?: string } = {},
): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const rt = await buildRuntime({ silent: true });
  const a = buildAgent(rt);
  const agentId = 'fzagent';

  // estado da sessao interativa
  let history: Message[] = [];
  let currentModel: string | undefined = opts.model;
  let currentSessionId: string | undefined;

  console.log(pc.bold('fzagent') + pc.dim(' — modo interativo'));
  console.log(
    pc.dim(
      'comandos: /help /model [id] /clear /reset /sessions [N] /load <id> /tools /skills /save /exit',
    ),
  );

  // -c: pre-carrega ultima sessao
  if (opts.continueLast) {
    const recent = rt.sessionStore.listSessions(agentId, 1);
    if (recent.length > 0) {
      history = rt.sessionStore.getRecentTurns(recent[0]!.id, rt.conf.AGENTIC_HISTORY_TURNS);
      currentSessionId = recent[0]!.id;
      console.log(
        pc.green(`[continue] retomada de ${recent[0]!.id.slice(0, 8)} (${history.length} msgs)`),
      );
    } else {
      console.log(pc.dim('[continue] nenhuma sessao anterior; comecando do zero'));
    }
  }

  try {
    while (true) {
      const line = (await rl.question(pc.cyan('> '))).trim();
      if (!line) break;

      // slash commands
      if (line.startsWith('/')) {
        const [cmd, ...args] = line.slice(1).split(/\s+/);
        if (cmd === 'help') {
          console.log(pc.dim('/help                este menu'));
          console.log(pc.dim('/model               imprime modelo atual + opcoes'));
          console.log(pc.dim('/model <id>          troca modelo das proximas rodadas'));
          console.log(pc.dim('/clear  /reset       zera history em memoria'));
          console.log(pc.dim('/sessions [N]        lista N sessoes mais recentes (default 10)'));
          console.log(
            pc.dim('/load <sessionId>    carrega history de uma sessao antiga (prefix OK)'),
          );
          console.log(pc.dim('/tools               lista tools registradas'));
          console.log(pc.dim('/skills              lista skills registradas'));
          console.log(pc.dim('/save                imprime quantas msgs estao persistidas'));
          console.log(pc.dim('/exit  /quit         sai do REPL (linha vazia tambem sai)'));
        } else if (cmd === 'model') {
          if (args.length === 0) {
            console.log(pc.dim(`atual: ${currentModel ?? rt.conf.DEFAULT_MODEL}`));
            console.log(pc.dim(`MODELS_ANTHROPIC: ${rt.conf.MODELS_ANTHROPIC}`));
            console.log(pc.dim(`MODELS_OLLAMA:    ${rt.conf.MODELS_OLLAMA}`));
            if (rt.conf.MODELS_GOOGLE)
              console.log(pc.dim(`MODELS_GOOGLE:    ${rt.conf.MODELS_GOOGLE}`));
            if (rt.conf.MODELS_OPENAI)
              console.log(pc.dim(`MODELS_OPENAI:    ${rt.conf.MODELS_OPENAI}`));
          } else {
            currentModel = args[0];
            console.log(pc.green(`modelo trocado: ${args[0]}`));
          }
        } else if (cmd === 'reset' || cmd === 'clear') {
          history = [];
          currentSessionId = undefined;
          console.log(pc.yellow('history zerada (proxima msg inicia sessao nova)'));
        } else if (cmd === 'sessions') {
          const n = args[0] ? Number(args[0]) : 10;
          const list = rt.sessionStore.listSessions(agentId, n);
          if (list.length === 0) {
            console.log(pc.dim('(nenhuma sessao)'));
          } else {
            for (const s of list) {
              const dt = new Date(s.startedAt).toISOString().replace('T', ' ').slice(0, 19);
              const tag = s.id === currentSessionId ? pc.green(' *') : '  ';
              console.log(
                `${tag}${pc.cyan(s.id.slice(0, 8))}  ${pc.dim(dt)}  ${pc.dim(s.status)}  ${(s.task ?? '').slice(0, 60)}`,
              );
            }
          }
        } else if (cmd === 'load') {
          if (!args[0]) {
            console.log(pc.red('uso: /load <sessionId>  (prefixo de 8 chars OK)'));
          } else {
            const all = rt.sessionStore.listSessions(agentId, 200);
            const match = all.find((s) => s.id === args[0] || s.id.startsWith(args[0]!));
            if (!match) {
              console.log(pc.red(`sessao nao encontrada: ${args[0]}`));
            } else {
              history = rt.sessionStore.getRecentTurns(match.id, rt.conf.AGENTIC_HISTORY_TURNS);
              currentSessionId = match.id;
              console.log(
                pc.green(`carregadas ${history.length} mensagens de ${match.id.slice(0, 8)}`),
              );
            }
          }
        } else if (cmd === 'tools') {
          for (const t of rt.tools.list()) {
            console.log(`${pc.cyan(t.name)} [${t.permissions}] — ${t.description}`);
          }
        } else if (cmd === 'skills') {
          for (const s of rt.skills.list()) {
            console.log(`${pc.cyan(s.name)} [${s.permissions ?? 'low'}] — ${s.description}`);
          }
        } else if (cmd === 'save') {
          console.log(
            pc.green(`${history.length} mensagens em memoria; sqlite ja persiste turno-a-turno`),
          );
        } else if (cmd === 'exit' || cmd === 'quit') {
          break;
        } else {
          console.log(pc.red(`comando desconhecido: /${cmd}  (use /help)`));
        }
        continue;
      }

      // chamada do agent com history acumulada
      let lastSessionId: string | undefined;
      for await (const ev of a.run({
        task: line,
        history,
        ...(currentModel !== undefined && { model: currentModel }),
      })) {
        switch (ev.type) {
          case 'session-started':
            lastSessionId = ev.sessionId;
            console.log(pc.dim(`[session ${ev.sessionId.slice(0, 8)}]`));
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
            console.log(
              ev.ok ? pc.green('  ok') : pc.red('  err'),
              String(ev.output).slice(0, 200),
            );
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
                `[lembrete] iter ${ev.iteration} tokens=${ev.tokensUsed} (+${ev.reminderTokens})`,
              ),
            );
            break;
          case 'compaction-triggered':
            console.log(pc.yellow(`[compactando contexto... tokens=${ev.tokensBefore}]`));
            break;
          case 'compaction-completed':
            console.log(
              pc.green(
                `[compactado: ${ev.messagesBefore}->${ev.messagesAfter} msgs, ~${ev.tokensSaved} tokens]`,
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

      // recarrega history completa da sessao recem-rodada para a proxima rodada
      if (lastSessionId) {
        currentSessionId = lastSessionId;
        history = rt.sessionStore.getRecentTurns(lastSessionId, rt.conf.AGENTIC_HISTORY_TURNS);
      }
    }
  } finally {
    rt.indexer.close();
    rt.sessionStore.close();
    rl.close();
  }
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
