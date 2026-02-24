import { loadTemplate } from './template-loader.js';
import { validateSchema, validateVariables } from './validator.js';
import { interpolate } from './interpolator.js';
import { getAdapter } from '../adapters/index.js';
import { resolveCredentials } from '../credentials/index.js';
import type { SendOptions, SendResult } from '../types.js';

export async function dispatch(nameOrPath: string, opts: SendOptions = {}): Promise<SendResult> {
  const vars = opts.vars ?? {};

  // 1. Load template
  const template = await loadTemplate(nameOrPath);

  // 2. Validate template schema
  validateSchema(template);

  // 3. Validate that all required variables have values
  validateVariables(template, vars);

  // 4. Resolve credentials for the target service
  const credentials = await resolveCredentials(template.destination.service, {
    overrides: opts.credentials,
    configFile: opts.configFile,
    envFile: opts.envFile,
  });

  // 5. Interpolate variables into the template
  const resolved = interpolate(template, vars);

  // 6. Look up the service adapter
  const adapter = getAdapter(resolved.destination.service);

  // 7. Compile DSL shorthand to service-native payload (if adapter supports it)
  const compiledMessage = adapter.compile?.(resolved.message) ?? resolved.message;

  // 8. Adapter-level validation on compiled payload
  adapter.validate(compiledMessage);

  // 9. Dry-run: return compiled payload without sending
  if (opts.dryRun) {
    return {
      success: true,
      service: adapter.serviceName,
      templateName: resolved.name,
      resolvedMessage: compiledMessage,
    };
  }

  // 10. Send
  const response = await adapter.send(
    compiledMessage,
    resolved.destination as Record<string, unknown>,
    credentials
  );

  return {
    success: true,
    service: adapter.serviceName,
    templateName: resolved.name,
    response,
  };
}
