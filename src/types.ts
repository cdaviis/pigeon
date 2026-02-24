export interface TemplateVariable {
  description?: string;
  default?: string;
  required?: boolean;
}

export interface PigeonTemplate {
  version: string;
  name: string;
  description?: string;
  destination: {
    service: string;
    [key: string]: unknown;
  };
  variables?: Record<string, TemplateVariable>;
  message: Record<string, unknown>;
}

export interface ResolvedTemplate extends PigeonTemplate {
  _resolved: true;
}

export interface SendOptions {
  vars?: Record<string, string>;
  credentials?: Partial<CredentialStore>;
  dryRun?: boolean;
  configFile?: string;
  envFile?: string;
}

export interface SendResult {
  success: boolean;
  service: string;
  templateName: string;
  resolvedMessage?: Record<string, unknown>;
  response?: unknown;
  error?: Error;
}

export interface CredentialStore {
  slack?: { botToken: string };
  notion?: { apiKey: string };
  [service: string]: Record<string, string> | undefined;
}

export interface ServiceAdapter {
  readonly serviceName: string;
  validate(message: Record<string, unknown>): void;
  /** Optional: compile DSL/shorthand to service-native payload. Called before validate and send. */
  compile?(message: Record<string, unknown>): Record<string, unknown>;
  send(
    message: Record<string, unknown>,
    destination: Record<string, unknown>,
    credentials: Record<string, string>
  ): Promise<unknown>;
}


export class PigeonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PigeonError';
  }
}

export class TemplateNotFoundError extends PigeonError {
  constructor(name: string, searched: string[]) {
    super(
      `Template "${name}" not found. Searched:\n${searched.map(p => `  - ${p}`).join('\n')}`
    );
    this.name = 'TemplateNotFoundError';
  }
}

export class MissingVariableError extends PigeonError {
  constructor(tokens: string[], templateName: string) {
    super(
      `Missing required variable${tokens.length > 1 ? 's' : ''} in template "${templateName}": ${tokens.join(', ')}`
    );
    this.name = 'MissingVariableError';
  }
}

export class UnknownServiceError extends PigeonError {
  constructor(service: string, available: string[]) {
    super(
      `Unknown service "${service}". Available adapters: ${available.join(', ')}`
    );
    this.name = 'UnknownServiceError';
  }
}

export class AdapterValidationError extends PigeonError {
  constructor(service: string, message: string) {
    super(`[${service}] Invalid message: ${message}`);
    this.name = 'AdapterValidationError';
  }
}

export class TemplateValidationError extends PigeonError {
  constructor(details: string) {
    super(`Invalid template schema:\n${details}`);
    this.name = 'TemplateValidationError';
  }
}

export class MissingCredentialsError extends PigeonError {
  constructor(service: string, key: string) {
    super(
      `Missing credentials for "${service}": "${key}" is required.\n` +
      `Set it via environment variable or credentials config file.`
    );
    this.name = 'MissingCredentialsError';
  }
}
