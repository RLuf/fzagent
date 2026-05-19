#!/usr/bin/env python3

import asyncio
import json
import time
import gzip
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, List, Any, Optional
from collections import deque


@dataclass
class LogEvent:
    """Estrutura padronizada para eventos de log"""
    timestamp: float
    level: str
    source: str
    message: str
    metadata: Dict[str, Any]
    raw: str


class CircularBuffer:
    """Buffer circular para logs com compressao automatica"""
    
    def __init__(self, max_size_mb: int = 100):
        self.max_size = max_size_mb * 1024 * 1024
        self.buffer = deque()
        self.current_size = 0
        
    def add(self, event: LogEvent):
        """Adiciona evento ao buffer"""
        serialized = json.dumps(event.__dict__)
        event_size = len(serialized.encode('utf-8'))
        
        self.buffer.append((event, serialized, event_size))
        self.current_size += event_size
        
        # Remove eventos antigos se exceder limite
        while self.current_size > self.max_size and self.buffer:
            old_event, old_serialized, old_size = self.buffer.popleft()
            self.current_size -= old_size
            
    def flush(self) -> bytes:
        """Retorna todos os eventos comprimidos e limpa buffer"""
        if not self.buffer:
            return b''
            
        events_json = []
        for event, serialized, _ in self.buffer:
            events_json.append(serialized)
            
        batch_json = '[' + ','.join(events_json) + ']'
        compressed = gzip.compress(batch_json.encode('utf-8'))
        
        self.buffer.clear()
        self.current_size = 0
        
        return compressed
        
    def size_mb(self) -> float:
        """Retorna tamanho atual do buffer em MB"""
        return self.current_size / (1024 * 1024)


class LogCollector(ABC):
    """Interface base para coletores de log"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.buffer = CircularBuffer(config.get('buffer_size_mb', 100))
        self.running = False
        
    @abstractmethod
    async def collect(self) -> LogEvent:
        """Coleta um evento de log - implementado por subclasses"""
        pass
        
    @abstractmethod
    def parse(self, raw_log: str) -> LogEvent:
        """Parse do log raw para LogEvent - implementado por subclasses"""
        pass
        
    async def start(self):
        """Inicia coleta de logs em loop"""
        self.running = True
        collect_task = asyncio.create_task(self._collect_loop())
        flush_task = asyncio.create_task(self._flush_loop())
        
        await asyncio.gather(collect_task, flush_task)
        
    async def stop(self):
        """Para coleta de logs"""
        self.running = False
        
    async def _collect_loop(self):
        """Loop principal de coleta"""
        while self.running:
            try:
                event = await self.collect()
                if event:
                    self.buffer.add(event)
            except Exception as e:
                print(f"Erro na coleta: {e}")
                await asyncio.sleep(1)
                
    async def _flush_loop(self):
        """Loop de flush do buffer"""
        flush_interval = self.config.get('flush_interval_sec', 30)
        
        while self.running:
            await asyncio.sleep(flush_interval)
            try:
                compressed_batch = self.buffer.flush()
                if compressed_batch:
                    await self._send_batch(compressed_batch)
            except Exception as e:
                print(f"Erro no flush: {e}")
                
    async def _send_batch(self, compressed_batch: bytes):
        """Envia batch para pipeline - implementar transporte"""
        # Por enquanto apenas salva local para desenvolvimento
        timestamp = int(time.time())
        filename = f"logs/batch_{timestamp}.gz"
        
        import os
        os.makedirs("logs", exist_ok=True)
        
        with open(filename, 'wb') as f:
            f.write(compressed_batch)
            
        print(f"Batch salvo: {filename} ({len(compressed_batch)} bytes)")


if __name__ == "__main__":
    # Teste do buffer
    buffer = CircularBuffer(1)  # 1MB
    
    for i in range(1000):
        event = LogEvent(
            timestamp=time.time(),
            level="INFO",
            source="test",
            message=f"Test message {i}",
            metadata={"counter": i},
            raw=f"[INFO] Test message {i}"
        )
        buffer.add(event)
        
    compressed = buffer.flush()
    print(f"1000 events compressed to {len(compressed)} bytes")