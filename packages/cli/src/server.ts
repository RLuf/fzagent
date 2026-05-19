import { createServer } from 'node:http';
import express, { type RequestHandler } from 'express';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FzagentRuntime } from './factory.js';
import { buildAgent } from './factory.js';

export interface ServerOptions {
  port: number;
  host: string;
}

export async function startServer(runtime: FzagentRuntime, opts: ServerOptions) {
  const app = express();
  const server = createServer(app);
  const io = new SocketServer(server, {
    cors: { origin: '*' },
  });

  app.use(cors());
  app.use(express.json());

  const { logger, conf, env } = runtime;

  const sharedSecret = env.GOOGLE_API_KEY || 'fzagent-dev-secret';

  const authMiddleware: RequestHandler = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${sharedSecret}`) {
      if (req.hostname !== 'localhost' && req.hostname !== '127.0.0.1') {
        res.status(401).json({ error: 'Nao autorizado' });
        return;
      }
    }
    next();
  };
  app.use('/api', authMiddleware);

  const uiDistPath = join(process.cwd(), 'packages/web-ui/dist');
  app.use(express.static(uiDistPath));

  app.get('/api/config', async (req, res) => {
    try {
      const content = await readFile(join(process.cwd(), 'fzagent.conf'), 'utf-8');
      res.json({ content });
    } catch {
      res.status(500).json({ error: 'Erro ao ler fzagent.conf' });
    }
  });

  app.put('/api/config', async (req, res) => {
    try {
      const { content } = req.body;
      await writeFile(join(process.cwd(), 'fzagent.conf'), content, 'utf-8');
      logger.info('fzagent.conf atualizado via Web UI');
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Erro ao salvar fzagent.conf' });
    }
  });

  const logsHandler: RequestHandler = async (_req, res) => {
    const logFile = runtime.conf.LOG_FILE;
    if (!logFile) {
      res.status(404).json({ error: 'Log file nao configurado' });
      return;
    }
    try {
      const content = await readFile(join(process.cwd(), logFile), 'utf-8');
      const lines = content.split('\n').slice(-100).join('\n');
      res.json({ logs: lines });
    } catch {
      res.status(500).json({ error: 'Erro ao ler logs' });
    }
  };
  app.get('/api/logs', logsHandler);

  runtime.eventBus.on('*', (event, data) => {
    io.emit('system-event', { event, data, ts: Date.now() });
  });

  io.on('connection', (socket) => {
    logger.debug({ socketId: socket.id }, 'Web UI conectada via WebSocket');

    socket.on('chat-message', async (text: string) => {
      logger.info({ text }, 'Mensagem recebida da Web UI');
      const agent = buildAgent(runtime);
      try {
        for await (const event of agent.run({ task: text, channel: 'web' })) {
          socket.emit('agent-event', event);
          if (event.type === 'assistant' && event.message.content) {
            socket.emit('chat-response', {
              text: event.message.content,
              toolCalls: event.message.tool_calls,
              usage: { inputTokens: event.tokensIn, outputTokens: event.tokensOut },
            });
          }
        }
      } catch (err) {
        socket.emit('chat-error', { message: err instanceof Error ? err.message : String(err) });
      }
    });

    socket.on('disconnect', () => {
      logger.debug({ socketId: socket.id }, 'Web UI desconectada');
    });
  });

  server.listen(opts.port, conf.SERVER_HOST || '0.0.0.0', () => {
    logger.info(
      `Servidor Central Command rodando em http://${conf.SERVER_HOST || '0.0.0.0'}:${opts.port}`,
    );
  });
}
