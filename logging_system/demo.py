#!/usr/bin/env python3

import asyncio
import time
import os
import sys
from pathlib import Path

# Adiciona o diretorio pai ao path
sys.path.append(str(Path(__file__).parent.parent))

from logging_system.collectors.file_collector import FileCollector
from logging_system.pipeline.processor import LogProcessor


async def generate_sample_logs(log_file: str, num_logs: int = 100):
    """Gera logs de exemplo para demonstracao"""
    
    sample_logs = [
        "Jan 15 10:30:15 webserver nginx[1234]: 192.168.1.100 - GET /api/users 200",
        "Jan 15 10:30:16 dbserver mysql[5678]: Slow query detected: SELECT * FROM users WHERE id=12345",
        "Jan 15 10:30:17 appserver myapp[9012]: User authentication failed for admin@company.com",
        "Jan 15 10:30:18 cacheserver redis[3456]: Memory usage high: 85% of 4GB",
        "Jan 15 10:30:19 webserver nginx[1234]: 10.0.0.50 - POST /api/payment 500 Internal Server Error",
        "Jan 15 10:30:20 appserver myapp[9012]: Payment processed successfully: order_id=54321 amount=$150.00",
        "Jan 15 10:30:21 monitorserver alertmanager[7890]: High CPU detected on webserver: 95%",
        "Jan 15 10:30:22 dbserver mysql[5678]: Connection timeout from 192.168.1.200",
        "Jan 15 10:30:23 appserver myapp[9012]: User registration completed: user_id=98765",
        "Jan 15 10:30:24 webserver nginx[1234]: 192.168.1.150 - GET /health 200"
    ]
    
    print(f"Gerando {num_logs} logs em {log_file}...")
    
    with open(log_file, 'w') as f:
        for i in range(num_logs):
            log_entry = sample_logs[i % len(sample_logs)]
            # Varia timestamp
            timestamp = time.strftime('%b %d %H:%M:%S', time.localtime(time.time() + i))
            log_with_timestamp = log_entry.replace('Jan 15 10:30:', timestamp[-8:-3] + ':')
            f.write(log_with_timestamp + '\n')
            
            # Adiciona delay para simular logs em tempo real
            if i % 10 == 0:
                await asyncio.sleep(0.1)
                
    print(f"Logs gerados: {log_file}")


async def run_collector_demo():
    """Demonstra o coletor funcionando"""
    
    # Limpa diretorios anteriores
    import shutil
    for dir_name in ['logs', 'processed']:
        if os.path.exists(dir_name):
            shutil.rmtree(dir_name)
        os.makedirs(dir_name, exist_ok=True)
    
    log_file = 'demo_logs.txt'
    
    # Configuracao do coletor
    config = {
        'file_path': log_file,
        'parser': 'syslog',
        'buffer_size_mb': 1,
        'flush_interval_sec': 3
    }
    
    print("=== DEMO: Sistema de Logging ===")
    print()
    
    # Cria arquivo inicial
    with open(log_file, 'w') as f:
        f.write("Jan 15 10:30:00 demo startup[1]: Demo system starting...\n")
    
    # Inicia coletor
    collector = FileCollector(config)
    
    print("1. Iniciando coletor de logs...")
    collector_task = asyncio.create_task(collector.start())
    
    # Aguarda um pouco e gera logs
    await asyncio.sleep(1)
    
    print("2. Gerando logs de exemplo...")
    await generate_sample_logs(log_file, 50)
    
    print("3. Aguardando flush do buffer...")
    await asyncio.sleep(5)
    
    print("4. Parando coletor...")
    await collector.stop()
    
    # Cancela task do coletor
    collector_task.cancel()
    try:
        await collector_task
    except asyncio.CancelledError:
        pass
        
    print("5. Listando batches coletados:")
    batch_files = [f for f in os.listdir('logs') if f.startswith('batch_')]
    for batch_file in batch_files:
        size = os.path.getsize(f'logs/{batch_file}')
        print(f"   - {batch_file}: {size} bytes")
        
    return batch_files


async def run_processor_demo(batch_files):
    """Demonstra o processador funcionando"""
    
    print("\n6. Processando batches...")
    
    processor = LogProcessor()
    
    for batch_file in batch_files:
        batch_path = f'logs/{batch_file}'
        print(f"   Processando: {batch_file}")
        
        processed_events = await processor.process_batch_file(batch_path)
        
        if processed_events:
            output_file = f"processed/processed_{batch_file}"
            await processor.save_processed_batch(processed_events, output_file)
            
            # Mostra alguns exemplos processados
            print(f"   Exemplos processados:")
            for i, event in enumerate(processed_events[:3]):
                categories = event.metadata.get('categories', [])
                priority = event.metadata.get('priority_score', 0)
                service = event.metadata.get('service', 'unknown')
                
                print(f"     [{i+1}] {event.level} | {service} | Priority: {priority}")
                print(f"         Categories: {categories}")
                print(f"         Message: {event.message[:60]}...")
                print()
                
    print(f"Total processado: {processor.processed_count} eventos")


async def show_summary():
    """Mostra resumo do sistema"""
    
    print("\n=== RESUMO DA DEMONSTRACAO ===")
    print()
    
    # Stats dos batches coletados
    batch_files = [f for f in os.listdir('logs') if f.startswith('batch_')]
    total_batch_size = sum(os.path.getsize(f'logs/{f}') for f in batch_files)
    
    print(f"Batches coletados: {len(batch_files)}")
    print(f"Tamanho total comprimido: {total_batch_size} bytes")
    
    # Stats dos processados
    processed_files = [f for f in os.listdir('processed') if f.startswith('processed_')]
    total_processed_size = sum(os.path.getsize(f'processed/{f}') for f in processed_files)
    
    print(f"Batches processados: {len(processed_files)}")
    print(f"Tamanho processado: {total_processed_size} bytes")
    
    if total_batch_size > 0:
        ratio = total_processed_size / total_batch_size
        print(f"Overhead do processamento: {ratio:.2f}x")
        
    print()
    print("Arquivos gerados:")
    print("  logs/batch_*.gz      - Logs coletados comprimidos")
    print("  processed/*.gz       - Logs processados e enriquecidos")
    print("  demo_logs.txt        - Arquivo fonte original")
    
    print()
    print("Proximos passos do sistema completo:")
    print("  - Storage multi-tier (Elasticsearch, ClickHouse, S3)")
    print("  - Query engine unificado")
    print("  - Interface web para busca")
    print("  - Alertas em tempo real")
    print("  - Dashboard de monitoramento")


async def main():
    """Executa demonstracao completa"""
    try:
        # Coleta
        batch_files = await run_collector_demo()
        
        # Processamento
        if batch_files:
            await run_processor_demo(batch_files)
        
        # Resumo
        await show_summary()
        
    except KeyboardInterrupt:
        print("\nDemo interrompida pelo usuario")
    except Exception as e:
        print(f"\nErro na demo: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    print("Iniciando demonstracao do Sistema de Logging...")
    print("Pressione Ctrl+C para interromper")
    print()
    
    asyncio.run(main())