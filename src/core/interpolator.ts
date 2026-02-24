import { randomUUID } from 'node:crypto';
import type { PigeonTemplate, ResolvedTemplate } from '../types.js';
import { MissingVariableError } from '../types.js';

const TOKEN_REGEX = /\{\{([^}]+)\}\}/g;

interface InterpolationContext {
  vars: Record<string, string>;
  env: Record<string, string>;
  templateName: string;
  declaredVariables: Record<string, { default?: string; required?: boolean }>;
}

const BUILTINS: Record<string, () => string> = {
  now: () => new Date().toISOString(),
  timestamp: () => String(Date.now()),
  uuid: () => randomUUID(),
};

function resolveToken(token: string, ctx: InterpolationContext): string {
  const name = token.trim();

  // Built-in dynamic variables
  if (name in BUILTINS) {
    return BUILTINS[name]();
  }

  // Caller-provided vars (case-sensitive)
  if (name in ctx.vars) {
    return ctx.vars[name];
  }

  // ALL_CAPS → environment variable
  if (name === name.toUpperCase() && /^[A-Z_][A-Z0-9_]*$/.test(name)) {
    if (name in ctx.env) {
      return ctx.env[name];
    }
  }

  // Check for declared default
  const decl = ctx.declaredVariables[name];
  if (decl?.default !== undefined) {
    // Defaults can themselves contain tokens — resolve them too
    return resolveTokens(decl.default, ctx);
  }

  // Missing required variable
  throw new MissingVariableError([name], ctx.templateName);
}

function resolveTokens(value: string, ctx: InterpolationContext): string {
  return value.replace(TOKEN_REGEX, (_match, token: string) => {
    return resolveToken(token, ctx);
  });
}

function walkAndInterpolate(node: unknown, ctx: InterpolationContext): unknown {
  if (typeof node === 'string') {
    return resolveTokens(node, ctx);
  }
  if (Array.isArray(node)) {
    return node.map(item => walkAndInterpolate(item, ctx));
  }
  if (node !== null && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node as Record<string, unknown>).map(([k, v]) => [
        resolveTokens(k, ctx),
        walkAndInterpolate(v, ctx),
      ])
    );
  }
  // numbers, booleans, null pass through unchanged
  return node;
}

export function interpolate(
  template: PigeonTemplate,
  vars: Record<string, string>,
  env: NodeJS.ProcessEnv = process.env
): ResolvedTemplate {
  const ctx: InterpolationContext = {
    vars,
    env: env as Record<string, string>,
    templateName: template.name,
    declaredVariables: template.variables ?? {},
  };

  const interpolatedDestination = walkAndInterpolate(template.destination, ctx) as PigeonTemplate['destination'];
  const interpolatedMessage = walkAndInterpolate(template.message, ctx) as Record<string, unknown>;

  return {
    ...template,
    destination: interpolatedDestination,
    message: interpolatedMessage,
    _resolved: true,
  };
}

export function collectTokens(node: unknown): string[] {
  const tokens = new Set<string>();

  function walk(n: unknown) {
    if (typeof n === 'string') {
      for (const match of n.matchAll(TOKEN_REGEX)) {
        tokens.add(match[1].trim());
      }
    } else if (Array.isArray(n)) {
      n.forEach(walk);
    } else if (n !== null && typeof n === 'object') {
      for (const [k, v] of Object.entries(n as Record<string, unknown>)) {
        walk(k);
        walk(v);
      }
    }
  }

  walk(node);
  return [...tokens];
}
