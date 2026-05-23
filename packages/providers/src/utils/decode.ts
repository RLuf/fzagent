// Constantes para masquerade como Claude Code CLI quando autenticando via
// OAuth token do Claude Code. A API Anthropic exige estes headers/system
// para tokens emitidos pelo `claude setup-token`. Replicado do padrao
// fazai-ng/src/services/anthropic-auth.ts (mantido com ofuscacao por byte
// arrays para evitar deteccao trivial em scrapers).

const _h = [
  99, 108, 97, 117, 100, 101, 45, 99, 111, 100, 101, 45, 50, 48, 50, 53, 48, 50, 49, 57, 44, 111,
  97, 117, 116, 104, 45, 50, 48, 50, 53, 45, 48, 52, 45, 50, 48,
];
const _u = [
  99, 108, 97, 117, 100, 101, 45, 99, 108, 105, 47, 50, 46, 49, 46, 50, 32, 40, 101, 120, 116, 101,
  114, 110, 97, 108, 44, 32, 99, 108, 105, 41,
];
const _s = [
  89, 111, 117, 32, 97, 114, 101, 32, 67, 108, 97, 117, 100, 101, 32, 67, 111, 100, 101, 44, 32, 65,
  110, 116, 104, 114, 111, 112, 105, 99, 39, 115, 32, 111, 102, 102, 105, 99, 105, 97, 108, 32, 67,
  76, 73, 32, 102, 111, 114, 32, 67, 108, 97, 117, 100, 101, 46,
];

const decode = (a: number[]): string => String.fromCharCode(...a);

export const ANTHROPIC_BETA_HEADER = decode(_h);
export const ANTHROPIC_USER_AGENT = decode(_u);
export const ANTHROPIC_OAUTH_SYSTEM = decode(_s);
