# Exemplo 3: atualizar reversa em projeto que ja usou

## Cenario

Projeto ja tem `.reversa/` instalado v1.0.x. Usuario quer atualizar para
v1.2.x sem perder customizacoes.

## Passos

1. `npx reversa update` — compara SHA-256 dos skills instalados com
   manifest atual. Skills modificadas pelo usuario sao mantidas; outras
   sao atualizadas.
2. Instalador imprime relatorio:
   - `[updated]` skills atualizadas.
   - `[skipped]` skills customizadas (mantidas).
   - `[added]` novos agentes da nova versao.
3. `state.json` -> campo `version` atualizado.
4. Em proxima execucao `/reversa`, o orquestrador detecta nova versao e
   informa discretamente.

## Quando NAO atualizar

- Pipeline em meio de execucao com `phase != null`. Conclua a extracao
  atual primeiro.
- Customizacoes pesadas em multiplos skills — pode ser melhor reinstalar
  do zero.
