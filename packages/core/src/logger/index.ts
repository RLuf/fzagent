// Logger estruturado pino com fabricas tipadas. Decisoes:
// 1. Sem singleton global — cada subsistema cria seu logger filho.
// 2. base=null remove pid/hostname (ruido em CLI/dev).
// 3. ISO timestamps para legibilidade humana e parse downstream.
// 4. Em modo 'pretty', usa transport pino-pretty (worker thread isolado).
// 5. Em testes, format='silent' ou injecao de destination para evitar I/O.
// 6. filePath opcional: escreve JSON estruturado em arquivo paralelamente ao
//    console (dual sink via pino transport targets). Pasta criada se ausente.
// 7. Alias 'verbose' -> 'debug' (conveniencia operacional).

import pino, { type Logger, type LoggerOptions, type DestinationStream } from 'pino';

export type LogFormat = 'pretty' | 'json' | 'silent';

export interface LoggerConfig {
  level?: string;
  // Override de level por sink (dual sink). Quando ausente, herda `level`.
  // Permite console silent + arquivo debug (e vice-versa).
  consoleLevel?: string;
  fileLevel?: string;
  format?: LogFormat;
  bindings?: Record<string, unknown>;
  destination?: DestinationStream;
  // Caminho de arquivo onde gravar log JSON estruturado em paralelo ao
  // console. Quando definido, console + arquivo recebem todos os eventos.
  filePath?: string;
}

export type FzagentLogger = Logger;

function normalizeLevel(level: string): string {
  if (level === 'verbose') return 'debug';
  return level;
}

// Ordem do pino (do mais verboso para o mais restritivo). Usado para
// escolher o root level no dual sink quando console e file tem niveis
// distintos — o root precisa ser o mais permissivo, senao o sink mais
// verboso fica capado.
const PINO_ORDER: Record<string, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  silent: 70,
};

function mostPermissive(a: string, b: string): string {
  const oa = PINO_ORDER[a] ?? PINO_ORDER['info'] ?? 30;
  const ob = PINO_ORDER[b] ?? PINO_ORDER['info'] ?? 30;
  return oa <= ob ? a : b;
}

export function createLogger(config: LoggerConfig = {}): FzagentLogger {
  const envLevel = process.env['LOG_LEVEL'];
  const envFormat = process.env['LOG_FORMAT'] as LogFormat | undefined;
  const envFile = process.env['LOG_FILE'];

  const envConsole = process.env['LOG_LEVEL_CONSOLE'];
  const envFile2 = process.env['LOG_LEVEL_FILE'];
  const rawLevel = config.level ?? envLevel ?? 'info';
  // Pino exige um level "root" — usamos o mais permissivo entre console e
  // file para deixar o filtro fino acontecer nos targets.
  const consoleLevel = normalizeLevel(config.consoleLevel ?? envConsole ?? rawLevel);
  const fileLevel = normalizeLevel(config.fileLevel ?? envFile2 ?? rawLevel);
  const format = config.format ?? envFormat ?? 'pretty';
  const filePath = config.filePath ?? envFile;

  // Pino aceita 'silent' como sentinela para nao emitir nada — manter como esta.
  const rootLevel = format === 'silent' ? 'silent' : mostPermissive(consoleLevel, fileLevel);
  const opts: LoggerOptions = {
    level: rootLevel,
    base: config.bindings ?? null,
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (config.destination) {
    return pino(opts, config.destination);
  }

  // Dual sink: console (pretty/json) + arquivo (JSON). Usado quando o operador
  // setou LOG_FILE. mkdir:true cria o dir se nao existir.
  if (filePath && format !== 'silent') {
    const consoleTarget =
      format === 'pretty'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              ignore: 'pid,hostname',
              translateTime: 'HH:MM:ss.l',
              destination: 1,
            },
            level: consoleLevel,
          }
        : {
            target: 'pino/file',
            options: { destination: 1 },
            level: consoleLevel,
          };
    return pino({
      ...opts,
      transport: {
        targets: [
          consoleTarget,
          {
            target: 'pino/file',
            options: { destination: filePath, mkdir: true },
            level: fileLevel,
          },
        ],
      },
    });
  }

  if (format === 'pretty') {
    return pino({
      ...opts,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'HH:MM:ss.l',
        },
      },
    });
  }

  return pino(opts);
}
