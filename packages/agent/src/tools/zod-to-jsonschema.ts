// Converter Zod -> JSON Schema minimalista. Cobre os casos usados pelas
// nossas tools nativas (string, number, boolean, array, object, enum,
// optional, default, literal, union). Sem dep externa.

import type { z } from 'zod';

interface ZodDef {
  typeName: string;
  innerType?: { _def: ZodDef };
  type?: { _def: ZodDef };
  shape?: () => Record<string, { _def: ZodDef }>;
  values?: readonly string[];
  value?: unknown;
  options?: Array<{ _def: ZodDef }>;
  description?: string;
  defaultValue?: () => unknown;
}

function defOf(schema: z.ZodTypeAny): ZodDef {
  return (schema as unknown as { _def: ZodDef })._def;
}

export function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const d = defOf(schema);
  switch (d.typeName) {
    case 'ZodString':
      return withDesc({ type: 'string' }, d.description);
    case 'ZodNumber':
      return withDesc({ type: 'number' }, d.description);
    case 'ZodBoolean':
      return withDesc({ type: 'boolean' }, d.description);
    case 'ZodArray':
      return withDesc(
        {
          type: 'array',
          items: d.type ? zodToJsonSchema({ _def: d.type._def } as unknown as z.ZodTypeAny) : {},
        },
        d.description,
      );
    case 'ZodObject': {
      const props: Record<string, unknown> = {};
      const required: string[] = [];
      const shape = d.shape?.() ?? {};
      for (const [k, v] of Object.entries(shape)) {
        const inner = (v as { _def: ZodDef })._def;
        props[k] = zodToJsonSchema(v as unknown as z.ZodTypeAny);
        if (!isOptional(inner)) required.push(k);
      }
      const out: Record<string, unknown> = { type: 'object', properties: props };
      if (required.length > 0) out['required'] = required;
      return withDesc(out, d.description);
    }
    case 'ZodOptional':
    case 'ZodDefault':
    case 'ZodNullable':
      return d.innerType
        ? zodToJsonSchema({ _def: d.innerType._def } as unknown as z.ZodTypeAny)
        : {};
    case 'ZodEnum':
      return withDesc({ type: 'string', enum: d.values }, d.description);
    case 'ZodLiteral':
      return withDesc({ const: d.value }, d.description);
    case 'ZodUnion':
      return withDesc(
        {
          anyOf: (d.options ?? []).map((o) =>
            zodToJsonSchema({ _def: o._def } as unknown as z.ZodTypeAny),
          ),
        },
        d.description,
      );
    default:
      return {};
  }
}

function isOptional(d: ZodDef): boolean {
  return d.typeName === 'ZodOptional' || d.typeName === 'ZodDefault';
}

function withDesc(o: Record<string, unknown>, desc: string | undefined): Record<string, unknown> {
  if (desc !== undefined && desc.length > 0) o['description'] = desc;
  return o;
}
