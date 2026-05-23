# Providers — Adapters LLM e Router

`packages/providers/` orquestra acesso a multiplos LLMs com fallback
ordenado, retry exponencial, circuit breaker e capability negotiation.

## Adapters disponiveis (5)

Em `packages/providers/src/adapters/`:

| Adapter              | `name`       | `supportsTools` | Auth                                                                                               | Observacao                                    |
| -------------------- | ------------ | --------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `AnthropicProvider`  | `anthropic`  | `true`          | OAuth (CLAUDE_CODE_OAUTH_TOKEN > ANTHROPIC_OAUTH_TOKEN > ANTHROPIC_AUTH_TOKEN > ANTHROPIC_API_KEY) | Bearer ou x-api-key (auto-detect)             |
| `OpenAIProvider`     | `openai`     | `true`          | OPENAI_API_KEY                                                                                     | Function calling estandar                     |
| `OpenRouterProvider` | `openrouter` | `true`          | OPENROUTER_API_KEY                                                                                 | Free models tipo nvidia/nemotron, qwen3-coder |
| `GoogleProvider`     | `google`     | `false`         | gemini CLI no PATH                                                                                 | Subprocess; tool calling NAO suportado        |
| `OllamaProvider`     | `ollama`     | `true`          | URL (default `http://192.168.0.101:11434` — papaimach)                                             | Local                                         |

### Por que GoogleProvider declara `supportsTools=false`

`packages/providers/src/adapters/google.ts:8-12` documenta:

> Tool calls nao sao suportadas via CLI (stdout eh texto puro).
> Token usage nao eh reportado pelo CLI.

O canal eh subprocess do `gemini` CLI, que nao expoe function calling
estruturado. Pra evitar degradacao silenciosa, o router pula este provider
quando a request fornece `tools`.

## ProviderRouter

`packages/providers/src/router/index.ts`. Fluxo de `complete()`:

```
options.tools.length > 0 ?
  └─► sim: filtra providers com supportsTools=false (skip silencioso)

para cada provider em fallbackOrder:
  circuit breaker aberto?
    └─► sim: skip
  retry com backoff exponencial (maxAttempts default 3, base 500ms, max 8s)
    sucesso  -> recordSuccess, emit 'provider.success', return
    falha    -> recordFailure, emit 'provider.failure', proximo provider

todos os providers falharam:
  todos skipped por circuit breaker -> CircuitBreakerError
  caso geral                        -> ProviderError(last error)
```

Fallback order default: `anthropic, openai, google, openrouter, ollama`.
Override no fzagent.conf: `PROVIDER_FALLBACK_ORDER=...`.

### Capability negotiation — por que existe

Antes desta camada, se Anthropic falhasse (auth, rede, etc.), o router caia
no Gemini CLI. Gemini CLI nao suporta tools -> modelo recebia tools no
system prompt mas nao conseguia invocar -> respondia em prosa pedindo ao
usuario que criasse arquivos manualmente. `tokens=0` no end event era o
sinal forense (Gemini CLI nao reporta usage).

A solucao **nao eh** mudar o adapter Gemini (ele eh honesto). Eh elevar
`supportsTools` para `LLMProvider` interface, e o router negociar
capacidade antes de rotear.

Outras capabilities sao candidatas futuras: `supportsStreaming`,
`supportsVision`, `supportsPromptCaching`. Padrao igual.

### Retry policy

`packages/providers/src/router/retry.ts` — `retry()` + `defaultIsRetryable`.

Re-tenta automaticamente:

- HTTP 408 (timeout)
- HTTP 429 (rate limit)
- HTTP 500-599 (server errors)
- Erros de rede (ECONNRESET, ETIMEDOUT, ECONNREFUSED)

Backoff exponencial com jitter: `delay = base * 2^attempt + random(0..base)`,
limitado em `maxDelayMs`.

### Circuit breaker

`packages/providers/src/router/circuit-breaker.ts`. Estados:

- **closed** — operando normal
- **open** — bloqueando chamadas
- **half-open** — janela de teste apos cooldown

Defaults: 3 falhas consecutivas abre o breaker; cooldown 30s antes de
half-open. Configurable via conf:

- `AGENTIC_CIRCUIT_BREAKER_MAX_FAILURES`
- `AGENTIC_CIRCUIT_BREAKER_COOLDOWN_MS`

### Eventos emitidos

Via `eventBus` (opcional, criado pela factory):

- `provider.success` — `{ provider, latencyMs }`
- `provider.failure` — `{ provider, error, ts }`

## Estendendo

Para adicionar um novo provider:

1. Crie adapter em `packages/providers/src/adapters/<name>.ts`
2. Herde `BaseLLMProvider`
3. Declare `readonly name`, `readonly models`, `readonly supportsTools`
4. Implemente `complete()` e `stream()`
5. Export em `packages/providers/src/index.ts`
6. Instancie no `factory.ts` via `tryAdd(() => new XxxProvider({...}))`
7. Adicione ao `PROVIDER_FALLBACK_ORDER` no conf

A factory eh tolerante a falha de construcao (`tryAdd`) — provider sem
credencial valida eh simplesmente omitido do router.
