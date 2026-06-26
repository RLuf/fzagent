# Guia de Uso — fzagent

O **fzagent** é um superagente autônomo com cérebro secundário (Wiki + Busca Vetorial) e suporte a múltiplos provedores de LLM com fallback automático.

## 🛠 Configuração Rápida

Para configurar o ambiente automaticamente:

```bash
npx tsx scripts/bootstrap.ts
```

Este script irá:

1. Validar a versão do Node.js (18+).
2. Criar os arquivos `.env` e `fzagent.conf` caso não existam.
3. Compilar todos os pacotes do monorepo (`npm run build`).
4. Verificar a conectividade com o Qdrant e Gemini CLI.

---

## 🚀 Como Executar

O comando principal é `npx fzagent` (ou `npm run build` seguido de `node packages/cli/dist/cli.js`).

### 1. Modo Interativo (TUI)

Para conversar com o agente em um loop contínuo:

```bash
npx fzagent --tui
```

### 2. Tarefa Única (One-shot)

```bash
npx fzagent "Resuma o conteúdo da pasta wiki/concepts"
```

### 3. Loop Agêntico Explícito

Para tarefas complexas que exigem múltiplas iterações de pensamento e ação:

```bash
npx fzagent agent loop "Pesquise sobre a arquitetura Transformer e salve um resumo no wiki"
```

---

## 🧠 Cérebro Secundário (Wiki & RAG)

O fzagent usa um banco de dados SQLite (`db/wiki.sqlite`) e busca vetorial via Qdrant.

### Ingestão de Documentos

```bash
npx fzagent wiki ingest raw/meu-documento.md
```

### Busca no Wiki

```bash
npx fzagent wiki query "O que é self-attention?"
```

### Validar Vetores

```bash
npx fzagent vector validate
```

---

## 🔑 Autenticação e Provedores

O fzagent está configurado com a seguinte ordem de fallback:

1. **Google (Gemini via CLI)**: Padrão. Requer `npx @google/gemini-cli /auth`.
2. **Anthropic (Claude)**: Requer `ANTHROPIC_API_KEY` ou OAuth token no `.env`.
3. **OpenRouter**: Requer `OPENROUTER_API_KEY` (útil para modelos gratuitos).

### Login no Gemini CLI

Se o provedor Google falhar, execute:

```bash
npx @google/gemini-cli /auth
```

---

## 📁 Estrutura do Projeto

- `packages/cli`: Binário do agente.
- `packages/agent`: Núcleo do loop de raciocínio.
- `packages/memory`: Indexação e busca (SQLite + Qdrant).
- `wiki/`: Onde residem seus documentos processados.
- `raw/`: Fontes brutas para ingestão.
- `fzagent.conf`: Configurações operacionais (prioridade de modelos, orçamentos).
- `.env`: Chaves secretas e endpoints.
