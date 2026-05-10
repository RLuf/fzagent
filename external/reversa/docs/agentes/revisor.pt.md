# Reviewer

**Comando:** `/reversa-reviewer`
**Fase:** 5 - Revisão

---

## ⚖️ O revisor de specs

O Reviewer pega os contratos do Writer e tenta furar: *"Isso é contradição. Esse ponto não tem prova. Essa regra some se o usuário fizer X."* Ele não quer destruir, quer garantir que o que ficou de pé seja sólido.

---

## O que faz

O Reviewer pega os contratos gerados pelo Writer e tenta furar. Não para destruir, mas para garantir que o que sobrar seja sólido.

Ele procura: contradições internas dentro de uma mesma spec, conflitos entre specs diferentes, afirmações marcadas como 🟢 que na verdade são inferências, comportamentos óbvios que ninguém documentou. Se achar, ele aponta, corrige e reclassifica.

---

## Bônus: revisão cruzada via Codex

Se o plugin do Codex estiver ativo na sessão, o Reviewer oferece uma opção especial: solicitar que o Codex faça uma revisão independente antes da sua própria análise.

A vantagem é ter uma segunda opinião de uma LLM diferente da que gerou as specs. Diferentes modelos cometem erros diferentes, e a revisão cruzada pega coisas que uma revisão única pode deixar passar.

Se o Codex não estiver disponível, o Reviewer segue normalmente sem mencionar o assunto.

---

## O processo de revisão

### Revisão por unit

Para cada pasta de unit em `<output_folder>/`:

- Os 3 arquivos canônicos estão presentes (`requirements.md`, `design.md`, `tasks.md`)? Se faltar algum, é uma lacuna.
- As regras em `requirements.md` fazem sentido em conjunto? Há contradições internas?
- O `design.md` cobre o que `requirements.md` promete? E o `tasks.md` cobre os dois?
- Há comportamentos óbvios não especificados?
- Afirmações marcadas como 🟢: o Reviewer volta ao código original para checar. Reclassifica se necessário.

### Revisão cruzada entre units

- Units que conflitam entre si
- Dependências declaradas que não batem com as reais no código
- Units que deveriam existir mas não foram geradas (comparar com o `surface.json` do Scout)

### Validação das matrizes

- `code-spec-matrix.md`: está completa? Há arquivos sem spec?
- `spec-impact-matrix.md`: reflete as dependências reais?

### Perguntas para você

Para cada lacuna 🔴 que só um humano que conhece o negócio pode resolver, o Reviewer cria uma pergunta formatada. Dependendo do `answer_mode` configurado:

**`chat` (padrão):** as perguntas aparecem direto no chat, uma a uma. Você responde na conversa e ele atualiza as specs em tempo real.

**`file`:** o Reviewer cria `_reversa_sdd/questions.md` com todas as perguntas. Você preenche com calma e avisa quando terminar.

---

## O que ele produz

| Arquivo | Conteúdo |
|---------|----------|
| `_reversa_sdd/questions.md` | Perguntas para validação humana |
| `_reversa_sdd/confidence-report.md` | Contagem de 🟢/🟡/🔴 por spec e percentual geral |
| `_reversa_sdd/gaps.md` | Lacunas que ficaram sem resposta |
| `_reversa_sdd/cross-review-result.md` | Apontamentos do Codex (se revisão cruzada solicitada) |

Specs em cada pasta de unit dentro de `<output_folder>/` são atualizadas in-place com as reclassificações. Os artefatos próprios do Reviewer (`questions.md`, `confidence-report.md`, `gaps.md`, `cross-review-result.md`) ficam na raiz, fora das pastas de unit.
