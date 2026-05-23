// web.fetch — GET HTTP com timeout e limite de bytes.
// web.search — Brave Search API. Stub se BRAVE_SEARCH_API_KEY ausente.

import { z } from 'zod';

import { defineTool } from '../types.js';

const WebFetchInput = z.object({
  url: z.string().url(),
  timeoutMs: z.number().int().positive().default(15_000),
  maxBytes: z.number().int().positive().default(2_000_000),
  // converter HTML para texto plano (markdown-ish basico).
  asText: z.boolean().default(true),
});

export const webFetch = defineTool({
  name: 'web.fetch',
  description: 'Faz GET de uma URL. Retorna o conteudo (texto extraido por padrao).',
  inputSchema: WebFetchInput,
  permissions: 'low',
  async run(ctx, input) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs);
    let signal: AbortSignal = controller.signal;
    if (ctx.signal) signal = AbortSignal.any([controller.signal, ctx.signal]);

    try {
      const resp = await fetch(input.url, { redirect: 'follow', signal });
      if (!resp.ok) {
        return `HTTP ${resp.status} ${resp.statusText}`;
      }
      const reader = resp.body?.getReader();
      if (!reader) return 'empty body';
      let total = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          total += value.byteLength;
          if (total > input.maxBytes) {
            controller.abort();
            return `[truncated: > ${input.maxBytes} bytes]`;
          }
          chunks.push(value);
        }
      }
      const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
      const ct = resp.headers.get('content-type') ?? '';
      const text = buf.toString('utf8');
      if (input.asText && ct.includes('html')) {
        return htmlToText(text);
      }
      return text;
    } finally {
      clearTimeout(timer);
    }
  },
});

const WebSearchInput = z.object({
  query: z.string().min(1),
  count: z.number().int().min(1).max(20).default(5),
});

export const webSearch = defineTool({
  name: 'web.search',
  description: 'Busca na web via Brave Search. Requer BRAVE_SEARCH_API_KEY no env.',
  inputSchema: WebSearchInput,
  permissions: 'low',
  async run(ctx, input) {
    const apiKey = process.env['BRAVE_SEARCH_API_KEY'];
    if (!apiKey) {
      return 'web.search indisponivel: BRAVE_SEARCH_API_KEY nao configurado.';
    }
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(input.query)}&count=${input.count}`;
    const reqInit: RequestInit = {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey,
      },
    };
    if (ctx.signal !== undefined) reqInit.signal = ctx.signal;
    const resp = await fetch(url, reqInit);
    if (!resp.ok) return `Brave HTTP ${resp.status}: ${await resp.text().catch(() => '')}`;
    const data = (await resp.json()) as {
      web?: { results?: Array<{ title: string; url: string; description: string }> };
    };
    const hits = data.web?.results ?? [];
    if (hits.length === 0) return 'No results.';
    return hits
      .map((h, i) => `${i + 1}. ${h.title}\n   ${h.url}\n   ${h.description.replace(/\s+/g, ' ')}`)
      .join('\n\n');
  },
});

// Conversor HTML -> texto bem-basico (sem dep). Remove scripts/styles e tags.
function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
