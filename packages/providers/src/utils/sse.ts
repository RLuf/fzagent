// Parser SSE (server-sent events) generico para streams da Anthropic e
// outros providers que usam o formato `event: <name>\ndata: <json>\n\n`.

export interface SSEEvent {
  event?: string;
  data?: Record<string, unknown>;
}

export async function* parseSSE(stream: ReadableStream<Uint8Array>): AsyncIterable<SSEEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep = buffer.indexOf('\n\n');
    while (sep !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      sep = buffer.indexOf('\n\n');

      const ev: SSEEvent = {};
      for (const line of block.split('\n')) {
        const idx = line.indexOf(':');
        if (idx === -1) continue;
        const field = line.slice(0, idx).trim();
        const valueStr = line.slice(idx + 1).trim();
        if (field === 'event') ev.event = valueStr;
        else if (field === 'data') {
          try {
            ev.data = JSON.parse(valueStr) as Record<string, unknown>;
          } catch {
            // ignora linhas malformadas
          }
        }
      }
      if (ev.event || ev.data) yield ev;
    }
  }
}
