[**fzagent API Reference**](../../README.md)

---

[fzagent API Reference](../../README.md) / providers/src

# providers/src

## Classes

- [AnthropicProvider](classes/AnthropicProvider.md)
- [BaseLLMProvider](classes/BaseLLMProvider.md)
- [CircuitBreaker](classes/CircuitBreaker.md)
- [GoogleProvider](classes/GoogleProvider.md)
- [MockProvider](classes/MockProvider.md)
- [OllamaProvider](classes/OllamaProvider.md)
- [OpenAIProvider](classes/OpenAIProvider.md)
- [OpenRouterProvider](classes/OpenRouterProvider.md)
- [ProviderRouter](classes/ProviderRouter.md)
- [TimeoutError](classes/TimeoutError.md)

## Interfaces

- [AnthropicAuth](interfaces/AnthropicAuth.md)
- [BaseProviderOptions](interfaces/BaseProviderOptions.md)
- [CircuitBreakerConfig](interfaces/CircuitBreakerConfig.md)
- [CircuitBreakerSnapshot](interfaces/CircuitBreakerSnapshot.md)
- [CompleteOptions](interfaces/CompleteOptions.md)
- [CompleteResult](interfaces/CompleteResult.md)
- [FetchWithTimeoutOptions](interfaces/FetchWithTimeoutOptions.md)
- [LLMProvider](interfaces/LLMProvider.md)
- [MockBehavior](interfaces/MockBehavior.md)
- [ProviderRouterConfig](interfaces/ProviderRouterConfig.md)
- [RetryConfig](interfaces/RetryConfig.md)
- [ToolDefinition](interfaces/ToolDefinition.md)
- [Usage](interfaces/Usage.md)

## Type Aliases

- [AnthropicAuthType](type-aliases/AnthropicAuthType.md)
- [CircuitBreakerState](type-aliases/CircuitBreakerState.md)
- [CredEnv](type-aliases/CredEnv.md)
- [ProviderName](type-aliases/ProviderName.md)
- [StopReason](type-aliases/StopReason.md)
- [StreamChunk](type-aliases/StreamChunk.md)
- [TimeoutProvider](type-aliases/TimeoutProvider.md)
- [ToolChoice](type-aliases/ToolChoice.md)

## Variables

- [API_TIMEOUTS](variables/API_TIMEOUTS.md)
- [FZAGENT_PROVIDERS_VERSION](variables/FZAGENT_PROVIDERS_VERSION.md)

## Functions

- [checkProviderAvailable](functions/checkProviderAvailable.md)
- [defaultIsRetryable](functions/defaultIsRetryable.md)
- [detectAnthropicAuthType](functions/detectAnthropicAuthType.md)
- [fetchWithTimeout](functions/fetchWithTimeout.md)
- [getAnthropicAuth](functions/getAnthropicAuth.md)
- [getEnvVarName](functions/getEnvVarName.md)
- [getGoogleApiKey](functions/getGoogleApiKey.md)
- [getOllamaBaseUrl](functions/getOllamaBaseUrl.md)
- [getOpenAIKey](functions/getOpenAIKey.md)
- [getOpenRouterKey](functions/getOpenRouterKey.md)
- [getTimeout](functions/getTimeout.md)
- [retry](functions/retry.md)
