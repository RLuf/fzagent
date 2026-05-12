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

export function createLogger(config: LoggerConfig = {}): FzagentLogger {
  const envLevel = process.env['LOG_LEVEL'];
  const envFormat = process.env['LOG_FORMAT'] as LogFormat | undefined;
  const envFile = process.env['LOG_FILE'];

  const rawLevel = config.level ?? envLevel ?? 'info';
  const level = normalizeLevel(rawLevel);
  const format = config.format ?? envFormat ?? 'pretty';
  const filePath = config.filePath ?? envFile;

  const opts: LoggerOptions = {
    level: format === 'silent' ? 'silent' : level,
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
            level: opts.level as string,
          }
        : {
            target: 'pino/file',
            options: { destination: 1 },
            level: opts.level as string,
          };
    return pino({
      ...opts,
      transport: {
        targets: [
          consoleTarget,
          {
            target: 'pino/file',
            options: { destination: filePath, mkdir: true },
            level: opts.level as string,
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
