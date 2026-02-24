import { describe, it, expect } from 'vitest';
import { interpolate, collectTokens } from '../../src/core/interpolator.js';
import type { PigeonTemplate } from '../../src/types.js';

const baseTemplate: PigeonTemplate = {
  version: '1',
  name: 'Test',
  destination: { service: 'slack', channel: '#test' },
  message: {},
};

describe('interpolate', () => {
  it('replaces simple {{var}} tokens', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      message: { text: 'Hello, {{name}}!' },
    };
    const result = interpolate(template, { name: 'World' });
    expect(result.message.text).toBe('Hello, World!');
    expect(result._resolved).toBe(true);
  });

  it('replaces multiple tokens in one string', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      message: { text: '{{greeting}}, {{name}}!' },
    };
    const result = interpolate(template, { greeting: 'Hi', name: 'Alice' });
    expect(result.message.text).toBe('Hi, Alice!');
  });

  it('interpolates nested objects', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      message: {
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '{{msg}}' } }],
      },
    };
    const result = interpolate(template, { msg: 'nested' });
    const block = (result.message.blocks as Array<{ text: { text: string } }>)[0];
    expect(block.text.text).toBe('nested');
  });

  it('uses declared variable defaults', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      variables: { env: { default: 'production' } },
      message: { text: 'Deploying to {{env}}' },
    };
    const result = interpolate(template, {});
    expect(result.message.text).toBe('Deploying to production');
  });

  it('throws MissingVariableError for unknown tokens', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      message: { text: '{{missing}}' },
    };
    expect(() => interpolate(template, {})).toThrow('missing');
  });

  it('resolves ALL_CAPS tokens from env', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      message: { text: 'Token: {{MY_SECRET}}' },
    };
    const result = interpolate(template, {}, { MY_SECRET: 'abc123' });
    expect(result.message.text).toBe('Token: abc123');
  });

  it('resolves built-in {{now}} token', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      message: { text: '{{now}}' },
    };
    const result = interpolate(template, {});
    expect(typeof result.message.text).toBe('string');
    expect(new Date(result.message.text as string).toISOString()).toBe(result.message.text);
  });

  it('resolves built-in {{uuid}} token', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      message: { text: '{{uuid}}' },
    };
    const result = interpolate(template, {});
    expect(typeof result.message.text).toBe('string');
    expect((result.message.text as string)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('interpolates destination fields', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      destination: { service: 'slack', channel: '{{SLACK_CHANNEL}}' },
      message: {},
    };
    const result = interpolate(template, {}, { SLACK_CHANNEL: '#prod' });
    expect(result.destination.channel).toBe('#prod');
  });

  it('interpolates object keys', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      message: { '{{key_name}}': 'value' },
    };
    const result = interpolate(template, { key_name: 'myKey' });
    expect(result.message.myKey).toBe('value');
  });

  it('passes numbers and booleans through unchanged', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      message: { count: 42, active: true, nothing: null },
    };
    const result = interpolate(template, {});
    expect(result.message.count).toBe(42);
    expect(result.message.active).toBe(true);
    expect(result.message.nothing).toBeNull();
  });

  it('throws on circular variable defaults', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      variables: {
        a: { default: '{{b}}' },
        b: { default: '{{a}}' },
      },
      message: { text: '{{a}}' },
    };
    expect(() => interpolate(template, {})).toThrow(/circular/i);
  });

  // ─── Edge cases (see docs/edge-cases.md) ───────────────────────────────────

  it('built-ins cannot be overridden by vars', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      message: { text: '{{now}}' },
    };
    const result = interpolate(template, { now: 'custom' });
    expect(result.message.text).not.toBe('custom');
    expect(new Date(result.message.text as string).toISOString()).toBe(result.message.text);
  });

  it('caller vars override env for same name (e.g. USER)', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      message: { text: '{{USER}}' },
    };
    const result = interpolate(template, { USER: 'alice' }, { USER: 'env-user' });
    expect(result.message.text).toBe('alice');
  });

  it('ALL_CAPS token with no env and no default throws MissingVariableError', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      message: { text: '{{NOT_SET_ENV}}' },
    };
    expect(() => interpolate(template, {}, {})).toThrow(/NOT_SET_ENV|Missing required variable/);
  });

  it('empty string is valid for required vars', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      variables: { user: { required: true } },
      message: { text: '{{user}}' },
    };
    const result = interpolate(template, { user: '' });
    expect(result.message.text).toBe('');
  });

  it('empty or whitespace-only token throws for missing variable', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      message: { text: 'x{{  }}y' },
    };
    expect(() => interpolate(template, {})).toThrow(/Missing required variable|missing/);
  });

  it('required + default: default is used when var not provided', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      variables: { env: { required: true, default: 'staging' } },
      message: { text: '{{env}}' },
    };
    const result = interpolate(template, {});
    expect(result.message.text).toBe('staging');
  });

  it('interpolated key can resolve to empty string', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      message: { '{{key}}': 'v' },
    };
    const result = interpolate(template, { key: '' });
    expect((result.message as Record<string, unknown>)['']).toBe('v');
  });

  it('case sensitivity: User vs user are different', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      variables: { User: { default: 'DeclaredUser' } },
      message: { text: '{{User}} {{user}}' },
    };
    const result = interpolate(template, { user: 'cli-user' });
    expect(result.message.text).toBe('DeclaredUser cli-user');
  });

  it('undeclared token in template throws MissingVariableError', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      message: { text: '{{undeclared}}' },
    };
    expect(() => interpolate(template, {})).toThrow(/undeclared|Missing required variable/);
  });

  it('mixed case {{User}} does not read env USER', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      message: { text: '{{User}}' },
    };
    expect(() => interpolate(template, {}, { USER: 'from-env' })).toThrow(/User|Missing required variable/);
  });

  it('value with equals sign: var k=a=b=c resolves to a=b=c', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      message: { text: '{{k}}' },
    };
    const result = interpolate(template, { k: 'a=b=c' });
    expect(result.message.text).toBe('a=b=c');
  });

  it('env value undefined (e.g. custom env in tests) is stringified as "undefined"', () => {
    const template: PigeonTemplate = {
      ...baseTemplate,
      message: { text: '{{FOO}}' },
    };
    const result = interpolate(template, {}, { FOO: undefined as unknown as string });
    expect(result.message.text).toBe('undefined');
  });
});

describe('collectTokens', () => {
  it('collects all tokens from a nested object', () => {
    const node = {
      text: '{{foo}} and {{bar}}',
      nested: { value: '{{baz}}' },
      arr: ['{{qux}}'],
    };
    const tokens = collectTokens(node);
    expect(tokens).toContain('foo');
    expect(tokens).toContain('bar');
    expect(tokens).toContain('baz');
    expect(tokens).toContain('qux');
  });
});
