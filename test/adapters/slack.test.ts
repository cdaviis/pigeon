import { describe, it, expect } from 'vitest';
import { SlackAdapter } from '../../src/adapters/slack.js';
import { AdapterValidationError, MissingCredentialsError } from '../../src/types.js';

const adapter = new SlackAdapter();

describe('SlackAdapter.validate', () => {
  it('passes when blocks are present', () => {
    expect(() => adapter.validate({ blocks: [] })).not.toThrow();
  });

  it('passes when text is present', () => {
    expect(() => adapter.validate({ text: 'hello' })).not.toThrow();
  });

  it('throws AdapterValidationError when neither blocks nor text are present', () => {
    expect(() => adapter.validate({})).toThrowError(AdapterValidationError);
  });

  it('throws AdapterValidationError when blocks is not an array', () => {
    expect(() => adapter.validate({ blocks: 'not-an-array' })).toThrowError(AdapterValidationError);
  });
});

describe('SlackAdapter.send', () => {
  it('throws MissingCredentialsError when botToken is absent', async () => {
    await expect(
      adapter.send({ blocks: [] }, { channel: '#test' }, {})
    ).rejects.toThrowError(MissingCredentialsError);
  });

  it('throws AdapterValidationError when channel is absent', async () => {
    await expect(
      adapter.send({ blocks: [] }, {}, { botToken: 'xoxb-test' })
    ).rejects.toThrowError(AdapterValidationError);
  });
});
