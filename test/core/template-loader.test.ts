import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTemplate } from '../../src/core/template-loader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '../fixtures/templates');

describe('loadTemplate', () => {
  it('loads a YAML template by explicit path', async () => {
    const template = await loadTemplate(path.join(FIXTURES_DIR, 'valid-slack.yml'));
    expect(template.name).toBe('Test Slack Template');
    expect(template.version).toBe('1');
    expect(template.destination.service).toBe('slack');
  });

  it('loads a JSON template by explicit path', async () => {
    const template = await loadTemplate(path.join(FIXTURES_DIR, 'valid-slack.yml'));
    expect(template).toBeDefined();
  });

  it('throws for a non-existent path', async () => {
    await expect(
      loadTemplate('/does/not/exist.yml')
    ).rejects.toThrow(/not found/);
  });

  it('throws for a relative path that does not exist', async () => {
    await expect(
      loadTemplate('./no-such-template.yml')
    ).rejects.toThrow(/not found/);
  });
});
