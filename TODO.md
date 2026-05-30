# TODO - fzagent

## Proximos Passos (Amanha)

- [ ] **Configuracao do Gitea CLI (`tea`)**:
  - Solicitar ou guiar o usuario para gerar um Token de Acesso (Access Token) manualmente na Web UI do Gitea (Settings -> Applications).
  - Finalizar a configuracao do `tea` executando o comando:
    `tea login add --name fzrepo --url https://fzrepo.rogerluft.com.br --token <TOKEN_DO_USUARIO>`
- [ ] **Validacao da TUI REPL Interativa**:
  - Rodar o comando interativo `fzagent --cli` no terminal.
  - Testar a rolagem com `PageUp` / `PageDown` quando houver muitas mensagens no historico/feed.
  - Testar a exibicao imediata das descricoes de comandos no popup de autocomplete.
- [ ] **Smoke Tests Finais**:
  - Testar comandos como `fzagent config`, `fzagent tools list` e `fzagent skill list` para verificar a integridade apos o build.
