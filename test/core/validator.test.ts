import { describe, it, expect } from 'vitest';
import { validateSchema, validateVariables } from '../../src/core/validator.js';
import type { PigeonTemplate } from '../../src/types.js';

const validTemplate: PigeonTemplate = {
  version: '1',
  name: 'Test',
  destination: { service: 'slack', channel: '#test' },
  message: { text: 'hello' },
};

describe('validateSchema', () => {
  it('passes for a valid template', () => {
    expect(() => validateSchema(validTemplate)).not.toThrow();
  });

  it('throws when version is wrong', () => {
    expect(() => validateSchema({ ...validTemplate, version: '2' })).toThrow(/Invalid template schema/);
  });

  it('throws when name is missing', () => {
    const { name: _, ...rest } = validTemplate;
    expect(() => validateSchema(rest)).toThrow();
  });

  it('throws when destination.service is missing', () => {
    expect(() =>
      validateSchema({ ...validTemplate, destination: { service: '' } })
    ).toThrow();
  });

  it('throws when message is missing', () => {
    const { message: _, ...rest } = validTemplate;
    expect(() => validateSchema(rest)).toThrow();
  });

  it('allows extra keys in destination (passthrough)', () => {
    const template = {
      ...validTemplate,
      destination: { service: 'slack', channel: '#test', extra: 'ok' },
    };
    expect(() => validateSchema(template)).not.toThrow();
  });

  it('allows optional description', () => {
    expect(() =>
      validateSchema({ ...validTemplate, description: 'A description' })
    ).not.toThrow();
  });
});

describe('validateVariables', () => {
  it('passes when all required vars are provided', () => {
    const template: PigeonTemplate = {
      ...validTemplate,
      variables: { name: { required: true } },
    };
    expect(() => validateVariables(template, { name: 'Alice' })).not.toThrow();
  });

  it('throws when a required var is missing', () => {
    const template: PigeonTemplate = {
      ...validTemplate,
      variables: { name: { required: true } },
    };
    expect(() => validateVariables(template, {})).toThrow('name');
  });

  it('does not throw when a missing var has a default', () => {
    const template: PigeonTemplate = {
      ...validTemplate,
      variables: { env: { default: 'production' } },
    };
    expect(() => validateVariables(template, {})).not.toThrow();
  });

  it('passes with no variables declared', () => {
    expect(() => validateVariables(validTemplate, {})).not.toThrow();
  });

  it('lists all missing required vars in the error', () => {
    const template: PigeonTemplate = {
      ...validTemplate,
      variables: {
        foo: { required: true },
        bar: { required: true },
      },
    };
    expect(() => validateVariables(template, {})).toThrow(/foo.*bar|bar.*foo/);
  });
});
