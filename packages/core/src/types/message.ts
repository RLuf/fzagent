// Schemas Zod para mensagens, tool calls e tool results.
// Formato canonico compatibilizado com OpenAI/Anthropic chat completion.
// O ProviderRouter (FASE 3) traduz para o dialeto especifico de cada provider.

import { z } from 'zod';

export const MessageRoleSchema = z.enum(['system', 'user', 'assistant', 'tool']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

// Tool call invocada pelo modelo. `input` é um record arbitrário validado
// posteriormente contra o schema da tool especifica.
export const ToolCallSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  input: z.record(z.string(), z.unknown()),
});
export type ToolCall = z.infer<typeof ToolCallSchema>;

// Resultado de uma tool. `is_error` segue convencao Anthropic (true = erro;
// o modelo aprende a ajustar comportamento na proxima iteracao).
export const ToolResultSchema = z.object({
  tool_call_id: z.string().min(1),
  content: z.string(),
  is_error: z.boolean().optional(),
});
export type ToolResult = z.infer<typeof ToolResultSchema>;

// Mensagem unitaria. Quando role=assistant pode carregar tool_calls;
// quando role=tool deve referenciar um tool_call_id.
export const MessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string(),
  tool_calls: z.array(ToolCallSchema).optional(),
  tool_call_id: z.string().optional(),
  timestamp: z.number().int().optional(),
});
export type Message = z.infer<typeof MessageSchema>;
