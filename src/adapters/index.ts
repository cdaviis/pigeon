import type { ServiceAdapter } from '../types.js';
import { UnknownServiceError } from '../types.js';
import { SlackAdapter } from './slack.js';

const adapters = new Map<string, ServiceAdapter>([
  ['slack', new SlackAdapter()],
]);

export function getAdapter(service: string): ServiceAdapter {
  const adapter = adapters.get(service);
  if (!adapter) {
    throw new UnknownServiceError(service, [...adapters.keys()]);
  }
  return adapter;
}
