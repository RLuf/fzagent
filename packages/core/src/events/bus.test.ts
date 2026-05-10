import { describe, expect, it } from 'vitest';

import { createEventBus } from './index.js';

describe('createEventBus', () => {
  it('delivers typed events to handlers', () => {
    const bus = createEventBus();
    const seen: number[] = [];
    bus.on('heartbeat.tick', (e) => seen.push(e.heapUsedMb));
    bus.emit('heartbeat.tick', { ts: 1, heapUsedMb: 42 });
    bus.emit('heartbeat.tick', { ts: 2, heapUsedMb: 43 });
    expect(seen).toEqual([42, 43]);
  });

  it('supports off / clear', () => {
    const bus = createEventBus();
    let count = 0;
    const handler = () => {
      count += 1;
    };
    bus.on('heartbeat.tick', handler);
    bus.emit('heartbeat.tick', { ts: 1, heapUsedMb: 10 });
    bus.off('heartbeat.tick', handler);
    bus.emit('heartbeat.tick', { ts: 2, heapUsedMb: 20 });
    expect(count).toBe(1);

    bus.on('heartbeat.tick', handler);
    bus.clear();
    bus.emit('heartbeat.tick', { ts: 3, heapUsedMb: 30 });
    expect(count).toBe(1);
  });

  it('delivers to wildcard handler', () => {
    const bus = createEventBus();
    const seen: Array<{ name: string; ts: number }> = [];
    bus.on('*', (name, payload) => {
      if (name === 'heartbeat.tick') {
        seen.push({ name, ts: payload.ts });
      }
    });
    bus.emit('heartbeat.tick', { ts: 7, heapUsedMb: 1 });
    expect(seen).toEqual([{ name: 'heartbeat.tick', ts: 7 }]);
  });

  it('isolates handler errors', () => {
    const bus = createEventBus();
    let secondCalled = false;
    bus.on('heartbeat.tick', () => {
      throw new Error('boom');
    });
    bus.on('heartbeat.tick', () => {
      secondCalled = true;
    });
    bus.emit('heartbeat.tick', { ts: 1, heapUsedMb: 1 });
    expect(secondCalled).toBe(true);
  });

  it('isolates instances', () => {
    const a = createEventBus();
    const b = createEventBus();
    let aSeen = 0;
    a.on('heartbeat.tick', () => (aSeen += 1));
    b.emit('heartbeat.tick', { ts: 1, heapUsedMb: 1 });
    expect(aSeen).toBe(0);
  });
});
