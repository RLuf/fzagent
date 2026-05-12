// fazai-bridge-ping — ensaio de bridge IPC generica para o subsistema corpo.
//
// Esta skill simula um round-trip pela bridge L99. Hoje devolve um echo
// estruturado com latencia medida; quando a bridge real estiver disponivel,
// a unica mudanca e o corpo de `run()` (o contrato de input/output e estavel).
//
// Importante: targetDomain='bridge' agrupa todas as skills que tocam o canal
// de integracao com sistemas externos coordenados (nao web genericos).

import { z } from 'zod';
import { defineSkill } from '@fzagent/skills';

export default defineSkill({
  name: 'fazai-bridge-ping',
  description:
    'Ping de round-trip pela bridge cerebro<->corpo. Hoje e echo local; quando a bridge real existir, mesma assinatura.',
  triggers: ['ping bridge', 'fazai bridge ping'],
  permissions: 'low',
  category: 'system',
  targetDomain: 'bridge',
  isDestructive: false,
  requiresConfirmation: false,
  version: '0.1.0',
  inputSchema: z.object({
    payload: z.unknown().describe('payload arbitrario que sera devolvido como echo'),
    channel: z.string().default('default').describe('canal logico da bridge'),
    simulateLatencyMs: z.number().int().min(0).max(5000).default(0),
  }),
  async run(_ctx, input) {
    const start = Date.now();
    if (input.simulateLatencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, input.simulateLatencyMs));
    }
    return {
      ok: true,
      bridge: 'mock-local',
      channel: input.channel,
      echo: input.payload,
      roundTripMs: Date.now() - start,
      replacedByRealBridgeAt: null,
    };
  },
});
