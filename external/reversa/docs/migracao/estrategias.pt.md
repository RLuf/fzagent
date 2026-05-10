# Estratégias de migração

O Strategist apresenta no mínimo duas estratégias com trade-offs explícitos e recomenda uma. A decisão final é humana. Este documento descreve o catálogo das quatro estratégias suportadas.

---

## Resumo

| Estratégia | Quando aplica | Custo | Risco | Tempo |
|---|---|---|---|---|
| **Strangler Fig** | Sistema em produção, não pode parar | Médio | Baixo | Longo |
| **Big Bang** | Sistema pequeno, janela controlada, apetite transformacional | Baixo | Alto | Curto |
| **Parallel Run** | Lógica crítica (financeiro, fiscal, regulatório) | Alto | Médio | Médio |
| **Branch by Abstraction** | Refatoração interna antes da migração, apetite conservador | Baixo | Baixo | Médio |

---

## Strangler Fig

O sistema novo cresce ao redor do legado, substituindo módulos um por vez. O legado vai sendo "estrangulado" gradualmente, daí o nome.

**Quando faz sentido:**

- Sistema em produção que não pode ter downtime longo.
- Equipe pequena ou tempo limitado.
- Bordas claras entre módulos (caso contrário, dá nó).

**Riscos típicos:**

- Período longo com dois sistemas conviventes.
- Roteador (proxy) na frente vira gargalo se mal projetado.
- Tentação de manter os dois sistemas indefinidamente.

---

## Big Bang

Substituir tudo de uma vez em uma janela controlada. Desliga o velho, liga o novo.

**Quando faz sentido:**

- Sistema pequeno, escopo bem delimitado.
- Janela de manutenção viável (final de semana, feriado).
- Apetite transformacional confirmado no `paradigm_decision.md`.

**Riscos típicos:**

- Se algo der errado, rollback é caro.
- Carga real só aparece em produção.
- Bugs de integração só surgem depois do go-live.

O Strategist sinaliza explicitamente alto risco quando há mudança grande de paradigma combinada com Big Bang, e nesses casos costuma recomendar Parallel Run para validação prévia.

---

## Parallel Run

Os dois sistemas rodam em paralelo lendo as mesmas entradas. As saídas são comparadas. O novo só assume oficialmente quando a divergência fica abaixo de um limite acordado por um período acordado.

**Quando faz sentido:**

- Lógica crítica onde "errado" tem custo alto: financeiro, fiscal, folha de pagamento, cobrança.
- Cálculos complexos com muitos casos especiais.
- Quando a paridade comportamental precisa ser provada, não suposta.

**Riscos típicos:**

- Custo de infra dobrado durante o período.
- Necessidade de instrumentação para comparar saídas.
- Decisão de "aceitar a divergência" precisa ser explícita.

O Inspector define os critérios de paridade aceitável (ex: divergência < 0.01% por 30 dias).

---

## Branch by Abstraction

Antes de migrar de fato, você refatora o legado para introduzir uma camada de abstração no ponto onde a substituição vai acontecer. Depois, troca a implementação por trás dessa camada.

**Quando faz sentido:**

- Apetite conservador.
- Sistema com baixa coesão arquitetural, onde extrair um módulo isolado é difícil.
- Equipe quer ganhar segurança antes do salto.

**Riscos típicos:**

- Trabalho extra de refatoração que pode parecer "perdido" se a migração não acontecer.
- Adicionar abstração no lugar errado piora a manutenibilidade.

---

## Como o Strategist escolhe

O Strategist combina três sinais:

1. **Brief**: prazo, orçamento, restrições, criticidade.
2. **Apetite derivado** do `paradigm_decision.md`: conservative / balanced / transformational.
3. **Tamanho e estado do legado**: número de regras, complexidade dos fluxos, integrações.

Apetite conservador favorece Branch by Abstraction e Strangler Fig. Apetite transformacional permite Big Bang em sistemas pequenos. Mudança grande de paradigma com apetite transformacional faz o Strategist recomendar Parallel Run para validação.
