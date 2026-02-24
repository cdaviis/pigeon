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
