// LRU cache simples (Map-based) para embeddings.
//
// Implementacao usa a propriedade do Map de preservar a ordem de insercao.
// Hit move o item para o final (mais recente). Quando ultrapassa maxSize,
// remove o primeiro item (menos recente).

export class LRUCache<K, V> {
  private readonly map = new Map<K, V>();

  constructor(public readonly maxSize: number) {
    if (!Number.isInteger(maxSize) || maxSize <= 0) {
      throw new Error(`LRUCache: maxSize must be a positive integer (got ${maxSize})`);
    }
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key) as V;
    // re-insert para mover ao fim (most recently used)
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // remove o menos recente (primeira entry do Map)
      const firstKey = this.map.keys().next().value as K | undefined;
      if (firstKey !== undefined) this.map.delete(firstKey);
    }
    this.map.set(key, value);
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}
