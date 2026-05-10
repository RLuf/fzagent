# Mudança de paradigma

A maioria das migrações falha por baixo da superfície. O usuário acha que está mudando de linguagem (PHP → Node, Java → Go), mas na verdade está mudando de paradigma. E paradigma molda muito mais que sintaxe: molda como você pensa em concorrência, consistência, ordem de execução, tratamento de erro.

O Paradigm Advisor existe pra forçar essa conversa antes da arquitetura ser desenhada.

---

## Por que isso importa

Considere uma regra simples do legado:

> "Quando o pedido é confirmado, debita do estoque e envia email. Se qualquer passo falhar, desfaz tudo."

Em PHP procedural síncrono, isso é uma transação de banco com `BEGIN / COMMIT / ROLLBACK`. Funciona porque tudo roda no mesmo processo, no mesmo request HTTP.

Em Node serverless event-driven, **não existe transação atravessando handlers**. Cada passo é uma função, cada função é um evento, e a falha do email já aconteceu *depois* do estoque ter sido debitado. Você precisa de saga, idempotência, retry, dead letter queue. Não é um bug. É o paradigma.

Migrar essa regra "como ela é" para Node quebra. Mas o LLM genérico vai migrar como ela é, porque ela é o que está nas specs do legado.

O Paradigm Advisor pega isso antes.

---

## O que ele faz

1. **Detecta** o paradigma do legado a partir das specs do `_reversa_sdd/`. Procura por marcas concretas: estrutura de classes, padrões de acesso a dados, presença de eventos, fluxo síncrono linear, etc.

2. **Infere** o paradigma natural da stack alvo declarada no brief. Node moderno é async/event-driven. Go é CSP/goroutines. Elixir é actor model. Não há escolha "neutra".

3. **Identifica o gap** com exemplos concretos do próprio sistema legado, não em abstrato.

4. **Apresenta 3 opções** ao usuário:
    - **Adotar paradigma natural da stack** (transformacional). Reescrever a regra para o novo modelo. Mais trabalho, mais aderente.
    - **Forçar paradigma similar ao legado** (conservador). Tentar manter o modelo síncrono em uma stack assíncrona. Menos trabalho, mais frágil.
    - **Híbrido** (equilibrado). Algumas regras seguem o novo paradigma, outras mantêm o antigo. Decisão por categoria.

5. **Registra** a decisão em `paradigm_decision.md`, junto com o **apetite derivado** (`conservative` / `balanced` / `transformational`) que vai influenciar todos os agentes seguintes.

---

## O que não é responsabilidade dele

- Decidir por você. Ele educa, apresenta e força a escolha. A decisão é humana.
- Mudar a stack alvo. Se o brief diz Node, ele trabalha com Node. Trocar a stack é refazer o brief.
- Detectar paradigma sem evidência. Toda afirmação sobre o paradigma do legado vem com evidência rastreável (com tagging 🟢🟡🔴⚠️).

---

## Exemplo: PHP procedural → Node async

| Aspecto | PHP procedural | Node async/event-driven |
|---|---|---|
| Concorrência | Um request por processo, lock natural | Concorrência implícita, lock manual |
| Transação | `BEGIN/COMMIT` no banco atravessa o request | Saga ou outbox, sem transação distribuída |
| Erro | Throw e let-it-die ou rollback explícito | Retry, dead letter, idempotência |
| Ordem | Fluxo linear no controller | Eventos podem chegar fora de ordem |
| Estado | Sessão no servidor | Stateless, estado no token ou em store externo |

Se a migração ignora isso, o sistema novo "funciona" em teste e quebra em produção sob carga real. O Paradigm Advisor pega antes do Designer começar.
