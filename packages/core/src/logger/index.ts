// Logger estruturado pino com fabricas tipadas. Decisoes:
// 1. Sem singleton global — cada subsistema cria seu logger filho.
// 2. base=null remove pid/hostname (ruido em CLI/dev).
// 3. ISO timestamps para legibilidade humana e parse downstream.
// 4. Em modo 'pretty', usa transport pino-pretty (worker thread isolado).
// 5. Em testes, format='silent' ou injecao de destination para evitar I/O.

import pino, { type Logger, type LoggerOptions, type DestinationStream } from 'pino';

export type LogFormat = 'pretty' | 'json' | 'silent';

export interface LoggerConfig {
  level?: string;
  format?: LogFormat;
  bindings?: Record<string, unknown>;
  destination?: DestinationStream;
}

export type FzagentLogger = Logger;

export function createLogger(config: LoggerConfig = {}): FzagentLogger {
  const envLevel = process.env['LOG_LEVEL'];
  const envFormat = process.env['LOG_FORMAT'] as LogFormat | undefined;

  const level = config.level ?? envLevel ?? 'info';
  const format = config.format ?? envFormat ?? 'pretty';

  const opts: LoggerOptions = {
    level: format === 'silent' ? 'silent' : level,
    base: config.bindings ?? null,
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (config.destination) {
    return pino(opts, config.destination);
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
