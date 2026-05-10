# Writer

**Comando:** `/reversa-writer`
**Fase:** 4 - Geração

---

## 📝 O tabelião

O tabelião transforma o que foi descoberto em contratos formais, precisos e rastreáveis. Cada cláusula tem grau de certeza declarado. O documento vale como contrato: um agente de IA pode reimplementar o sistema a partir dele.

---

## O que faz

O Writer transforma o que foi descoberto nas três fases anteriores em contratos formais: precisos, rastreáveis e suficientemente detalhados para que um agente de IA, sem acesso ao código original, possa reimplementar a funcionalidade com fidelidade.

Specs não são documentação para humanos lerem numa tarde tranquila. São contratos operacionais.

---

## O fluxo de trabalho

O Writer nunca gera tudo de uma vez. Projetos grandes têm muitos componentes, e gerar tudo em uma resposta consome contexto excessivo e impede revisão incremental. O fluxo é assim:

### 1. Montar e apresentar o plano

Antes de gerar qualquer arquivo, o Writer lê todos os artefatos das fases anteriores e a decisão de organização salva em `[specs]` do `config.toml`. Em seguida, monta a lista completa do que vai gerar:

```
📋 Plano de geração: 3 units, 11 arquivos no total

Units:
  [ ] 1. auth/requirements.md
  [ ] 2. auth/design.md
  [ ] 3. auth/tasks.md
  [ ] 4. orders/requirements.md
  [ ] 5. orders/design.md
  [ ] 6. orders/tasks.md
  [ ] 7. payments/requirements.md
  [ ] 8. payments/design.md
  [ ] 9. payments/tasks.md

Globais:
  [ ] 10. openapi/api-v1.yaml
  [ ] 11. traceability/code-spec-matrix.md

Digite CONTINUAR para iniciar.
```

Você aprova (ou ajusta) o plano antes de qualquer geração.

### 2. Gerar um arquivo por vez

Para cada item: gera o arquivo, salva, avisa o que foi concluído e o que vem a seguir, e **para**. Você confirma "CONTINUAR" antes do próximo. Isso permite revisar cada spec antes de avançar.

### 3. Globais por último

Depois que todos os arquivos das units estão gerados, vêm os globais na ordem: `openapi/`, `user-stories/`, e por fim a matriz de rastreabilidade que liga cada arquivo legado a uma unit com nível de cobertura.

---

## Layout de saída: feature folders

Cada unit vira uma pasta dentro de `<output_folder>/`. O que é uma "unit" depende da `granularity` escolhida no passo de organização (logo após a pergunta de nível de documentação):

| `granularity` | Uma unit é... |
|---------------|---------------|
| `module` | Um módulo do legado |
| `endpoint` | Um endpoint ou contrato HTTP/RPC |
| `use-case` | Um caso de uso comportamental |
| `hybrid` | Módulo no topo, casos de uso aninhados |
| `feature` | Uma feature listada pelo Scout |
| `custom` | Pasta definida pelo usuário |

Toda pasta de unit tem os 3 arquivos canônicos SDD: `requirements.md`, `design.md`, `tasks.md`. Arquivos opcionais (`contracts.md`, `flows.md`, `edge-cases.md`, `decisions.md`, `legacy-mapping.md`, `questions.md`) são adicionados conforme o nível de documentação e o contexto.

---

## Arquivos canônicos por unit

| Arquivo | Conteúdo |
|---------|----------|
| `<unit>/requirements.md` | O que a unit faz: regras de negócio, RNFs, critérios de aceitação, MoSCoW |
| `<unit>/design.md` | Como a unit é construída: interface, fluxos, dependências, decisões de design |
| `<unit>/tasks.md` | Tarefas de implementação rastreáveis ao código legado, com critério de pronto e confiança |

Cada afirmação é marcada com 🟢, 🟡 ou 🔴. Sem exceções.

---

## Globais transversais

Estes ficam na raiz de `<output_folder>/`, fora das pastas de unit:

| Arquivo | Conteúdo |
|---------|----------|
| `openapi/[api].yaml` | Spec de API (se aplicável, apenas completo/detalhado) |
| `user-stories/[fluxo].md` | User stories (apenas completo/detalhado) |
| `traceability/code-spec-matrix.md` | Matriz arquivo legado → unit |
