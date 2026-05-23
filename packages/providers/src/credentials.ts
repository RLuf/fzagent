// Detector de credenciais por provider. Replicado do fazai-ng/src/apiKeyUtils.ts
// e fazai-ng/src/services/anthropic-auth.ts.
//
// Decisoes:
// 1. Anthropic com prioridade EXATA: CLAUDE_CODE_OAUTH_TOKEN > ANTHROPIC_OAUTH_TOKEN
//    > ANTHROPIC_API_KEY (e ANTHROPIC_AUTH_TOKEN como alias do OAuth).
// 2. detectAnthropicAuthType reconhece 'sk-ant-oat' (OAuth), 'sk-ant-' (API key),
//    fallback por tamanho > 100 caracteres = OAuth.
// 3. Ollama nao precisa de credencial — retorna apenas a baseUrl.
// 4. checkProviderAvailable retorna true se o provider tem credencial disponivel.

export type AnthropicAuthType = 'api_key' | 'oauth_token';

export interface AnthropicAuth {
  authType: AnthropicAuthType;
  credential: string;
}

export type CredEnv = Record<string, string | undefined>;

export function detectAnthropicAuthType(credential: string): AnthropicAuthType {
  if (credential.startsWith('sk-ant-oat')) return 'oauth_token';
  if (credential.startsWith('sk-ant-')) return 'api_key';
  if (credential.length > 100) return 'oauth_token';
  return 'api_key';
}

// Resolve credencial Anthropic seguindo a prioridade do fazai-ng.
// Retorna null quando nada esta configurado.
export function getAnthropicAuth(env: CredEnv): AnthropicAuth | null {
  const ext =
    env['CLAUDE_CODE_OAUTH_TOKEN'] || env['ANTHROPIC_OAUTH_TOKEN'] || env['ANTHROPIC_AUTH_TOKEN'];

  if (ext && ext.length > 0) {
    return { authType: 'oauth_token', credential: ext };
  }

  const apiKey = env['ANTHROPIC_API_KEY'];
  if (apiKey && apiKey.length > 0) {
    return { authType: detectAnthropicAuthType(apiKey), credential: apiKey };
  }

  return null;
}

export function getOpenAIKey(env: CredEnv): string | undefined {
  return env['OPENAI_API_KEY'];
}

export function getOpenRouterKey(env: CredEnv): string | undefined {
  return env['OPENROUTER_API_KEY'];
}

export function getGoogleApiKey(env: CredEnv): string | undefined {
  return env['GOOGLE_API_KEY'];
}

export function getOllamaBaseUrl(env: CredEnv, fallback = 'http://192.168.0.101:11434'): string {
  const url = env['OLLAMA_BASE_URL'];
  return url && url.length > 0 ? url : fallback;
}

export type ProviderName = 'anthropic' | 'openai' | 'openrouter' | 'google' | 'ollama';

// True se o provider tem como ser invocado (credencial OU endpoint local).
export function checkProviderAvailable(provider: ProviderName, env: CredEnv): boolean {
  switch (provider) {
    case 'anthropic':
      return getAnthropicAuth(env) !== null;
    case 'openai':
      return Boolean(getOpenAIKey(env));
    case 'openrouter':
      return Boolean(getOpenRouterKey(env));
    case 'google':
      return Boolean(getGoogleApiKey(env));
    case 'ollama':
      // Ollama nao precisa de credencial; basta a URL.
      return true;
    default:
      return false;
  }
}

// Equivalente a getEnvVarName do fazai-ng. Util para mensagens de erro
// e instrucao ao usuario sobre qual variavel preencher.
export function getEnvVarName(provider: ProviderName, env?: CredEnv): string {
  switch (provider) {
    case 'anthropic':
      // Se OAuth ja esta presente, sinaliza ANTHROPIC_AUTH_TOKEN como destino.
      if (env && (env['CLAUDE_CODE_OAUTH_TOKEN'] || env['ANTHROPIC_AUTH_TOKEN'])) {
        return 'ANTHROPIC_AUTH_TOKEN';
      }
      return 'ANTHROPIC_API_KEY';
    case 'openai':
      return 'OPENAI_API_KEY';
    case 'openrouter':
      return 'OPENROUTER_API_KEY';
    case 'google':
      return 'GOOGLE_API_KEY';
    case 'ollama':
      return 'OLLAMA_BASE_URL';
    default:
      throw new Error(`Provider nao suportado: ${provider as string}`);
  }
}
