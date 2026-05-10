import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WikiIndexer } from './indexer.js';

let dir: string;
let dbPath: string;
let idx: WikiIndexer;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'fz-indexer-'));
  dbPath = join(dir, 'wiki.sqlite');
  idx = new WikiIndexer({ dbPath });
});

afterEach(() => {
  idx.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('WikiIndexer.upsertPage', () => {
  it('inserts a new page', () => {
    const p = idx.upsertPage({
      path: 'wiki/sources/foo.md',
      title: 'Foo',
      type: 'source',
      slug: 'foo',
      body: 'hello world',
    });
    expect(p.id).toBeTruthy();
    expect(idx.getPage(p.id)?.title).toBe('Foo');
  });

  it('updates on conflict by path', () => {
    const a = idx.upsertPage({
      path: 'wiki/sources/foo.md',
      title: 'Foo v1',
      type: 'source',
      slug: 'foo',
      body: 'v1',
    });
    const b = idx.upsertPage({
      path: 'wiki/sources/foo.md',
      title: 'Foo v2',
      type: 'source',
      slug: 'foo',
      body: 'v2',
    });
    expect(a.id).toBe(b.id);
    expect(idx.getPage(b.id)?.title).toBe('Foo v2');
    expect(idx.getPage(b.id)?.body).toBe('v2');
  });

  it('stores frontmatter as JSON', () => {
    const p = idx.upsertPage({
      path: 'wiki/concepts/x.md',
      title: 'X',
      type: 'concept',
      slug: 'x',
      frontmatter: { author: 'a', score: 0.9 },
    });
    expect(idx.getPage(p.id)?.frontmatter).toEqual({ author: 'a', score: 0.9 });
  });
});

describe('WikiIndexer.tags', () => {
  it('persists tags via replaceTags', () => {
    const p = idx.upsertPage({
      path: 'wiki/sources/foo.md',
      title: 'Foo',
      type: 'source',
      slug: 'foo',
      tags: ['Alpha', 'beta', 'ALPHA'],
    });
    const tags = idx.getTags(p.id);
    expect(tags.sort()).toEqual(['alpha', 'beta']);
  });

  it('replaces existing tags on next upsert', () => {
    const p = idx.upsertPage({
      path: 'wiki/sources/foo.md',
      title: 'Foo',
      type: 'source',
      slug: 'foo',
      tags: ['a', 'b'],
    });
    idx.upsertPage({
      path: 'wiki/sources/foo.md',
      title: 'Foo',
      type: 'source',
      slug: 'foo',
      tags: ['c'],
    });
    expect(idx.getTags(p.id)).toEqual(['c']);
  });
});

describe('WikiIndexer.links + lint', () => {
  it('resolves anchor to dst when slug exists', () => {
    const a = idx.upsertPage({
      path: 'wiki/concepts/a.md',
      title: 'A',
      type: 'concept',
      slug: 'a',
    });
    const b = idx.upsertPage({
      path: 'wiki/concepts/b.md',
      title: 'B',
      type: 'concept',
      slug: 'b',
    });
    idx.addLink(a.id, 'b');
    const report = idx.lint();
    expect(report.brokenLinks).toHaveLength(0);
    // 'a' nao tem links de entrada -> orfa; 'b' nao e orfa
    expect(report.orphans.find((o) => o.id === b.id)).toBeUndefined();
    expect(report.orphans.find((o) => o.id === a.id)).toBeDefined();
  });

  it('detects broken links', () => {
    const a = idx.upsertPage({
      path: 'wiki/concepts/a.md',
      title: 'A',
      type: 'concept',
      slug: 'a',
    });
    idx.addLink(a.id, 'does-not-exist');
    const report = idx.lint();
    expect(report.brokenLinks).toHaveLength(1);
    expect(report.brokenLinks[0]?.anchorText).toBe('does-not-exist');
  });
});

describe('WikiIndexer.search (FTS5)', () => {
  it('finds pages by content', () => {
    idx.upsertPage({
      path: 'wiki/sources/a.md',
      title: 'OpenClaw architecture',
      type: 'source',
      slug: 'a',
      body: 'EventBus pattern with publish/subscribe',
    });
    idx.upsertPage({
      path: 'wiki/sources/b.md',
      title: 'Provider router',
      type: 'source',
      slug: 'b',
      body: 'fallback chain with circuit breaker',
    });
    const r = idx.search('EventBus');
    expect(r.length).toBeGreaterThanOrEqual(1);
    expect(r[0]?.title).toBe('OpenClaw architecture');
    expect(r[0]?.snippet).toContain('EventBus');
  });

  it('returns empty for blank query', () => {
    expect(idx.search('')).toEqual([]);
  });
});

describe('WikiIndexer.sources + log + stats', () => {
  it('records sources and unattached are flagged', () => {
    const sha = WikiIndexer.sha256('contents');
    idx.recordSource('raw/foo.md', sha, null);
    expect(idx.lint().unattachedSources).toHaveLength(1);
  });

  it('log inserts events', () => {
    idx.log('ingest', { path: 'raw/x' });
    idx.log('query', { q: 'foo' });
    expect(idx.stats().logEntries).toBe(2);
  });

  it('stats reflects state', () => {
    idx.upsertPage({
      path: 'wiki/concepts/a.md',
      title: 'A',
      type: 'concept',
      slug: 'a',
      tags: ['x'],
    });
    const s = idx.stats();
    expect(s.pages).toBe(1);
    expect(s.tags).toBe(1);
  });
});

describe('WikiIndexer.slugify', () => {
  it('normalizes accents and special chars', () => {
    expect(WikiIndexer.slugify('Configuração: Olá!')).toBe('configuracao-ola');
    expect(WikiIndexer.slugify('hello world')).toBe('hello-world');
    expect(WikiIndexer.slugify('  foo--bar  ')).toBe('foo-bar');
  });
});
