#!/usr/bin/env python3

import asyncio
import json
import gzip
import time
from typing import List, Dict, Any
from dataclasses import asdict
from ..collectors.base import LogEvent


class LogEnricher:
    """Enriquece logs com metadados contextuais"""
    
    def __init__(self):
        self.service_map = self._load_service_map()
        self.geo_cache = {}
        
    def _load_service_map(self) -> Dict[str, Any]:
        """Carrega mapeamento de servicos conhecidos"""
        return {
            'nginx': {'category': 'web', 'criticality': 'high'},
            'mysql': {'category': 'database', 'criticality': 'critical'},
            'redis': {'category': 'cache', 'criticality': 'medium'},
            'myapp': {'category': 'application', 'criticality': 'high'}
        }
        
    def enrich(self, event: LogEvent) -> LogEvent:
        """Enriquece um evento com metadados"""
        # Adiciona informacoes de servico
        service = self._extract_service(event.source)
        if service in self.service_map:
            event.metadata.update({
                'service_info': self.service_map[service],
                'service': service
            })
            
        # Adiciona timestamp formatado
        event.metadata['timestamp_iso'] = time.strftime(
            '%Y-%m-%dT%H:%M:%S', time.localtime(event.timestamp)
        )
        
        # Detecta IPs para geolocalizacao
        import re
        ip_pattern = r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'
        ips = re.findall(ip_pattern, event.message)
        if ips:
            event.metadata['ips'] = ips
            # Em producao: fazer lookup de geolocalizacao
            
        return event
        
    def _extract_service(self, source: str) -> str:
        """Extrai nome do servico da source"""
        if ':' in source:
            return source.split(':')[-1].split('[')[0]
        return source.split('/')[-1].split('.')[0]


class LogClassifier:
    """Classifica logs automaticamente"""
    
    def __init__(self):
        self.patterns = self._load_patterns()
        
    def _load_patterns(self) -> Dict[str, List[str]]:
        """Carrega padroes de classificacao"""
        return {
            'security': [
                'authentication failed', 'login failed', 'unauthorized',
                'access denied', 'brute force', 'intrusion'
            ],
            'performance': [
                'slow query', 'timeout', 'high cpu', 'memory usage',
                'response time', 'latency'
            ],
            'error': [
                'exception', 'error', 'failed', 'crash', 'abort'
            ],
            'business': [
                'payment', 'order', 'user registration', 'checkout',
                'conversion', 'revenue'
            ]
        }
        
    def classify(self, event: LogEvent) -> LogEvent:
        """Classifica evento em categorias"""
        message_lower = event.message.lower()
        categories = []
        
        for category, patterns in self.patterns.items():
            if any(pattern in message_lower for pattern in patterns):
                categories.append(category)
                
        if categories:
            event.metadata['categories'] = categories
            
        # Calcula score de prioridade
        priority_score = self._calculate_priority(event)
        event.metadata['priority_score'] = priority_score
        
        return event
        
    def _calculate_priority(self, event: LogEvent) -> int:
        """Calcula score de prioridade (0-100)"""
        score = 0
        
        # Base no nivel
        level_scores = {'ERROR': 80, 'WARN': 60, 'INFO': 40, 'DEBUG': 20}
        score += level_scores.get(event.level, 40)
        
        # Boost para categorias criticas
        categories = event.metadata.get('categories', [])
        if 'security' in categories:
            score += 20
        if 'error' in categories:
            score += 15
        if 'performance' in categories:
            score += 10
            
        # Criticidade do servico
        service_info = event.metadata.get('service_info', {})
        if service_info.get('criticality') == 'critical':
            score += 15
        elif service_info.get('criticality') == 'high':
            score += 10
            
        return min(score, 100)


class LogProcessor:
    """Processador principal do pipeline"""
    
    def __init__(self):
        self.enricher = LogEnricher()
        self.classifier = LogClassifier()
        self.processed_count = 0
        
    async def process_batch_file(self, batch_file: str) -> List[LogEvent]:
        """Processa arquivo de batch comprimido"""
        try:
            with open(batch_file, 'rb') as f:
                compressed_data = f.read()
                
            # Descomprime
            json_data = gzip.decompress(compressed_data).decode('utf-8')
            events_data = json.loads(json_data)
            
            # Reconstroi objetos LogEvent
            events = []
            for event_data in events_data:
                event = LogEvent(**event_data)
                events.append(event)
                
            # Processa batch
            processed_events = await self.process_batch(events)
            
            print(f"Processado batch: {len(processed_events)} eventos de {batch_file}")
            return processed_events
            
        except Exception as e:
            print(f"Erro processando batch {batch_file}: {e}")
            return []
            
    async def process_batch(self, events: List[LogEvent]) -> List[LogEvent]:
        """Processa batch de eventos"""
        processed = []
        
        for event in events:
            try:
                # Enriquecimento
                enriched = self.enricher.enrich(event)
                
                # Classificacao
                classified = self.classifier.classify(enriched)
                
                processed.append(classified)
                self.processed_count += 1
                
            except Exception as e:
                print(f"Erro processando evento: {e}")
                # Adiciona evento original com erro
                event.metadata['processing_error'] = str(e)
                processed.append(event)
                
        return processed
        
    async def save_processed_batch(self, events: List[LogEvent], output_file: str):
        """Salva batch processado"""
        # Converte para dict para serializar
        events_data = []
        for event in events:
            events_data.append(asdict(event))
            
        # Comprime e salva
        json_data = json.dumps(events_data, indent=2)
        compressed = gzip.compress(json_data.encode('utf-8'))
        
        with open(output_file, 'wb') as f:
            f.write(compressed)
            
        print(f"Batch processado salvo: {output_file} ({len(compressed)} bytes)")


async def main():
    """Teste do processador"""
    processor = LogProcessor()
    
    # Processa todos os batches na pasta logs/
    import os
    import glob
    
    batch_files = glob.glob("logs/batch_*.gz")
    if not batch_files:
        print("Nenhum batch encontrado em logs/")
        print("Execute o file_collector.py primeiro")
        return
        
    os.makedirs("processed", exist_ok=True)
    
    for batch_file in batch_files:
        processed_events = await processor.process_batch_file(batch_file)
        
        if processed_events:
            output_file = f"processed/processed_{os.path.basename(batch_file)}"
            await processor.save_processed_batch(processed_events, output_file)
            
    print(f"Total processado: {processor.processed_count} eventos")


if __name__ == "__main__":
    asyncio.run(main())