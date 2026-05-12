[**fzagent API Reference**](../../README.md)

---

[fzagent API Reference](../../README.md) / agent/src

# agent/src

## Classes

- [Agent](classes/Agent.md)
- [AgentCircuitBreaker](classes/AgentCircuitBreaker.md)
- [SessionStore](classes/SessionStore.md)
- [ToolRegistry](classes/ToolRegistry.md)
- [WORAHeartbeat](classes/WORAHeartbeat.md)

## Interfaces

- [AgentCircuitBreakerConfig](interfaces/AgentCircuitBreakerConfig.md)
- [AgentCircuitBreakerSnapshot](interfaces/AgentCircuitBreakerSnapshot.md)
- [AgentOptions](interfaces/AgentOptions.md)
- [AgentRunConfig](interfaces/AgentRunConfig.md)
- [AssembleInput](interfaces/AssembleInput.md)
- [CreateSessionInput](interfaces/CreateSessionInput.md)
- [ExecuteResult](interfaces/ExecuteResult.md)
- [HeartbeatOptions](interfaces/HeartbeatOptions.md)
- [HeartbeatTickResult](interfaces/HeartbeatTickResult.md)
- [IdentityLayer](interfaces/IdentityLayer.md)
- [PersonalityLayer](interfaces/PersonalityLayer.md)
- [RAGSource](interfaces/RAGSource.md)
- [RunInput](interfaces/RunInput.md)
- [SessionRow](interfaces/SessionRow.md)
- [SessionStoreOptions](interfaces/SessionStoreOptions.md)
- [Tool](interfaces/Tool.md)
- [ToolContext](interfaces/ToolContext.md)
- [TurnRow](interfaces/TurnRow.md)

## Type Aliases

- [AgentEvent](type-aliases/AgentEvent.md)
- [CircuitState](type-aliases/CircuitState.md)
- [SessionStatus](type-aliases/SessionStatus.md)
- [ToolPermission](type-aliases/ToolPermission.md)

## Variables

- [agentDelegate](variables/agentDelegate.md)
- [fsRead](variables/fsRead.md)
- [fsWrite](variables/fsWrite.md)
- [FZAGENT_AGENT_VERSION](variables/FZAGENT_AGENT_VERSION.md)
- [SESSION_SCHEMA_DDL](variables/SESSION_SCHEMA_DDL.md)
- [shellExec](variables/shellExec.md)
- [skillInvoke](variables/skillInvoke.md)
- [webFetch](variables/webFetch.md)
- [webSearch](variables/webSearch.md)
- [wikiIngest](variables/wikiIngest.md)
- [wikiLint](variables/wikiLint.md)
- [wikiQuery](variables/wikiQuery.md)

## Functions

- [assembleSystemPrompt](functions/assembleSystemPrompt.md)
- [defineTool](functions/defineTool.md)
- [generateSessionId](functions/generateSessionId.md)
- [registerBuiltinTools](functions/registerBuiltinTools.md)
- [zodToJsonSchema](functions/zodToJsonSchema.md)
