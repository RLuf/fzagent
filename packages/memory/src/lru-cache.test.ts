import { describe, expect, it } from 'vitest';

import { LRUCache } from './lru-cache.js';

describe('LRUCache', () => {
  it('rejects invalid maxSize', () => {
    expect(() => new LRUCache(0)).toThrow();
    expect(() => new LRUCache(-1)).toThrow();
    expect(() => new LRUCache(1.5)).toThrow();
  });

  it('stores and retrieves values', () => {
    const c = new LRUCache<string, number>(3);
    c.set('a', 1);
    c.set('b', 2);
    expect(c.get('a')).toBe(1);
    expect(c.get('b')).toBe(2);
    expect(c.size).toBe(2);
  });

  it('evicts least recently used when full', () => {
    const c = new LRUCache<string, number>(3);
    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3);
    c.set('d', 4); // should evict 'a'
    expect(c.has('a')).toBe(false);
    expect(c.has('b')).toBe(true);
    expect(c.has('d')).toBe(true);
    expect(c.size).toBe(3);
  });

  it('get() promotes to most recent', () => {
    const c = new LRUCache<string, number>(3);
    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3);
    c.get('a'); // promote 'a'
    c.set('d', 4); // should evict 'b' now
    expect(c.has('a')).toBe(true);
    expect(c.has('b')).toBe(false);
    expect(c.has('c')).toBe(true);
    expect(c.has('d')).toBe(true);
  });

  it('set() on existing key updates and promotes', () => {
    const c = new LRUCache<string, number>(2);
    c.set('a', 1);
    c.set('b', 2);
    c.set('a', 10); // promote + update
    c.set('c', 3); // should evict 'b'
    expect(c.has('a')).toBe(true);
    expect(c.get('a')).toBe(10);
    expect(c.has('b')).toBe(false);
  });

  it('delete and clear', () => {
    const c = new LRUCache<string, number>(3);
    c.set('a', 1);
    c.set('b', 2);
    c.delete('a');
    expect(c.has('a')).toBe(false);
    expect(c.size).toBe(1);
    c.clear();
    expect(c.size).toBe(0);
  });

  it('get() returns undefined for missing keys', () => {
    const c = new LRUCache<string, number>(3);
    expect(c.get('x')).toBeUndefined();
  });
});
