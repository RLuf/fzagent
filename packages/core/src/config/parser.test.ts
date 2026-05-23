import { describe, expect, it } from 'vitest';

import { parseConfFile } from './parser.js';

describe('parseConfFile', () => {
  it('parses simple key=value pairs', () => {
    const result = parseConfFile('FOO=bar\nBAZ=qux');
    expect(result).toEqual({ FOO: 'bar', BAZ: 'qux' });
  });

  it('ignores comments and blank lines', () => {
    const input = `# header
FOO=1

# another
BAR=2
`;
    expect(parseConfFile(input)).toEqual({ FOO: '1', BAR: '2' });
  });

  it('strips surrounding quotes', () => {
    expect(parseConfFile('A="hello world"\nB=\'literal\'')).toEqual({
      A: 'hello world',
      B: 'literal',
    });
  });

  it('preserves = inside values', () => {
    expect(parseConfFile('URL=postgres://u:p@h/db?x=1')).toEqual({
      URL: 'postgres://u:p@h/db?x=1',
    });
  });

  it('skips lines without = and lines with empty key', () => {
    expect(parseConfFile('not a kv\n=orphan\nGOOD=ok')).toEqual({ GOOD: 'ok' });
  });

  it('handles CRLF line endings', () => {
    expect(parseConfFile('A=1\r\nB=2\r\n')).toEqual({ A: '1', B: '2' });
  });
});
