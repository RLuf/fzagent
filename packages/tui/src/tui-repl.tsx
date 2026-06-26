// packages/tui/src/tui-repl.tsx — componente principal do REPL Ink fullscreen.
//
// Consome Agent.run() como AsyncIterable<AgentEvent> e renderiza visualmente
// cada tipo de evento:
//   - thinking: spinner discreto
//   - tool-call: linha amarela "🔧 toolName(args)"
//   - tool-result: linha cyan/verm com status e duracao
//   - assistant: texto magenta streamado
//   - iteration / session-started: footer info
//   - end / aborted / budget-exceeded / circuit-breaker-tripped: status final

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import type { Message } from '@fzagent/core';

import { ensureDirs } from './utils/paths.js';
import { onResize } from './utils/terminal.js';
import { buildRegistry } from './commands/index.js';
import type { CommandContext, CommandRegistry } from './commands/types.js';
import type { TuiRuntime, AgentFactory, AgentEvent } from './commands/runtime-shim.js';

export interface TuiReplProps {
  runtime: TuiRuntime;
  agentFactory: AgentFactory;
  initialModel?: string | undefined;
  continueLast?: boolean | undefined;
}

const h = React.createElement;

// Itens do feed renderizado — mix de Messages e meta-eventos do Agent.
type FeedItem =
  | { kind: 'system'; content: string }
  | { kind: 'user'; content: string }
  | { kind: 'assistant'; content: string }
  | { kind: 'thinking' }
  | { kind: 'tool-call'; tool: string; argsPreview: string }
  | { kind: 'tool-result'; tool: string; ok: boolean; durationMs: number; outputPreview: string }
  | { kind: 'meta'; content: string };

function previewJson(value: unknown, maxLen = 80): string {
  try {
    const s = JSON.stringify(value);
    if (!s) return '';
    return s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
  } catch {
    return String(value).slice(0, maxLen);
  }
}

function estimateLines(text: string, width: number): number {
  const lines = text.split('\n');
  let count = 0;
  for (const line of lines) {
    count += Math.max(1, Math.ceil(line.length / width));
  }
  return count;
}

function getFeedItemHeight(item: FeedItem, width: number): number {
  const contentWidth = width - 4; // account for padding/margins
  if (item.kind === 'user' || item.kind === 'assistant') {
    return estimateLines(item.content, contentWidth);
  }
  if (item.kind === 'thinking') {
    return 1;
  }
  if (item.kind === 'tool-call') {
    const text = `🔧 ${item.tool} ${item.argsPreview}`;
    return estimateLines(text, contentWidth);
  }
  if (item.kind === 'tool-result') {
    const tag = item.ok ? '✓' : '✗';
    const text = `${tag} ${item.tool} (${item.durationMs}ms)  ${item.outputPreview}`;
    return estimateLines(text, contentWidth);
  }
  return estimateLines((item as { content: string }).content || '', contentWidth);
}

export const TuiRepl: React.FC<TuiReplProps> = ({
  runtime,
  agentFactory,
  initialModel,
  continueLast,
}) => {
  const { exit } = useApp();
  const { stdout } = useStdout();

  ensureDirs();

  // viewport reativo a SIGWINCH
  const [viewport, setViewport] = useState({ cols: stdout.columns || 80, rows: stdout.rows || 24 });
  useEffect(() => {
    const off = onResize(() =>
      setViewport({ cols: stdout.columns || 80, rows: stdout.rows || 24 }),
    );
    return off;
  }, [stdout]);
  const cols = viewport.cols;
  const rows = viewport.rows;

  const [input, setInput] = useState('');
  const [feed, setFeed] = useState<FeedItem[]>([
    { kind: 'system', content: 'fzagent TUI — digite "/" pra comandos, ou só fala.' },
  ]);
  const [running, setRunning] = useState(false);
  const [streamBuf, setStreamBuf] = useState('');
  const [tokens, setTokens] = useState(0);
  const [model, setModel] = useState<string | undefined>(initialModel);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<Message[]>([]);

  const [scrollOffset, setScrollOffset] = useState(0);

  // Reset scroll on new message or when running state changes
  useEffect(() => {
    setScrollOffset(0);
  }, [feed.length, running]);

  const abortRef = useRef<AbortController | null>(null);

  // injeta histórico das últimas 5 sessões e resumo da última
  useEffect(() => {
    const list = runtime.sessionStore.listSessions('fzagent', 5);
    let injectionMsg = '';

    if (list.length > 0) {
      const recentList = list
        .map((s) => `- ID: ${s.id.slice(0, 8)} | Task: ${s.task || 'Sem titulo'}`)
        .join('\n');
      injectionMsg += `Ultimas 5 sessoes:\n${recentList}\n\n`;

      const last = list[0];
      if (last) {
        const turns = runtime.sessionStore.getRecentTurns(last.id, 5);
        if (turns.length > 0) {
          const summary = turns
            .map(
              (t) =>
                `[${t.role}]: ${typeof t.content === 'string' ? t.content.slice(0, 200) : '...'}`,
            )
            .join('\n');
          injectionMsg += `Resumo da ultima sessao (${last.id.slice(0, 8)}):\n${summary}\n\n`;
        }
      }
    } else {
      injectionMsg += `Nenhuma sessao anterior encontrada.\n\n`;
    }

    injectionMsg += `Dica: voce pode usar a tool 'memory.record' para escrever fatos importantes no arquivo MEMORY.md do projeto e na base de dados (se aplicavel), garantindo contexto de longo prazo sem usar shell.exec.`;

    if (continueLast) {
      if (list.length === 0) {
        setFeed((f) => [...f, { kind: 'meta', content: '[continue] nenhuma sessao anterior.' }]);
        setHistory([{ role: 'system', content: injectionMsg, timestamp: Date.now() }]);
        return;
      }
      const last = list[0];
      if (!last) return;
      const turns = runtime.sessionStore.getRecentTurns(
        last.id,
        runtime.conf.AGENTIC_HISTORY_TURNS,
      ) as Message[];

      setHistory([...turns, { role: 'system', content: injectionMsg, timestamp: Date.now() }]);
      setSessionId(last.id);
      setFeed((f) => [
        ...f,
        {
          kind: 'meta',
          content: `[continue] retomada de ${last.id.slice(0, 8)} (${turns.length} msgs)`,
        },
      ]);
    } else {
      setHistory([{ role: 'system', content: injectionMsg, timestamp: Date.now() }]);
      setFeed((f) => [
        ...f,
        { kind: 'meta', content: '[system] Historico de sessoes recentes injetado.' },
      ]);
    }
  }, [continueLast, runtime]);

  // registry de commands
  const registry: CommandRegistry = useMemo(() => buildRegistry(), []);

  // pre-load commands em background para popular os metadados (exclui o desc: 'carregando...')
  useEffect(() => {
    registry.list().catch(() => {});
  }, [registry]);

  // popup autocomplete instantaneo (sincrono)
  const popup = useMemo(() => {
    if (!input.startsWith('/')) return [];
    const prefix = input.split(/\s+/)[0] ?? '';
    return registry.matchPrefix(prefix).slice(0, 6);
  }, [input, registry]);

  // Esc cancela run em andamento; senao limpa input. PageUp/PageDown rolam.
  useInput((_ch, key) => {
    if (key.escape) {
      if (running && abortRef.current) {
        abortRef.current.abort();
      } else {
        setInput('');
      }
    }
    if (key.pageUp) {
      setScrollOffset((prev) => Math.min(prev + 5, feed.length - 1));
    }
    if (key.pageDown) {
      setScrollOffset((prev) => Math.max(0, prev - 5));
    }
  });

  // ───────── helpers ─────────
  function pushFeed(item: FeedItem): void {
    setFeed((f) => [...f, item]);
  }

  function pushMsg(role: Message['role'], content: string): void {
    const kind = role === 'user' || role === 'assistant' || role === 'system' ? role : 'system';
    pushFeed({ kind, content } as FeedItem);
  }

  const ctx: CommandContext = useMemo(
    () => ({
      runtime,
      registry,
      pushMsg,
      getMessages: () => history,
      setMessages: (msgs: Message[]) => {
        setHistory(msgs);
        // limpa feed pra refletir history nova
        setFeed(
          msgs.map((m): FeedItem => {
            if (m.role === 'user') return { kind: 'user', content: contentToString(m.content) };
            if (m.role === 'assistant')
              return { kind: 'assistant', content: contentToString(m.content) };
            return {
              kind: 'meta',
              content: `[${m.role}] ${contentToString(m.content).slice(0, 80)}`,
            };
          }),
        );
      },
      getModel: () => model,
      setModel: (m: string | undefined) => setModel(m),
      getTokens: () => tokens,
      getSessionId: () => sessionId,
      setSessionId: (id: string | undefined) => setSessionId(id),
      exit: () => exit(),
    }),
    [runtime, registry, history, model, tokens, sessionId, exit],
  );

  async function dispatchCommand(raw: string): Promise<void> {
    const result = await registry.run(ctx, raw);
    if (result.type === 'skip') return;
    if (result.type === 'text' || result.type === 'compact') {
      pushFeed({ kind: 'meta', content: result.content });
    }
    // 'jsx' nao tratado nesse MVP — reservado p/ futuro.
  }

  async function handleSubmit(raw: string): Promise<void> {
    const text = raw.trim();
    if (!text || running) return;
    setInput('');

    if (text.startsWith('/')) {
      await dispatchCommand(text);
      return;
    }

    pushFeed({ kind: 'user', content: text });
    setRunning(true);
    setStreamBuf('');

    const agent = agentFactory();
    const controller = new AbortController();
    abortRef.current = controller;
    const runInput: { task: string; history: Message[]; signal: AbortSignal; model?: string } = {
      task: text,
      history,
      signal: controller.signal,
    };
    if (model !== undefined) runInput.model = model;

    let assistantBuf = '';
    let tokensInRun = 0;
    let toolFiredAny = false;

    try {
      for await (const ev of agent.run(runInput) as AsyncIterable<AgentEvent>) {
        if (ev.type === 'session-started') {
          setSessionId(ev.sessionId);
        } else if (ev.type === 'thinking') {
          pushFeed({ kind: 'thinking' });
        } else if (ev.type === 'tool-call') {
          toolFiredAny = true;
          pushFeed({
            kind: 'tool-call',
            tool: ev.call.name,
            argsPreview: previewJson(ev.call.input),
          });
        } else if (ev.type === 'tool-result') {
          pushFeed({
            kind: 'tool-result',
            tool: ev.call.name,
            ok: ev.ok,
            durationMs: ev.durationMs,
            outputPreview: ev.output.slice(0, 80) + (ev.output.length > 80 ? '…' : ''),
          });
        } else if (ev.type === 'assistant') {
          const content = contentToString(ev.message.content);
          assistantBuf = content;
          setStreamBuf(content);
          tokensInRun += ev.tokensIn + ev.tokensOut;
        } else if (ev.type === 'iteration-error') {
          pushFeed({ kind: 'meta', content: `[iter-erro] ${ev.error}` });
        } else if (ev.type === 'budget-exceeded') {
          pushFeed({
            kind: 'meta',
            content: `[budget] ${ev.reason} (${ev.iterations} it, ${ev.tokensUsed} tok)`,
          });
        } else if (ev.type === 'circuit-breaker-tripped') {
          pushFeed({ kind: 'meta', content: `[breaker] tripped (${ev.failures} failures)` });
        } else if (ev.type === 'aborted') {
          pushFeed({ kind: 'meta', content: '[abortado]' });
        } else if (ev.type === 'end') {
          pushFeed({
            kind: 'meta',
            content: `[fim] ${ev.stopReason} · ${ev.iterations} it · ${ev.tokensUsed} tok`,
          });
        }
        // outros eventos (context-reinjected, compaction-*) ficam silentes no MVP.
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      pushFeed({ kind: 'meta', content: `[erro de stream] ${msg}` });
    } finally {
      abortRef.current = null;
    }

    if (assistantBuf) {
      // append no feed final (substitui o stream buf)
      pushFeed({ kind: 'assistant', content: assistantBuf });
      // atualiza history local com o turno completo (user + assistant)
      const newUser: Message = { role: 'user', content: text, timestamp: Date.now() };
      const newAsst: Message = { role: 'assistant', content: assistantBuf, timestamp: Date.now() };
      setHistory((h) => [...h, newUser, newAsst]);
    }
    setStreamBuf('');
    setTokens((t) => t + tokensInRun);
    setRunning(false);
    // toolFiredAny only used pra debug futuro; nao exibe nada se falso.
    void toolFiredAny;
  }

  // ───────── render ─────────
  const reservedHeight = 8 + (popup.length > 0 ? Math.min(popup.length, 6) + 2 : 0);
  const availableHeight = rows - reservedHeight;

  const feedItemsWithHeights = useMemo(() => {
    return feed.map((item) => ({
      item,
      height: getFeedItemHeight(item, cols),
    }));
  }, [feed, cols]);

  const maxScroll = Math.max(0, feed.length - 1);
  const currentScrollOffset = Math.min(scrollOffset, maxScroll);
  const startIndex = feed.length - 1 - currentScrollOffset;

  const streamBufHeight = running && streamBuf.length > 0 ? estimateLines(streamBuf, cols - 4) : 0;

  const visibleItems: FeedItem[] = [];
  let usedHeight = 0;
  let hasMoreAbove = false;
  const hasMoreBelow = currentScrollOffset > 0;

  let feedAvailableHeight = Math.max(2, availableHeight - streamBufHeight);
  if (hasMoreBelow) feedAvailableHeight -= 1; // reserva 1 linha para o indicador ▼

  for (let i = startIndex; i >= 0; i--) {
    const entry = feedItemsWithHeights[i];
    if (!entry) break;

    const potentialHasMoreAbove = i > 0;
    const requiredHeight = entry.height + (potentialHasMoreAbove ? 1 : 0);

    if (usedHeight + requiredHeight > feedAvailableHeight) {
      if (visibleItems.length === 0) {
        visibleItems.push(entry.item);
      }
      hasMoreAbove = true;
      break;
    }

    visibleItems.unshift(entry.item);
    usedHeight += entry.height;
  }

  return h(
    Box,
    { flexDirection: 'column', width: cols, height: rows },
    // header
    h(
      Box,
      { borderStyle: 'round', borderColor: 'cyan', paddingX: 1, flexShrink: 0 },
      h(
        Box,
        { flexDirection: 'column', flexGrow: 1 },
        h(
          Text,
          null,
          h(Text, { color: 'cyan', bold: true }, 'fzagent TUI '),
          h(Text, { dimColor: true }, 'v0.1 · REPL fullscreen'),
        ),
        h(
          Text,
          { dimColor: true },
          `modelo: ${model ?? runtime.conf.DEFAULT_MODEL}  ·  sessão: ${sessionId ? sessionId.slice(0, 8) : '(nova)'}`,
        ),
      ),
    ),

    // feed
    h(
      Box,
      { flexDirection: 'column', flexGrow: 1, paddingX: 1, paddingY: 0, overflow: 'hidden' },
      hasMoreAbove &&
        h(
          Text,
          { key: 'more-above', color: 'yellow', dimColor: true },
          '▲ [PageUp] Mais historico acima',
        ),
      ...visibleItems.map((item, i) => renderItem(item, i)),
      hasMoreBelow &&
        h(
          Text,
          { key: 'more-below', color: 'yellow', dimColor: true },
          '▼ [PageDown] Mais mensagens abaixo',
        ),
      running &&
        streamBuf.length > 0 &&
        h(
          Text,
          { key: 'stream' },
          h(Text, { color: 'magenta' }, '◆ '),
          h(Text, null, streamBuf),
          h(Text, { color: 'magenta' }, '▍'),
        ),
    ),

    // popup
    popup.length > 0 &&
      h(
        Box,
        {
          flexDirection: 'column',
          borderStyle: 'single',
          borderColor: 'yellow',
          paddingX: 1,
          marginX: 1,
          flexShrink: 0,
        },
        ...popup.map((c) =>
          h(
            Text,
            { key: c.name },
            h(Text, { color: 'yellow' }, c.name.padEnd(11)),
            h(Text, { dimColor: true }, c.desc),
          ),
        ),
      ),

    // input
    h(
      Box,
      {
        borderStyle: 'round',
        borderColor: running ? 'gray' : 'green',
        paddingX: 1,
        flexShrink: 0,
      },
      h(Text, { color: running ? 'gray' : 'green', bold: true }, '> '),
      h(TextInput, {
        value: input,
        onChange: setInput,
        onSubmit: handleSubmit,
        placeholder: running
          ? 'rodando agent… ESC pra cancelar'
          : 'fala comigo (/ pra comandos, Ctrl+D pra sair)',
        focus: !running,
      }),
    ),

    // status
    h(
      Box,
      { paddingX: 1, flexShrink: 0 },
      h(
        Text,
        { dimColor: true },
        `${model ?? runtime.conf.DEFAULT_MODEL}  ·  ${tokens} tok  ·  ${history.length} msgs`,
        running ? '  ·  rodando' : '  ·  pronto',
        `  ·  ${cols}×${rows}`,
      ),
    ),
  );
};

function contentToString(content: Message['content']): string {
  // No schema atual content eh sempre string. Guard defensivo p/ shapes futuros.
  if (typeof content === 'string') return content;
  return JSON.stringify(content);
}

function renderItem(item: FeedItem, key: number): React.ReactElement {
  if (item.kind === 'user') {
    return h(
      Box,
      { key, flexDirection: 'column' },
      h(Text, null, h(Text, { color: 'green', bold: true }, '› '), h(Text, null, item.content)),
    );
  }
  if (item.kind === 'assistant') {
    return h(
      Box,
      { key, flexDirection: 'column' },
      h(Text, null, h(Text, { color: 'magenta' }, '◆ '), h(Text, null, item.content)),
    );
  }
  if (item.kind === 'thinking') {
    return h(Text, { key, color: 'gray', dimColor: true }, '… pensando');
  }
  if (item.kind === 'tool-call') {
    return h(
      Text,
      { key },
      h(Text, { color: 'yellow' }, '🔧 '),
      h(Text, { color: 'yellow' }, item.tool),
      h(Text, { dimColor: true }, ` ${item.argsPreview}`),
    );
  }
  if (item.kind === 'tool-result') {
    const tag = item.ok ? '✓' : '✗';
    const color = item.ok ? 'green' : 'red';
    return h(
      Text,
      { key },
      h(Text, { color }, `${tag} `),
      h(Text, { color }, item.tool),
      h(Text, { dimColor: true }, ` (${item.durationMs}ms)  ${item.outputPreview}`),
    );
  }
  if (item.kind === 'meta') {
    return h(Text, { key, color: 'gray' }, '· ' + item.content);
  }
  // system fallback
  return h(Text, { key, color: 'gray' }, '· ' + (item as { content: string }).content);
}
