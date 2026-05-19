import { describe, it, expect, vi } from 'vitest';
import { GoogleProvider } from './google.js';
import { pino } from 'pino';

// Mock do SDK
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockImplementation(() => ({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          candidates: [
            {
              content: { parts: [{ text: 'Resposta mock' }] },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
        },
      }),
      generateContentStream: vi.fn().mockResolvedValue({
        stream: (async function* () {
          yield { candidates: [{ content: { parts: [{ text: 'Resp' }] } }] };
          yield { candidates: [{ content: { parts: [{ text: 'osta' }] } }] };
        })(),
        response: Promise.resolve({
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
        }),
      }),
    })),
  })),
}));

describe('GoogleProvider', () => {
  const logger = pino({ level: 'silent' });

  // Construtor agora exige models nao-vazio — testes passam modelo simbolico.
  const cfgOk = { name: 'google' as const, models: ['gemini-1.5-flash'], apiKey: 'fake-key' };
  const cfgNoModels = { name: 'google' as const, models: [], apiKey: 'fake-key' };

  it('deve inicializar com apiKey', () => {
    const provider = new GoogleProvider({
      config: cfgOk,
      logger: logger as any,
    });
    expect(provider.name).toBe('google');
  });

  it('deve falhar sem apiKey', () => {
    expect(
      () =>
        new GoogleProvider({
          config: { name: 'google', models: ['gemini-1.5-flash'] },
          logger: logger as any,
        }),
    ).toThrow('GoogleProvider requires GOOGLE_API_KEY');
  });

  it('deve falhar sem modelos configurados', () => {
    expect(
      () =>
        new GoogleProvider({
          config: cfgNoModels,
          logger: logger as any,
        }),
    ).toThrow(/Nao ha modelos configurados/);
  });

  it('deve executar complete com sucesso', async () => {
    const provider = new GoogleProvider({
      config: cfgOk,
      logger: logger as any,
    });

    const result = await provider.complete([{ role: 'user', content: 'Oi' }], {
      model: 'gemini-1.5-flash',
    });
    expect(result.content).toBe('Resposta mock');
    expect(result.usage.inputTokens).toBe(10);
  });

  it('deve executar stream com sucesso', async () => {
    const provider = new GoogleProvider({
      config: cfgOk,
      logger: logger as any,
    });

    const chunks = [];
    for await (const chunk of provider.stream([{ role: 'user', content: 'Oi' }], {
      model: 'gemini-1.5-flash',
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toContainEqual({ type: 'text-delta', textDelta: 'Resp' });
    expect(chunks).toContainEqual({ type: 'text-delta', textDelta: 'osta' });
  });
});
