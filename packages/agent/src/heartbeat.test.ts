import { describe, expect, it } from 'vitest';

import { WORAHeartbeat } from './heartbeat.js';

describe('WORAHeartbeat', () => {
  it('does not start when interval <= 0', () => {
    const hb = new WORAHeartbeat({ intervalMs: 0 });
    hb.start();
    hb.stop();
    // smoke test — sem assert
  });

  it('tick reports memory metrics', () => {
    const hb = new WORAHeartbeat({
      intervalMs: 1000,
      heapStats: () => ({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 60 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
      }),
    });
    const r = hb.tick();
    expect(r.heapUsedMb).toBeCloseTo(50, 0);
    expect(r.heapTotalMb).toBeCloseTo(100, 0);
    expect(r.actions).toEqual([]);
  });

  it('tick emits heap-warn when usage > 80%', () => {
    const hb = new WORAHeartbeat({
      intervalMs: 1000,
      heapStats: () => ({
        heapUsed: 90 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 90 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
      }),
    });
    expect(hb.tick().actions).toContain('heap-warn');
  });
});
