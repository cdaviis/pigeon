import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import yaml from 'js-yaml';
import type { CredentialStore } from '../types.js';

interface ResolveOptions {
  overrides?: Partial<CredentialStore>;
  configFile?: string;
  envFile?: string;
}

// Load a YAML or JSON file, returning an empty object on error
async function loadFile(filePath: string): Promise<Record<string, unknown>> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.json') {
      return JSON.parse(content) as Record<string, unknown>;
    }
    return (yaml.load(content) as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

async function loadEnvFile(envFile?: string): Promise<void> {
  if (!envFile) return;
  const { config } = await import('dotenv');
  config({ path: envFile, override: false });
}

// Gather credentials from config files (project-level and user-level)
async function loadConfigFiles(configFile?: string): Promise<Partial<CredentialStore>> {
  const candidates: string[] = [];

  if (configFile) {
    candidates.push(path.resolve(configFile));
  } else {
    // Project-level
    candidates.push(path.resolve(process.cwd(), '.pigeon.yml'));
    candidates.push(path.resolve(process.cwd(), '.pigeon.yaml'));
    candidates.push(path.resolve(process.cwd(), '.pigeon.json'));
    // User-level
    candidates.push(path.join(os.homedir(), '.pigeon', 'config.yml'));
    candidates.push(path.join(os.homedir(), '.pigeon', 'config.yaml'));
    candidates.push(path.join(os.homedir(), '.pigeon', 'config.json'));
  }

  let merged: Record<string, Record<string, string>> = {};
  for (const candidate of candidates) {
    const data = await loadFile(candidate);
    if (Object.keys(data).length > 0) {
      merged = deepMerge(merged, data as Record<string, Record<string, string>>);
    }
  }
  return merged as Partial<CredentialStore>;
}

// Extract PIGEON_{SERVICE}_{KEY} env vars for a specific service
function extractEnvCredentials(service: string): Record<string, string> {
  const prefix = `PIGEON_${service.toUpperCase()}_`;
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(prefix) && value) {
      // PIGEON_SLACK_BOT_TOKEN → botToken (camelCase)
      const suffix = key.slice(prefix.length);
      const camelKey = suffix.toLowerCase().replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      result[camelKey] = value;
    }
  }

  // Support shorthand PIGEON_SLACK_TOKEN as an alias for PIGEON_SLACK_BOT_TOKEN
  if (service === 'slack' && process.env.PIGEON_SLACK_TOKEN) {
    result.botToken ??= process.env.PIGEON_SLACK_TOKEN;
  }

  return result;
}

function deepMerge<T extends Record<string, unknown>>(base: T, override: T): T {
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      result[key] !== null
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>
      ) as T[typeof key];
    } else {
      result[key] = value as T[typeof key];
    }
  }
  return result;
}

export async function resolveCredentials(
  service: string,
  opts: ResolveOptions = {}
): Promise<Record<string, string>> {
  // Load env file first so it populates process.env before we read it
  await loadEnvFile(opts.envFile);

  // Priority (lowest → highest): config files → env vars → programmatic overrides
  const fromFiles = await loadConfigFiles(opts.configFile);
  const fromFileService = (fromFiles[service] ?? {}) as Record<string, string>;
  const fromEnv = extractEnvCredentials(service);
  const fromOverrides = (opts.overrides?.[service] ?? {}) as Record<string, string>;

  return {
    ...fromFileService,
    ...fromEnv,
    ...fromOverrides,
  };
}
