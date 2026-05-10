# reversa skill (Claude.ai operator)

Skill no formato openclaw/reversa que orquestra o framework
[reversa](https://github.com/sandeco/reversa) — engenharia reversa de
sistemas legados via IA.

## Estrutura

```
reversa/
├── SKILL.md             # frontmatter + descricao + when-to-use
├── instructions.md      # workflow detalhado de 9 passos
├── scripts/
│   └── preflight.sh    # checagens pre-instalacao
├── examples/
│   ├── 01-fresh-install.md
│   ├── 02-resume.md
│   └── 03-update.md
└── README.md           # este arquivo
```

## Como instalar no seu Claude.ai / Claude Code

Copie esta pasta para `.claude/skills/` no projeto onde voce quer usar:

```bash
cp -r skills-claude/reversa ~/seu-projeto/.claude/skills/
```

Ou simbolicamente:

```bash
ln -s "$(pwd)/skills-claude/reversa" ~/seu-projeto/.claude/skills/reversa
```

## Referencias

- [reversa README](https://github.com/sandeco/reversa)
- [Documentacao trilingue](https://sandeco.github.io/reversa/)
- [fzagent dossie](../../wiki/sources/reversa.md)
