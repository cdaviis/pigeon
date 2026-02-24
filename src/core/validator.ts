import { z } from 'zod';
import type { PigeonTemplate } from '../types.js';
import { TemplateValidationError, MissingVariableError } from '../types.js';

const TemplateVariableSchema = z.object({
  description: z.string().optional(),
  default: z.string().optional(),
  required: z.boolean().optional(),
});

const TemplateSchema = z.object({
  version: z.literal('1'),
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  destination: z
    .object({
      service: z.string().min(1, 'destination.service is required'),
    })
    .passthrough(),
  variables: z.record(TemplateVariableSchema).optional(),
  message: z.record(z.unknown()),
});

export function validateSchema(template: unknown): asserts template is PigeonTemplate {
  const result = TemplateSchema.safeParse(template);
  if (!result.success) {
    const details = result.error.issues
      .map(issue => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new TemplateValidationError(details);
  }
}

export function validateVariables(template: PigeonTemplate, vars: Record<string, string>): void {
  const declared = template.variables ?? {};
  const missing: string[] = [];

  for (const [key, decl] of Object.entries(declared)) {
    const isRequired = decl.required !== false && decl.default === undefined;
    if (isRequired && !(key in vars)) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new MissingVariableError(missing, template.name);
  }
}
