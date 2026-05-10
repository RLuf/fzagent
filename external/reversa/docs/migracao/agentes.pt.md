# Os 5 agentes do Time de Migração

Os agentes rodam em sequência fixa. Cada um lê o que os anteriores produziram e adiciona um artefato. O `/reversa-migrate` orquestra tudo.

---

## Pipeline

```
Paradigm Advisor → Curator → Strategist → Designer → Inspector
```

Entre cada agente há uma pausa para revisão humana. O modo padrão é interativo.

---

## 1. Paradigm Advisor

**Comando:** `/reversa-paradigm-advisor` (geralmente invocado pelo `/reversa-migrate`)

Detecta o paradigma do sistema legado, infere o paradigma natural da stack alvo declarada no brief e alerta sobre gaps. Força uma decisão consciente do usuário, porque trocar de linguagem não é só mudança sintática, é frequentemente mudança fundamental de modelo mental.

**Produz:** `paradigm_decision.md` (leitura obrigatória de todos os agentes seguintes).

---

## 2. Curator

**Comando:** `/reversa-curator`

Lê as regras de negócio do legado e decide, regra por regra: **MIGRAR**, **DESCARTAR** ou **DECISÃO HUMANA**. Considera o paradigma escolhido: regras que são artefatos do paradigma legado (ex: lock manual em sistema procedural síncrono) podem ser descartadas em alvo event-driven.

**Produz:** `target_business_rules.md` e `discard_log.md`.

---

## 3. Strategist

**Comando:** `/reversa-strategist`

Avalia estratégias possíveis (Strangler Fig, Big Bang, Parallel Run, Branch by Abstraction), apresenta trade-offs explícitos e recomenda uma. A decisão final é humana.

Considera o apetite derivado do `paradigm_decision.md`: apetite conservador favorece Branch by Abstraction; transformacional permite Big Bang em sistemas pequenos.

**Produz:** `migration_strategy.md`, `risk_register.md`, `cutover_plan.md`.

---

## 4. Designer

**Comando:** `/reversa-designer`

Desenha as specs do sistema novo: arquitetura alvo (com diagrama Mermaid), domain model, data model e plano de migração de dados. Honra o paradigma escolhido (event-driven exige eventos explícitos, OO com DI exige interfaces, etc.).

Não decompõe ingenuamente 1-para-1: identifica bounded contexts reais e justifica agrupamentos e separações.

**Produz:** `target_architecture.md`, `target_domain_model.md`, `target_data_model.md`, `data_migration_plan.md`.

---

## 5. Inspector

**Comando:** `/reversa-inspector`

Define como provar que o sistema novo é comportamentalmente equivalente ao legado nos pontos críticos. Adapta os critérios ao paradigma: mudança síncrono → event-driven exige cobertura de ordem de mensagens, idempotência e consistência eventual.

**Produz:** `parity_specs.md` e arquivos `.feature` em Gherkin para cada fluxo crítico.

---

## Quando rodar manualmente

Você quase nunca precisa chamar um agente isolado. O `/reversa-migrate` orquestra todos. Mas se um agente falhou ou você quer rerodar a partir de um ponto específico:

```
/reversa-migrate --resume                    # retoma do último agente que concluiu
/reversa-migrate --regenerate=designer       # apaga Designer + Inspector e refaz
```
