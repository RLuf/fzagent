# Exemplo 2: retomada apos interrupcao

## Cenario

Sessao anterior parou apos Detective concluir. Voce abriu sessao nova.

## Passos do agente

1. `/reversa` — orquestrador le `.reversa/state.json`:

```json
{
  "phase": "interpretacao",
  "completed": ["reconhecimento", "escavacao"],
  "pending": ["interpretacao", "geracao", "revisao"]
}
```

2. Segue `references/step-02-resume.md` — anuncia o estado e pergunta:
   - Continuar do Detective (proximo agente da fase atual)?
   - Re-rodar uma fase anterior (forca reset)?
   - Adicionar agente independente (Visor/Data Master/Design System)?

3. Usuario escolhe `continuar`.
4. Detective conclui o que faltava → checkpoint.
5. Architect roda → checkpoint.
6. ...

## Importante

NAO ofereça `/clear` + `/reversa` para pausar logo apos retomar — a sessao
ja esta limpa. So oferece pausa apos algum agente concluir trabalho real.
