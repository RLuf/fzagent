// Workflow lint(): combina o lint do indexer (orfas, links quebrados,
// fontes nao-anexadas) com checks adicionais.

import type { FzagentLogger } from '@fzagent/core';

import type { WikiIndexer } from '../indexer/indexer.js';

export interface LintDeps {
  indexer: WikiIndexer;
  logger?: FzagentLogger;
}

export interface LintIssue {
  kind: 'orphan' | 'broken-link' | 'unattached-source' | 'concept-without-page' | 'duplicate-slug';
  pageId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface LintResult {
  totalIssues: number;
  issues: LintIssue[];
  byKind: Record<string, number>;
}

export function lint(deps: LintDeps): LintResult {
  const log = deps.logger?.child({ scope: 'lint' });
  const issues: LintIssue[] = [];
  const r = deps.indexer.lint();

  for (const o of r.orphans) {
    issues.push({
      kind: 'orphan',
      pageId: o.id,
      description: `Pagina sem links de entrada: ${o.title}`,
      metadata: { path: o.path },
    });
  }
  for (const b of r.brokenLinks) {
    issues.push({
      kind: 'broken-link',
      pageId: b.srcId,
      description: `Link quebrado [[${b.anchorText}]] em "${b.srcTitle}"`,
      metadata: { anchorText: b.anchorText },
    });
  }
  for (const s of r.unattachedSources) {
    issues.push({
      kind: 'unattached-source',
      description: `Fonte ${s.rawPath} ingerida mas sem pagina associada`,
      metadata: { sha256: s.sha256 },
    });
  }

  const byKind: Record<string, number> = {};
  for (const i of issues) byKind[i.kind] = (byKind[i.kind] ?? 0) + 1;

  log?.info({ totalIssues: issues.length, byKind }, 'lint complete');
  return { totalIssues: issues.length, issues, byKind };
}
