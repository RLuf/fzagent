// @fzagent/providers — superficie publica.
// Reexports para que consumers importem direto de '@fzagent/providers'.

export const FZAGENT_PROVIDERS_VERSION = '0.1.0';

// types
export type {
  CompleteOptions,
  CompleteResult,
  LLMProvider,
  StopReason,
  StreamChunk,
  ToolChoice,
  ToolDefinition,
  Usage,
} from './types.js';

// base
export { BaseLLMProvider } from './base.js';
export type { BaseProviderOptions } from './base.js';

// adapters
export { AnthropicProvider } from './adapters/anthropic.js';
export { OpenAIProvider } from './adapters/openai.js';
export { OpenRouterProvider } from './adapters/openrouter.js';
export { GoogleProvider } from './adapters/google.js';
export { OllamaProvider } from './adapters/ollama.js';
export { MockProvider } from './adapters/mock.js';
export type { MockBehavior } from './adapters/mock.js';

// router
export { ProviderRouter } from './router/index.js';
export type { ProviderRouterConfig } from './router/index.js';
export { CircuitBreaker } from './router/circuit-breaker.js';
export type {
  CircuitBreakerConfig,
  CircuitBreakerSnapshot,
  CircuitBreakerState,
} from './router/circuit-breaker.js';
export { defaultIsRetryable, retry } from './router/retry.js';
export type { RetryConfig } from './router/retry.js';

// credentials (replicado do fazai-ng/src/apiKeyUtils.ts)
export {
  checkProviderAvailable,
  detectAnthropicAuthType,
  getAnthropicAuth,
  getEnvVarName,
  getGoogleApiKey,
  getOllamaBaseUrl,
  getOpenAIKey,
  getOpenRouterKey,
} from './credentials.js';
export type { AnthropicAuth, AnthropicAuthType, CredEnv, ProviderName } from './credentials.js';

// utils
export { fetchWithTimeout, getTimeout, TimeoutError, API_TIMEOUTS } from './utils/fetch.js';
export type { FetchWithTimeoutOptions, TimeoutProvider } from './utils/fetch.js';
