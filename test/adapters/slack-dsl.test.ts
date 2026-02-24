import { describe, it, expect } from 'vitest';
import { compileDSL, isDSLMessage } from '../../src/adapters/slack-dsl.js';

// ─── isDSLMessage ─────────────────────────────────────────────────────────────

describe('isDSLMessage', () => {
  it('returns true for a message with shorthand blocks', () => {
    expect(isDSLMessage({ blocks: [{ header: 'Hello' }] })).toBe(true);
  });

  it('returns false for a message with raw Block Kit blocks', () => {
    expect(isDSLMessage({
      blocks: [{ type: 'header', text: { type: 'plain_text', text: 'Hello' } }]
    })).toBe(false);
  });

  it('returns false for a message with no blocks', () => {
    expect(isDSLMessage({ text: 'Hello' })).toBe(false);
  });

  it('returns false for empty blocks array', () => {
    expect(isDSLMessage({ blocks: [] })).toBe(false);
  });

  it('returns true for mixed DSL and raw blocks', () => {
    expect(isDSLMessage({
      blocks: [
        { header: 'Title' },
        { type: 'divider' },
      ]
    })).toBe(true);
  });
});

// ─── header ──────────────────────────────────────────────────────────────────

describe('compileDSL — header', () => {
  it('compiles string shorthand', () => {
    const result = compileDSL({ blocks: [{ header: 'Hello world' }] });
    expect(result.blocks![0]).toEqual({
      type: 'header',
      text: { type: 'plain_text', text: 'Hello world', emoji: true },
    });
  });

  it('compiles object shorthand with block_id', () => {
    const result = compileDSL({
      blocks: [{ header: { text: 'Hello', block_id: 'my_header' } }]
    });
    expect(result.blocks![0]).toMatchObject({
      type: 'header',
      block_id: 'my_header',
    });
  });
});

// ─── divider ─────────────────────────────────────────────────────────────────

describe('compileDSL — divider', () => {
  it('compiles divider: true', () => {
    const result = compileDSL({ blocks: [{ divider: true }] });
    expect(result.blocks![0]).toEqual({ type: 'divider' });
  });
});

// ─── section ─────────────────────────────────────────────────────────────────

describe('compileDSL — section', () => {
  it('compiles text section', () => {
    const result = compileDSL({
      blocks: [{ section: { text: '*Hello* world' } }]
    });
    expect(result.blocks![0]).toEqual({
      type: 'section',
      text: { type: 'mrkdwn', text: '*Hello* world' },
    });
  });

  it('compiles fields section', () => {
    const result = compileDSL({
      blocks: [{ section: { fields: ['*A:*\nfoo', '*B:*\nbar'] } }]
    });
    const block = result.blocks![0] as Record<string, unknown>;
    expect(block.type).toBe('section');
    expect(block.fields).toEqual([
      { type: 'mrkdwn', text: '*A:*\nfoo' },
      { type: 'mrkdwn', text: '*B:*\nbar' },
    ]);
  });

  it('compiles section with button accessory', () => {
    const result = compileDSL({
      blocks: [{
        section: {
          text: 'Check this out',
          accessory: {
            button: { text: 'Click', url: 'https://example.com', style: 'primary' }
          }
        }
      }]
    });
    const block = result.blocks![0] as Record<string, unknown>;
    const accessory = block.accessory as Record<string, unknown>;
    expect(accessory.type).toBe('button');
    expect(accessory.style).toBe('primary');
    expect(accessory.url).toBe('https://example.com');
  });

  it('includes block_id when provided', () => {
    const result = compileDSL({
      blocks: [{ section: { text: 'hi', block_id: 'sec1' } }]
    });
    expect((result.blocks![0] as Record<string, unknown>).block_id).toBe('sec1');
  });
});

// ─── context ─────────────────────────────────────────────────────────────────

describe('compileDSL — context', () => {
  it('compiles array of string items', () => {
    const result = compileDSL({
      blocks: [{ context: ['Deployed at 2026-01-01', 'by CI/CD'] }]
    });
    const block = result.blocks![0] as Record<string, unknown>;
    expect(block.type).toBe('context');
    expect(block.elements).toEqual([
      { type: 'mrkdwn', text: 'Deployed at 2026-01-01' },
      { type: 'mrkdwn', text: 'by CI/CD' },
    ]);
  });

  it('compiles context with image item', () => {
    const result = compileDSL({
      blocks: [{
        context: [
          'Some text',
          { image: { url: 'https://example.com/img.png', alt: 'Avatar' } }
        ]
      }]
    });
    const block = result.blocks![0] as Record<string, unknown>;
    const elements = block.elements as Record<string, unknown>[];
    expect(elements[1]).toEqual({
      type: 'image',
      image_url: 'https://example.com/img.png',
      alt_text: 'Avatar',
    });
  });

  it('compiles object form with elements and block_id', () => {
    const result = compileDSL({
      blocks: [{ context: { elements: ['hello'], block_id: 'ctx1' } }]
    });
    const block = result.blocks![0] as Record<string, unknown>;
    expect(block.block_id).toBe('ctx1');
    expect(Array.isArray(block.elements)).toBe(true);
  });
});

// ─── actions ─────────────────────────────────────────────────────────────────

describe('compileDSL — actions', () => {
  it('compiles actions block with buttons', () => {
    const result = compileDSL({
      blocks: [{
        actions: {
          elements: [
            { button: { text: 'Approve', style: 'primary', action_id: 'approve' } },
            { button: { text: 'Reject', style: 'danger', action_id: 'reject' } },
          ]
        }
      }]
    });
    const block = result.blocks![0] as Record<string, unknown>;
    expect(block.type).toBe('actions');
    const elements = block.elements as Record<string, unknown>[];
    expect(elements).toHaveLength(2);
    expect(elements[0].type).toBe('button');
    expect(elements[0].action_id).toBe('approve');
    expect(elements[1].style).toBe('danger');
  });

  it('compiles button with confirm dialog', () => {
    const result = compileDSL({
      blocks: [{
        actions: {
          elements: [{
            button: {
              text: 'Delete',
              style: 'danger',
              confirm: {
                title: 'Sure?',
                text: 'This is irreversible.',
                confirm: 'Yes',
                deny: 'No',
                style: 'danger',
              }
            }
          }]
        }
      }]
    });
    const block = result.blocks![0] as Record<string, unknown>;
    const btn = (block.elements as Record<string, unknown>[])[0];
    const confirm = btn.confirm as Record<string, unknown>;
    expect(confirm.style).toBe('danger');
    expect((confirm.title as Record<string, unknown>).text).toBe('Sure?');
  });

  it('compiles overflow element', () => {
    const result = compileDSL({
      blocks: [{
        actions: {
          elements: [{
            overflow: {
              action_id: 'menu',
              options: [
                { text: 'Edit', value: 'edit' },
                { text: 'Docs', url: 'https://docs.example.com' },
              ]
            }
          }]
        }
      }]
    });
    const block = result.blocks![0] as Record<string, unknown>;
    const el = (block.elements as Record<string, unknown>[])[0];
    expect(el.type).toBe('overflow');
    const opts = el.options as Record<string, unknown>[];
    expect(opts[1].url).toBe('https://docs.example.com');
  });

  it('compiles select element', () => {
    const result = compileDSL({
      blocks: [{
        actions: {
          elements: [{
            select: {
              action_id: 'env',
              placeholder: 'Choose env',
              options: [{ text: 'prod', value: 'prod' }]
            }
          }]
        }
      }]
    });
    const el = ((result.blocks![0] as Record<string, unknown>).elements as Record<string, unknown>[])[0];
    expect(el.type).toBe('static_select');
    expect((el.placeholder as Record<string, unknown>).text).toBe('Choose env');
  });

  it('compiles multi_select element', () => {
    const result = compileDSL({
      blocks: [{
        actions: {
          elements: [{
            multi_select: {
              placeholder: 'Pick tags',
              options: [{ text: 'infra', value: 'infra' }]
            }
          }]
        }
      }]
    });
    const el = ((result.blocks![0] as Record<string, unknown>).elements as Record<string, unknown>[])[0];
    expect(el.type).toBe('multi_static_select');
  });
});

// ─── image ────────────────────────────────────────────────────────────────────

describe('compileDSL — image', () => {
  it('compiles image with url', () => {
    const result = compileDSL({
      blocks: [{ image: { url: 'https://example.com/img.png', alt: 'Chart' } }]
    });
    expect(result.blocks![0]).toMatchObject({
      type: 'image',
      image_url: 'https://example.com/img.png',
      alt_text: 'Chart',
    });
  });

  it('compiles image with title', () => {
    const result = compileDSL({
      blocks: [{ image: { url: 'https://x.com/a.png', alt: 'x', title: 'My image' } }]
    });
    const block = result.blocks![0] as Record<string, unknown>;
    expect((block.title as Record<string, unknown>).text).toBe('My image');
  });

  it('compiles image with slack_file', () => {
    const result = compileDSL({
      blocks: [{ image: { slack_file: 'F12345', alt: 'File image' } }]
    });
    const block = result.blocks![0] as Record<string, unknown>;
    expect(block.slack_file).toEqual({ url: 'F12345' });
    expect(block.image_url).toBeUndefined();
  });
});

// ─── video ────────────────────────────────────────────────────────────────────

describe('compileDSL — video', () => {
  it('compiles video block', () => {
    const result = compileDSL({
      blocks: [{
        video: {
          url: 'https://youtube.com/watch?v=abc',
          thumbnail: 'https://img.youtube.com/vi/abc/0.jpg',
          alt: 'Demo',
          title: 'Feature walkthrough',
          provider: 'YouTube',
        }
      }]
    });
    const block = result.blocks![0] as Record<string, unknown>;
    expect(block.type).toBe('video');
    expect(block.video_url).toBe('https://youtube.com/watch?v=abc');
    expect(block.provider_name).toBe('YouTube');
    expect((block.title as Record<string, unknown>).text).toBe('Feature walkthrough');
  });
});

// ─── markdown ─────────────────────────────────────────────────────────────────

describe('compileDSL — markdown', () => {
  it('compiles markdown block', () => {
    const result = compileDSL({ blocks: [{ markdown: '## Hello\nWorld' }] });
    expect(result.blocks![0]).toEqual({ type: 'markdown', text: '## Hello\nWorld' });
  });
});

// ─── file ─────────────────────────────────────────────────────────────────────

describe('compileDSL — file', () => {
  it('compiles file block', () => {
    const result = compileDSL({ blocks: [{ file: { external_id: 'ext123' } }] });
    expect(result.blocks![0]).toEqual({
      type: 'file',
      external_id: 'ext123',
      source: 'remote',
    });
  });
});

// ─── table ────────────────────────────────────────────────────────────────────

describe('compileDSL — table', () => {
  it('compiles table block', () => {
    const result = compileDSL({
      blocks: [{
        table: {
          columns: [{ label: 'Service', align: 'left' }, { label: 'Status', align: 'center' }],
          rows: [['api', ':green:'], ['db', ':red:']],
        }
      }]
    });
    const block = result.blocks![0] as Record<string, unknown>;
    expect(block.type).toBe('table');
    expect(block.column_settings).toHaveLength(2);
    expect(block.rows).toHaveLength(2);
  });
});

// ─── raw escape hatch ─────────────────────────────────────────────────────────

describe('compileDSL — raw escape hatch', () => {
  it('passes raw block through unchanged', () => {
    const rawBlock = {
      type: 'rich_text',
      elements: [{ type: 'rich_text_section', elements: [{ type: 'text', text: 'hello' }] }],
    };
    const result = compileDSL({ blocks: [{ raw: rawBlock }] });
    expect(result.blocks![0]).toEqual(rawBlock);
  });

  it('passes legacy raw Block Kit block through unchanged', () => {
    const legacyBlock = {
      type: 'section',
      text: { type: 'mrkdwn', text: 'legacy' },
    };
    const result = compileDSL({ blocks: [legacyBlock as never] });
    expect(result.blocks![0]).toEqual(legacyBlock);
  });

  it('compiles raw element inside actions', () => {
    const rawEl = { type: 'workflow_button', text: { type: 'plain_text', text: 'Run' }, action_id: 'wf' };
    const result = compileDSL({
      blocks: [{
        actions: {
          elements: [{ raw: rawEl }]
        }
      }]
    });
    const block = result.blocks![0] as Record<string, unknown>;
    expect((block.elements as Record<string, unknown>[])[0]).toEqual(rawEl);
  });
});

// ─── top-level message fields ─────────────────────────────────────────────────

describe('compileDSL — top-level fields', () => {
  it('passes through text, thread_ts, reply_broadcast', () => {
    const result = compileDSL({
      text: 'Fallback',
      thread_ts: '12345.678',
      reply_broadcast: true,
      blocks: [{ divider: true }],
    });
    expect(result.text).toBe('Fallback');
    expect(result.thread_ts).toBe('12345.678');
    expect(result.reply_broadcast).toBe(true);
  });

  it('passes through unfurl flags', () => {
    const result = compileDSL({ unfurl_links: false, unfurl_media: true });
    expect(result.unfurl_links).toBe(false);
    expect(result.unfurl_media).toBe(true);
  });
});
