#!/usr/bin/env python3

import asyncio
import os
import time
import re
from typing import Optional
from pathlib import Path
from .base import LogCollector, LogEvent


class FileCollector(LogCollector):
    """Coletor que monitora arquivos de log em tempo real"""
    
    def __init__(self, config):
        super().__init__(config)
        self.file_path = config['file_path']
        self.file_handle = None
        self.last_position = 0
        self.parser_type = config.get('parser', 'syslog')
        
    async def collect(self) -> Optional[LogEvent]:
        """Coleta proxima linha do arquivo"""
        if not self.file_handle:
            await self._open_file()
            
        if not self.file_handle:
            await asyncio.sleep(1)
            return None
            
        try:
            line = self.file_handle.readline()
            if line:
                self.last_position = self.file_handle.tell()
                return self.parse(line.strip())
            else:
                # Arquivo nao cresceu, aguarda
                await asyncio.sleep(0.1)
                return None
                
        except Exception as e:
            print(f"Erro lendo arquivo {self.file_path}: {e}")
            await self._reopen_file()
            return None
            
    async def _open_file(self):
        """Abre arquivo para leitura"""
        try:
            if os.path.exists(self.file_path):
                self.file_handle = open(self.file_path, 'r', encoding='utf-8')
                # Se temos posicao salva, pula para ela
                if self.last_position > 0:
                    self.file_handle.seek(self.last_position)
                else:
                    # Nova execucao: vai para o final
                    self.file_handle.seek(0, 2)
                    self.last_position = self.file_handle.tell()
        except Exception as e:
            print(f"Erro abrindo arquivo {self.file_path}: {e}")
            
    async def _reopen_file(self):
        """Reabre arquivo (rotacao de logs)"""
        if self.file_handle:
            self.file_handle.close()
            self.file_handle = None
        await asyncio.sleep(1)
        await self._open_file()
        
    def parse(self, raw_log: str) -> LogEvent:
        """Parse do log dependendo do tipo"""
        if self.parser_type == 'syslog':
            return self._parse_syslog(raw_log)
        elif self.parser_type == 'json':
            return self._parse_json(raw_log)
        else:
            return self._parse_generic(raw_log)
            
    def _parse_syslog(self, line: str) -> LogEvent:
        """Parse formato syslog padrao"""
        # Exemplo: Jan 15 10:30:15 hostname service[pid]: message
        syslog_pattern = r'^(\w+\s+\d+\s+\d+:\d+:\d+)\s+(\w+)\s+([^:]+):\s*(.*)$'
        match = re.match(syslog_pattern, line)
        
        if match:
            timestamp_str, hostname, service, message = match.groups()
            # Para demo, usa timestamp atual
            timestamp = time.time()
            
            # Detecta nivel pelo conteudo
            level = self._detect_level(message)
            
            return LogEvent(
                timestamp=timestamp,
                level=level,
                source=f"{hostname}:{service}",
                message=message,
                metadata={
                    'hostname': hostname,
                    'service': service,
                    'parser': 'syslog'
                },
                raw=line
            )
        else:
            return self._parse_generic(line)
            
    def _parse_json(self, line: str) -> LogEvent:
        """Parse formato JSON"""
        try:
            import json
            data = json.loads(line)
            
            return LogEvent(
                timestamp=data.get('timestamp', time.time()),
                level=data.get('level', 'INFO'),
                source=data.get('source', 'unknown'),
                message=data.get('message', line),
                metadata=data.get('metadata', {}),
                raw=line
            )
        except:
            return self._parse_generic(line)
            
    def _parse_generic(self, line: str) -> LogEvent:
        """Parse generico para qualquer formato"""
        level = self._detect_level(line)
        
        return LogEvent(
            timestamp=time.time(),
            level=level,
            source=self.file_path,
            message=line,
            metadata={'parser': 'generic'},
            raw=line
        )
        
    def _detect_level(self, message: str) -> str:
        """Detecta nivel do log pelo conteudo"""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['error', 'err', 'exception', 'fail']):
            return 'ERROR'
        elif any(word in message_lower for word in ['warn', 'warning']):
            return 'WARN'
        elif any(word in message_lower for word in ['debug', 'trace']):
            return 'DEBUG'
        else:
            return 'INFO'


async def main():
    """Teste do coletor de arquivos"""
    config = {
        'file_path': '/var/log/syslog',
        'parser': 'syslog',
        'buffer_size_mb': 10,
        'flush_interval_sec': 5
    }
    
    # Cria arquivo de teste se nao existir
    test_file = 'test.log'
    if not os.path.exists(test_file):
        with open(test_file, 'w') as f:
            f.write("Jan 15 10:30:15 testhost myapp[1234]: Starting application\n")
            
    config['file_path'] = test_file
    
    collector = FileCollector(config)
    
    print(f"Monitorando arquivo: {test_file}")
    print("Adicione linhas ao arquivo para testar...")
    
    try:
        await collector.start()
    except KeyboardInterrupt:
        await collector.stop()
        print("Coletor parado")


if __name__ == "__main__":
    asyncio.run(main())