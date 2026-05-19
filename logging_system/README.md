# Sistema de Logging e Memoria Permanente Gigantesca

Sistema distribuido para captura, processamento e armazenamento de logs em escala petabyte.

## Arquitetura

```
[Collectors] -> [Pipeline] -> [Hot] -> [Warm] -> [Cold] -> [Archive]
```

## Estrutura do Projeto

```
logging_system/
├── collectors/          # Log collection agents
├── pipeline/           # Processing and enrichment
├── storage/            # Multi-tier storage engines
├── query/              # Unified query interface
├── ui/                 # Web interface
├── ops/                # Deployment and monitoring
└── tests/              # Test suites
```

## Quick Start

1. Install dependencies:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

2. Start development environment:

```bash
docker-compose up -d
python3 -m logging_system.pipeline.main
```

3. Send test logs:

```bash
python3 -m logging_system.collectors.file_collector --config configs/test.yaml
```

## Configuration

See `configs/` directory for example configurations.

## Documentation

- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)
- [Deployment Guide](docs/deployment.md)
