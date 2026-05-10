---
schemaVersion: 1
kind: migration_strategies
description: Catálogo consultivo de estratégias de migração com critérios de aplicabilidade. Usado pelo Strategist.
---

# Migration Strategies

> Catálogo das estratégias canônicas de migração com critérios de aplicabilidade, custo, risco, tempo, exemplo e referências.
> Atualizar este catálogo é tarefa de manutenção independente do agente Strategist.

## Estratégias

### Strangler Fig
- **Descrição**: Sistema novo cresce ao redor do legado, capturando funcionalidades incrementalmente até o legado poder ser desligado.
- **Quando aplica**:
  - Sistema em produção que não pode parar.
  - Necessidade de incrementalidade.
  - Possibilidade de roteamento entre velho e novo (proxy / API gateway).
- **Custo**: médio.
- **Risco**: baixo (rollback parcial é viável).
- **Tempo**: longo (meses a anos em sistemas grandes).
- **Apetite favorecido**: conservative, balanced.
- **Exemplo**: API gateway redireciona endpoints `/v2/orders/*` para o sistema novo enquanto `/orders/*` continua no legado.
- **Referências**: Martin Fowler, "StranglerFigApplication"; Sam Newman, "Monolith to Microservices".

### Big Bang
- **Descrição**: Substituição completa em uma única janela de cutover.
- **Quando aplica**:
  - Sistema pequeno.
  - Janela de manutenção tolerada.
  - Apetite transformacional alto.
  - Baixa quantidade de integrações externas vivas.
- **Custo**: baixo (sem manutenção de duas versões).
- **Risco**: alto (rollback completo é caro; falha derruba o serviço).
- **Tempo**: curto.
- **Apetite favorecido**: transformational (em sistemas pequenos).
- **Exemplo**: ferramenta interna usada por 50 pessoas migrada em uma noite com rollback documentado.
- **Referências**: descrita em vários frameworks de migração; alta correlação com falhas históricas em sistemas grandes.

### Parallel Run
- **Descrição**: Legado e novo rodam em paralelo recebendo o mesmo input; output é comparado para detectar divergências.
- **Quando aplica**:
  - Lógica crítica (financeiro, fiscal, regulatório).
  - Necessidade de prova de equivalência por longo período.
  - Mudança grande de paradigma + apetite transformacional (alto risco operacional).
- **Custo**: alto (duas pilhas operando simultaneamente; comparação de outputs).
- **Risco**: médio (riscos vêm da operação dupla, não do corte).
- **Tempo**: médio.
- **Apetite favorecido**: balanced.
- **Exemplo**: cálculo de imposto rodando no legado e no novo por 60 dias; cutover só após divergência < 0,01%.
- **Referências**: Michael Nygard, "Release It!"; comum em sistemas bancários e fiscais.

### Branch by Abstraction
- **Descrição**: Refatoração interna do legado para introduzir uma abstração que permite trocar a implementação por baixo, depois substituir.
- **Quando aplica**:
  - Migração interna (linguagem ou framework muda, mas o domínio fica).
  - Apetite conservador.
  - Time já dentro do legado, com domínio do código.
- **Custo**: baixo.
- **Risco**: baixo.
- **Tempo**: médio.
- **Apetite favorecido**: conservative.
- **Exemplo**: extrair interface `OrderRepository` no legado, deixar implementação antiga e nova escolhidas por flag, depois remover a antiga.
- **Referências**: Paul Hammant, "Branch By Abstraction".

## Comparativo rápido

| Estratégia | Quando aplica | Custo | Risco | Tempo |
|---|---|---|---|---|
| Strangler Fig | sistema em produção, não pode parar | médio | baixo | longo |
| Big Bang | sistema pequeno, janela controlada, apetite transformacional | baixo | alto | curto |
| Parallel Run | lógica crítica (financeiro / fiscal) | alto | médio | médio |
| Branch by Abstraction | refatoração interna antes da migração | baixo | baixo | médio |

## Influência do paradigma na escolha

- **Apetite `conservative`** → favorece Branch by Abstraction e Strangler Fig.
- **Apetite `balanced`** → favorece Strangler Fig e Parallel Run.
- **Apetite `transformational`** → permite Big Bang em sistemas pequenos, Strangler Fig com bordas profundas em sistemas maiores.
- **Mudança grande de paradigma + apetite transformacional** → sinalizar `risco de divergência operacional alto` e recomendar Parallel Run para validação.

## Função utilitária (uso pelo Strategist)

Pseudo-procedimento que o agente segue ao consultar o catálogo:

1. Receber `migration_brief` (escopo, prazo, restrições) + `derived_appetite` + `gap de paradigma`.
2. Filtrar estratégias por aplicabilidade (drop-out das que claramente não cabem).
3. Pontuar cada estratégia restante por aderência ao apetite e ao gap.
4. Selecionar as 2 a 3 melhores candidatas.
5. Marcar uma como `recomendada` com justificativa explícita.
6. Para cada estratégia restante, listar contras como motivos de não-recomendação.

## Cenários de teste do catálogo

1. brief = sistema bancário em produção, apetite conservative → recomendar Strangler Fig + Branch by Abstraction.
2. brief = ferramenta interna 50 usuários, apetite transformational → recomendar Big Bang.
3. brief = sistema fiscal, apetite balanced, mudança de paradigma alta → recomendar Parallel Run + Strangler Fig.
4. brief = monolito Rails para microsserviços Go, apetite transformational, mudança grande de paradigma → recomendar Strangler Fig com bordas profundas, sinalizar risco operacional, sugerir Parallel Run para domínios críticos.
5. brief = .NET WebForms para Blazor, apetite balanced, sem mudança grande de paradigma → recomendar Strangler Fig.
6. brief = sistema legacy com poucas integrações, janela de manutenção tolerada, apetite balanced → recomendar Big Bang com plano de rollback robusto, alternativa Strangler Fig.
