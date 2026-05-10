import { describe, expect, it } from 'vitest';

import { createLogger } from './index.js';

describe('createLogger', () => {
  it('creates a logger that does not crash on basic calls', () => {
    const log = createLogger({ format: 'silent', level: 'silent' });
    log.info('hello');
    log.warn({ scope: 'test' }, 'world');
    log.error(new Error('boom'), 'on purpose');
    expect(log.level).toBe('silent');
  });

  it('accepts custom destination for testing capture', () => {
    const captured: string[] = [];
    const dest = {
      write(chunk: string) {
        captured.push(chunk);
      },
    };
    const log = createLogger({ format: 'json', destination: dest, level: 'info' });
    log.info({ k: 1 }, 'msg');
    expect(captured.length).toBe(1);
    const parsed = JSON.parse(captured[0]!) as Record<string, unknown>;
    expect(parsed['msg']).toBe('msg');
    expect(parsed['k']).toBe(1);
  });

  it('produces a child logger with bindings', () => {
    const captured: string[] = [];
    const dest = { write: (c: string) => captured.push(c) };
    const log = createLogger({ format: 'json', destination: dest, level: 'info' });
    const child = log.child({ scope: 'agent' });
    child.info('start');
    const parsed = JSON.parse(captured[0]!) as Record<string, unknown>;
    expect(parsed['scope']).toBe('agent');
  });
});
