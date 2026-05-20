# fzagent Documentation

Bem-vindo à documentação do **fzagent**, o cérebro central do sistema OODA RMM.

## 🚀 Como Iniciar

### 1. Requisitos

- **Node.js 22 LTS** (engines.node `>=22.0.0`)
- **Qdrant** (opcional, para memória de longo prazo/RAG)
- **Google API Key** (Gemini) ou OpenAI/Anthropic.

### 2. Configuração da API

Para usar o novo motor nativo do Gemini, você precisa de uma chave de API.

- **Link para gerar a chave:** [Google AI Studio (Gemini API)](https://aistudio.google.com/app/apikey)

Após obter a chave, adicione ao seu arquivo `.env`:

```bash
GOOGLE_API_KEY=sua_chave_aqui
```

### 3. Portas e Serviços

O fzagent opera por padrão na porta **7331**.

- **API REST**: `http://localhost:7331/api`
- **Web Interface (RMM)**: `http://localhost:7331` (disponível quando o servidor está rodando)
- **WebSocket**: `ws://localhost:7331` (usado para logs em tempo real e chat interativo)

### 4. Comandos Principais

O binário `fzagent` pode ser invocado de várias formas:

#### Modo Agente (CLI)

```bash
# Execução única
fzagent "Analise os logs do sistema e me dê um resumo"

# Modo interativo (REPL)
fzagent --cli
```

#### Servidor Central Command (Web/RMM)

```bash
# Inicia o servidor HTTP/WS na porta 7331
fzagent serve
```

#### Gerenciamento de Memória (Wiki/RAG)

```bash
# Indexar arquivos para a "memória secundária"
fzagent wiki ingest ./docs

# Consultar a wiki
fzagent wiki query "Como funciona o deploy?"
```

## 🛠️ Arquitetura

O sistema é dividido em pacotes (Monorepo):

- `packages/core`: Lógica base, definições de tipos e barramento de eventos.
- `packages/providers`: Adaptadores de LLM (Google Gemini, OpenAI, etc).
- `packages/cli`: Interface de linha de comando e Servidor HTTP.
- `packages/web-ui`: Frontend React para o Central Command.

---

_Documentação gerada automaticamente pelo GeGE._
