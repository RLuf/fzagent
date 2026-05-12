import { describe, expect, it } from 'vitest';

import { buildToolNameMap, denormalizeToolName, sanitizeToolName } from './tool-names.js';

describe('sanitizeToolName', () => {
  it('replaces dots with underscores', () => {
    expect(sanitizeToolName('shell.exec')).toBe('shell_exec');
    expect(sanitizeToolName('fs.read')).toBe('fs_read');
    expect(sanitizeToolName('wiki.ingest')).toBe('wiki_ingest');
  });

  it('is a no-op for names without dots', () => {
    expect(sanitizeToolName('shell_exec')).toBe('shell_exec');
    expect(sanitizeToolName('my-tool')).toBe('my-tool');
    expect(sanitizeToolName('simple')).toBe('simple');
  });

  it('handles multiple dots', () => {
    expect(sanitizeToolName('a.b.c')).toBe('a_b_c');
  });
});

describe('buildToolNameMap', () => {
  it('builds reverse map', () => {
    const map = buildToolNameMap([
      { name: 'shell.exec' },
      { name: 'fs.write' },
      { name: 'no-dots' },
    ]);
    expect(map.get('shell_exec')).toBe('shell.exec');
    expect(map.get('fs_write')).toBe('fs.write');
    expect(map.get('no-dots')).toBe('no-dots');
  });

  it('returns empty map when input undefined', () => {
    expect(buildToolNameMap(undefined).size).toBe(0);
  });
});

describe('denormalizeToolName', () => {
  it('returns original name when wire name in map', () => {
    const map = buildToolNameMap([{ name: 'shell.exec' }]);
    expect(denormalizeToolName('shell_exec', map)).toBe('shell.exec');
  });

  it('falls back to wire name when not in map (defensive)', () => {
    const map = new Map<string, string>();
    expect(denormalizeToolName('unknown_tool', map)).toBe('unknown_tool');
  });
});
