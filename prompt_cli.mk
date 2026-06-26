# Prompt de Aplicação: Claude Code CLI Structure

## Contexto e Objetivo
Com base na análise dos specs reversos do claude-code-cli em `~/claude-code-specs/_reversa_sdd`, este prompt define como aplicar a metodologia de especificação e organização arquitetural na estrutura do fzagent, mantendo sequência contextual apropriada.

## Estrutura de Aplicação

### 1. Organização por Units (Features)
Aplicar padrão de organização por `feature-units` identificado nos specs:

```
fzagent-specs/
├── core-agent/              # Equivalente ao agent-loop
│   ├── requirements.md      # Regras de negócio (RN-CA-XX)
│   ├── design.md           # Arquitetura e implementação 
│   ├── tasks.md            # Tasks específicas (T-CA-XX)
│   └── contracts.md        # Interfaces e APIs
├── tools-runtime/          # Sistema de ferramentas
├── session-management/     # Equivalente ao session-and-memory
├── wiki-brain/            # Sistema de cerebro secundário
├── skill-system/          # Sistema de skills
└── security-permissions/   # Sistema de permissões
```

### 2. Sequência Contextual de Aplicação

#### Fase 1: Interpretação (Detective + Architect)
1. **Code Analysis**: Analisar estrutura atual do fzagent
2. **Architecture Overview**: Mapear componentes principais
3. **Domain Analysis**: Identificar regras de negócio implícitas
4. **C4 Diagrams**: Context → Containers → Components

#### Fase 2: Geração (Writer)
1. **Requirements por Unit**: Aplicar template RN-XX-NN + RF-XX-NN
2. **Design por Unit**: Arquitetura específica por componente
3. **Tasks por Unit**: Breakdown executável (T-XX-NN)
4. **Contracts**: APIs e interfaces entre units

#### Fase 3: Revisão (Reviewer)
1. **Internal Consistency**: Validar coherência interna
2. **Cross-Unit Dependencies**: Mapear dependências entre units
3. **Confidence Report**: Métricas de confiança por unit

## Template de Requirements (Aplicar por Unit)

```markdown
# Feature: {unit-name}

## Visão Geral
[Descrição do que a unit faz, não como faz]

## Responsabilidades
- [Lista de responsabilidades principais]

## Regras de Negócio
| ID | Regra | Confiança |
|---|---|---|
| RN-{XX}-01 | [Regra específica] | 🟢/🟡/🔴 |

## Requisitos Funcionais
| ID | Requisito | Prioridade | Critério de Aceite |
|---|---|---|---|
| RF-{XX}-01 | [Requisito] | Must/Should/Could | [Como testar] |

## Requisitos Não Funcionais
| Tipo | Requisito | Evidência | Confiança |
|---|---|---|---|
| Performance | [NFR] | [Código/configuração] | 🟢/🟡/🔴 |
```

## Identificação de Units Principais do fzagent

### Core Units a Especificar
1. **core-agent** (fzagent principal)
   - Loop de processamento de tarefas
   - Delegação para sub-agentes
   - Gerenciamento de contexto

2. **tools-runtime** 
   - Execução de shell_exec, fs_read, fs_write
   - Permissões e validação
   - Orquestração paralela/serial

3. **wiki-brain**
   - Sistema wiki + Qdrant + embeddings
   - Busca híbrida (FTS5 + vetorial)
   - Ingestão de fontes

4. **skill-system**
   - Auto-discovery via genaisrc/*.genai.mjs
   - Invocação de skills registradas
   - Gerenciamento de contexto de skill

5. **session-management**
   - Persistência de contexto
   - Histórico de interações
   - Recovery de sessão

6. **security-permissions** 
   - Validação de comandos
   - Controle de acesso a ferramentas
   - Políticas de segurança

## Padrões de Implementação

### 1. Prefixos de ID Consistentes
- **RN-{XX}-NN**: Regras de Negócio por unit
- **RF-{XX}-NN**: Requisitos Funcionais por unit  
- **T-{XX}-NN**: Tasks por unit
- **{XX}** = sigla de 2-3 letras da unit (CA, TR, WB, SK, SM, SP)

### 2. Níveis de Confiança
- 🟢 **CONFIRMADO**: Evidência direta no código
- 🟡 **INFERIDO**: Deduzido de padrões/comportamento
- 🔴 **LACUNA**: Requer validação/implementação

### 3. Priorização MoSCoW
- **Must**: Crítico para funcionamento básico
- **Should**: Importante para UX/performance
- **Could**: Nice-to-have
- **Won't**: Fora de escopo atual

## Comando de Execução

Para aplicar esta estrutura no fzagent:

```bash
# 1. Criar estrutura base
mkdir -p fzagent-specs/{core-agent,tools-runtime,wiki-brain,skill-system,session-management,security-permissions}

# 2. Aplicar templates por unit
for unit in core-agent tools-runtime wiki-brain skill-system session-management security-permissions; do
    cp template_requirements.md fzagent-specs/$unit/requirements.md
    cp template_design.md fzagent-specs/$unit/design.md  
    cp template_tasks.md fzagent-specs/$unit/tasks.md
done

# 3. Gerar specs usando fzagent
skill_invoke analyze_codebase --unit=core-agent
skill_invoke generate_requirements --unit=core-agent
```

## Critérios de Sucesso

### Fase 1 (Interpretação) - Completa quando:
- [ ] Todas as 6 units identificadas têm architecture.md
- [ ] C4 Context/Container/Component diagramados
- [ ] Domain analysis com glossário de termos
- [ ] Code-to-spec traceability matrix

### Fase 2 (Geração) - Completa quando:
- [ ] Cada unit tem requirements.md com RN/RF catalogados
- [ ] Tasks.md executáveis para cada unit
- [ ] Design.md com decisões arquiteturais
- [ ] Contracts.md definindo interfaces

### Fase 3 (Revisão) - Completa quando:
- [ ] Confidence report com métricas por unit
- [ ] Cross-unit dependencies mapeadas
- [ ] Inconsistências identificadas e resolvidas
- [ ] Coverage >75% em todas as units principais

## Próximos Passos

1. **Iniciar com core-agent**: Unit mais crítica, equivalente ao agent-loop
2. **Aplicar template de requirements**: Seguir padrão RN-CA-XX/RF-CA-XX
3. **Mapear dependências**: Identificar interfaces entre units
4. **Iterar com reviewer**: Validar consistência cruzada
5. **Expandir para outras units**: tools-runtime, wiki-brain, etc.

