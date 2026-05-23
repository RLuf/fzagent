// Skills built-in. Cada uma recebe SkillContext + input validado por Zod.
//
// Estas sao skills "system": vem com o fzagent. Skills do usuario ficam em
// genaisrc/*.genai.mjs e sao auto-descobertas pelo registry.

import { z } from 'zod';

import type { SkillRegistry } from './registry.js';
import { defineSkill } from './types.js';

// cleaner — remove arquivos temporarios e caches.
export const cleanerSkill = defineSkill({
  name: 'cleaner',
  description: 'Remove arquivos temporarios e caches do workspace.',
  triggers: ['limpar caches', 'remove tmp'],
  inputSchema: z.object({
    dryRun: z.boolean().default(true),
    paths: z.array(z.string()).default(['.cache', '.tsup', 'coverage']),
  }),
  permissions: 'high',
  category: 'system',
  async run(_ctx, input) {
    return {
      dryRun: input.dryRun,
      candidates: input.paths,
      message: input.dryRun
        ? `dry-run: removeria ${input.paths.length} caminhos`
        : `removeria ${input.paths.length} caminhos (impl real pendente)`,
    };
  },
});

// reflect — pede ao agente para refletir sobre uma decisao.
export const reflectSkill = defineSkill({
  name: 'reflect',
  description: 'Reflexao explicita: o agente avalia uma decisao recente e propoe melhorias.',
  triggers: ['refletir', 'reflect'],
  inputSchema: z.object({
    topic: z.string().min(1),
    history: z.array(z.string()).default([]),
  }),
  permissions: 'low',
  category: 'agent',
  async run(_ctx, input) {
    return {
      topic: input.topic,
      historyLength: input.history.length,
      reflection: `Sobre "${input.topic}": consulte history.length=${input.history.length} eventos. Recomendo continuar.`,
    };
  },
});

// web-research — agrega web.search + web.fetch + sintese.
export const webResearchSkill = defineSkill({
  name: 'web-research',
  description: 'Pesquisa rapida na web (search + fetch dos top-N + sintese).',
  triggers: ['pesquisar na web', 'web research'],
  inputSchema: z.object({
    query: z.string().min(1),
    maxResults: z.number().int().min(1).max(10).default(3),
  }),
  permissions: 'low',
  category: 'web',
  async run(_ctx, input) {
    return {
      query: input.query,
      maxResults: input.maxResults,
      message:
        'web-research stub: orquestracao real (search + fetch + sintese) precisa de router e BRAVE_SEARCH_API_KEY.',
    };
  },
});

// wiki-ingest — wrapper amigavel para o tool wiki.ingest.
export const wikiIngestSkill = defineSkill({
  name: 'wiki-ingest',
  description: 'Ingere fonte bruta (raw/...) no cerebro secundario.',
  triggers: ['ingest', 'indexar fonte'],
  inputSchema: z.object({
    rawPath: z.string().min(1),
    summarize: z.boolean().default(true),
  }),
  permissions: 'medium',
  category: 'memory',
  async run(_ctx, input) {
    return {
      rawPath: input.rawPath,
      summarize: input.summarize,
      message: 'wiki-ingest stub: chame o tool wiki.ingest do agent para execucao real.',
    };
  },
});

// wiki-query — wrapper para wiki.query.
export const wikiQuerySkill = defineSkill({
  name: 'wiki-query',
  description: 'Busca hibrida no cerebro secundario com sintese opcional.',
  triggers: ['buscar no wiki', 'wiki query'],
  inputSchema: z.object({
    q: z.string().min(1),
    topK: z.number().int().min(1).max(20).default(5),
    synthesize: z.boolean().default(false),
  }),
  permissions: 'low',
  category: 'memory',
  async run(_ctx, input) {
    return {
      q: input.q,
      topK: input.topK,
      message: 'wiki-query stub: chame o tool wiki.query do agent para execucao real.',
    };
  },
});

// code-review — revisa um diff/arquivo procurando smells.
export const codeReviewSkill = defineSkill({
  name: 'code-review',
  description:
    'Revisa codigo procurando bugs, smells, complexidade e oportunidades de simplificacao.',
  triggers: ['revisar codigo', 'code review'],
  inputSchema: z.object({
    path: z.string().min(1),
    style: z.enum(['quick', 'detailed']).default('quick'),
  }),
  permissions: 'low',
  category: 'code',
  async run(_ctx, input) {
    return {
      path: input.path,
      style: input.style,
      message: `code-review stub: leia ${input.path} e analise (impl LLM-driven).`,
    };
  },
});

export function registerBuiltinSkills(reg: SkillRegistry): SkillRegistry {
  reg.registerProgrammatic(cleanerSkill);
  reg.registerProgrammatic(reflectSkill);
  reg.registerProgrammatic(webResearchSkill);
  reg.registerProgrammatic(wikiIngestSkill);
  reg.registerProgrammatic(wikiQuerySkill);
  reg.registerProgrammatic(codeReviewSkill);
  return reg;
}
