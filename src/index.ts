import { dispatch } from './core/dispatcher.js';
import type { SendOptions, SendResult, ServiceAdapter, PigeonTemplate, CredentialStore } from './types.js';

export async function send(
  template: string,
  vars?: Record<string, string>,
  opts?: Omit<SendOptions, 'vars'>
): Promise<SendResult> {
  return dispatch(template, { ...opts, vars });
}

export type { SendOptions, SendResult, ServiceAdapter, PigeonTemplate, CredentialStore };

export default { send };
