import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dispatch } from '../../src/core/dispatcher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '../fixtures/templates');
const VALID_TEMPLATE = path.join(FIXTURES_DIR, 'valid-slack.yml');

// Mock ky so no real HTTP calls are made
vi.mock('ky', () => ({
  default: {
    post: vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({ ok: true, ts: '1234567890.000001' }),
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('dispatch — dry-run', () => {
  it('returns resolved message without sending', async () => {
    const result = await dispatch(VALID_TEMPLATE, {
      vars: { greeting: 'Hello' },
      dryRun: true,
      credentials: { slack: { botToken: 'xoxb-test' } },
    });

    expect(result.success).toBe(true);
    expect(result.service).toBe('slack');
    expect(result.templateName).toBe('Test Slack Template');
    expect(result.resolvedMessage).toBeDefined();
    // Interpolation applied: default "World" used for {{name}}
    const blocks = result.resolvedMessage!.blocks as Array<{ text: { text: string } }>;
    expect(blocks[0].text.text).toBe('Hello, World!');
  });

  it('overrides default when var is provided', async () => {
    const result = await dispatch(VALID_TEMPLATE, {
      vars: { greeting: 'Hi', name: 'Alice' },
      dryRun: true,
      credentials: { slack: { botToken: 'xoxb-test' } },
    });
    const blocks = result.resolvedMessage!.blocks as Array<{ text: { text: string } }>;
    expect(blocks[0].text.text).toBe('Hi, Alice!');
  });
});

describe('dispatch — send', () => {
  it('sends and returns success result', async () => {
    const result = await dispatch(VALID_TEMPLATE, {
      vars: { greeting: 'Hello' },
      credentials: { slack: { botToken: 'xoxb-test' } },
    });

    expect(result.success).toBe(true);
    expect(result.service).toBe('slack');
    expect(result.response).toMatchObject({ ok: true });
    // resolvedMessage not present on live send
    expect(result.resolvedMessage).toBeUndefined();
  });
});

describe('dispatch — errors', () => {
  it('throws MissingVariableError when required var is absent', async () => {
    await expect(
      dispatch(VALID_TEMPLATE, {
        vars: {},
        dryRun: true,
        credentials: { slack: { botToken: 'xoxb-test' } },
      })
    ).rejects.toThrow(/greeting/);
  });

  it('throws for a non-existent template path', async () => {
    await expect(
      dispatch('/no/such/template.yml', { dryRun: true })
    ).rejects.toThrow(/not found/i);
  });

  it('throws TemplateValidationError for a schema-invalid template', async () => {
    await expect(
      dispatch(path.join(FIXTURES_DIR, 'invalid-missing-version.yml'), { dryRun: true })
    ).rejects.toThrow(/invalid template schema/i);
  });

  it('throws UnknownServiceError for an unsupported service', async () => {
    await expect(
      dispatch(path.join(FIXTURES_DIR, 'unknown-service.yml'), { dryRun: true })
    ).rejects.toThrow(/unknown service/i);
  });
});
