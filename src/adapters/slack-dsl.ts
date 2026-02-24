// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConfirmDialog {
  title: string;
  text: string;
  confirm: string;
  deny: string;
  style?: 'primary' | 'danger';
}

export interface OptionItem {
  text: string;
  value?: string;
  url?: string;
  description?: string;
}

export interface ButtonElement {
  text: string;
  url?: string;
  action_id?: string;
  value?: string;
  style?: 'primary' | 'danger';
  confirm?: ConfirmDialog;
  accessibility_label?: string;
}

export interface OverflowElement {
  action_id?: string;
  options: OptionItem[];
}

export interface DatepickerElement {
  action_id?: string;
  placeholder?: string;
  initial_date?: string;
}

export interface TimepickerElement {
  action_id?: string;
  placeholder?: string;
  initial_time?: string;
  timezone?: string;
}

export interface SelectElement {
  action_id?: string;
  placeholder?: string;
  options: OptionItem[];
}

export interface MultiSelectElement {
  action_id?: string;
  placeholder?: string;
  options: OptionItem[];
}

export type DSLElement =
  | { button: ButtonElement }
  | { overflow: OverflowElement }
  | { datepicker: DatepickerElement }
  | { timepicker: TimepickerElement }
  | { select: SelectElement }
  | { multi_select: MultiSelectElement }
  | { raw: Record<string, unknown> };

export type HeaderBlock = string | { text: string; block_id?: string };
export type DividerBlock = true;

export interface SectionBlock {
  text?: string;
  fields?: string[];
  block_id?: string;
  accessory?: DSLElement;
}

export type ContextItem =
  | string
  | { image: { url?: string; slack_file?: string; alt: string } };

export interface ContextBlock {
  elements?: ContextItem[];
  block_id?: string;
}

export type ContextBlockInput = ContextItem[] | ContextBlock;

export interface ActionsBlock {
  elements: DSLElement[];
  block_id?: string;
}

export interface ImageBlock {
  url?: string;
  slack_file?: string;
  alt: string;
  title?: string;
  block_id?: string;
}

export interface VideoBlock {
  url: string;
  thumbnail: string;
  alt: string;
  title: string;
  description?: string;
  provider?: string;
  title_url?: string;
  block_id?: string;
}

export type MarkdownBlock = string;

export interface FileBlock {
  external_id: string;
  block_id?: string;
}

export interface TableColumn {
  label?: string;
  align?: 'left' | 'center' | 'right';
  is_wrapped?: boolean;
}

export interface TableBlock {
  columns?: TableColumn[];
  rows: (string | Record<string, unknown>)[][];
  block_id?: string;
}

export type DSLBlock =
  | { header: HeaderBlock }
  | { divider: DividerBlock }
  | { section: SectionBlock }
  | { context: ContextBlockInput }
  | { actions: ActionsBlock }
  | { image: ImageBlock }
  | { video: VideoBlock }
  | { markdown: MarkdownBlock }
  | { file: FileBlock }
  | { table: TableBlock }
  | { raw: Record<string, unknown> }
  | { type: string; [key: string]: unknown };

export interface DSLFileUpload {
  path: string;
  filename?: string;
  title?: string;
  alt_text?: string;
}

export interface SlackDSLMessage {
  text?: string;
  blocks?: DSLBlock[];
  thread_ts?: string;
  reply_broadcast?: boolean;
  unfurl_links?: boolean;
  unfurl_media?: boolean;
}

// ─── Detection ───────────────────────────────────────────────────────────────

const SHORTHAND_BLOCK_KEYS = new Set([
  'header', 'divider', 'section', 'context', 'actions',
  'image', 'video', 'markdown', 'file', 'table', 'raw',
]);

/**
 * Returns true if the message uses the pigeon DSL shorthand.
 * A message is DSL if it has a `blocks` array where at least one item
 * has a known shorthand key rather than a `type` key.
 */
export function isDSLMessage(message: Record<string, unknown>): boolean {
  const blocks = message.blocks;
  if (!Array.isArray(blocks) || blocks.length === 0) return false;
  return blocks.some((block: unknown) => {
    if (typeof block !== 'object' || block === null) return false;
    const keys = Object.keys(block as object);
    return keys.some(k => SHORTHAND_BLOCK_KEYS.has(k));
  });
}

// ─── Composition helpers ──────────────────────────────────────────────────────

function plainText(text: string, emoji = true): Record<string, unknown> {
  return { type: 'plain_text', text, emoji };
}

function mrkdwn(text: string): Record<string, unknown> {
  return { type: 'mrkdwn', text };
}

function compileConfirm(confirm: ConfirmDialog): Record<string, unknown> {
  return {
    title: plainText(confirm.title),
    text: plainText(confirm.text),
    confirm: plainText(confirm.confirm),
    deny: plainText(confirm.deny),
    ...(confirm.style ? { style: confirm.style } : {}),
  };
}

function compileOption(opt: OptionItem): Record<string, unknown> {
  const result: Record<string, unknown> = {
    text: plainText(opt.text),
    value: opt.value ?? opt.text,
  };
  if (opt.url) result.url = opt.url;
  if (opt.description) result.description = plainText(opt.description);
  return result;
}

// ─── Element compilers ────────────────────────────────────────────────────────

function compileButton(btn: ButtonElement): Record<string, unknown> {
  const result: Record<string, unknown> = {
    type: 'button',
    text: plainText(btn.text),
  };
  if (btn.url) result.url = btn.url;
  if (btn.action_id) result.action_id = btn.action_id;
  if (btn.value) result.value = btn.value;
  if (btn.style) result.style = btn.style;
  if (btn.confirm) result.confirm = compileConfirm(btn.confirm);
  if (btn.accessibility_label) result.accessibility_label = btn.accessibility_label;
  return result;
}

function compileOverflow(el: OverflowElement): Record<string, unknown> {
  const result: Record<string, unknown> = {
    type: 'overflow',
    options: el.options.map(compileOption),
  };
  if (el.action_id) result.action_id = el.action_id;
  return result;
}

function compileDatepicker(el: DatepickerElement): Record<string, unknown> {
  const result: Record<string, unknown> = { type: 'datepicker' };
  if (el.action_id) result.action_id = el.action_id;
  if (el.placeholder) result.placeholder = plainText(el.placeholder);
  if (el.initial_date) result.initial_date = el.initial_date;
  return result;
}

function compileTimepicker(el: TimepickerElement): Record<string, unknown> {
  const result: Record<string, unknown> = { type: 'timepicker' };
  if (el.action_id) result.action_id = el.action_id;
  if (el.placeholder) result.placeholder = plainText(el.placeholder);
  if (el.initial_time) result.initial_time = el.initial_time;
  if (el.timezone) result.timezone = el.timezone;
  return result;
}

function compileSelect(el: SelectElement): Record<string, unknown> {
  const result: Record<string, unknown> = {
    type: 'static_select',
    options: el.options.map(compileOption),
  };
  if (el.action_id) result.action_id = el.action_id;
  if (el.placeholder) result.placeholder = plainText(el.placeholder);
  return result;
}

function compileMultiSelect(el: MultiSelectElement): Record<string, unknown> {
  const result: Record<string, unknown> = {
    type: 'multi_static_select',
    options: el.options.map(compileOption),
  };
  if (el.action_id) result.action_id = el.action_id;
  if (el.placeholder) result.placeholder = plainText(el.placeholder);
  return result;
}

function compileElement(el: DSLElement): Record<string, unknown> {
  if ('raw' in el) return el.raw;
  if ('button' in el) return compileButton(el.button);
  if ('overflow' in el) return compileOverflow(el.overflow);
  if ('datepicker' in el) return compileDatepicker(el.datepicker);
  if ('timepicker' in el) return compileTimepicker(el.timepicker);
  if ('select' in el) return compileSelect(el.select);
  if ('multi_select' in el) return compileMultiSelect(el.multi_select);
  // Exhaustive — TypeScript ensures this
  throw new Error(`Unknown element type: ${JSON.stringify(el)}`);
}

// ─── Block compilers ──────────────────────────────────────────────────────────

function compileHeader(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    return { type: 'header', text: plainText(value, true) };
  }
  const v = value as { text: string; block_id?: string };
  return {
    type: 'header',
    text: plainText(v.text, true),
    ...(v.block_id ? { block_id: v.block_id } : {}),
  };
}

function compileDivider(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && 'block_id' in value) {
    return { type: 'divider', block_id: (value as { block_id: string }).block_id };
  }
  return { type: 'divider' };
}

function compileSection(value: unknown): Record<string, unknown> {
  const v = value as {
    text?: string;
    fields?: string[];
    block_id?: string;
    accessory?: DSLElement;
  };
  const result: Record<string, unknown> = { type: 'section' };
  if (v.text) result.text = mrkdwn(v.text);
  if (v.fields) result.fields = v.fields.map(mrkdwn);
  if (v.block_id) result.block_id = v.block_id;
  if (v.accessory) result.accessory = compileElement(v.accessory);
  return result;
}

function compileContextItem(item: ContextItem): Record<string, unknown> {
  if (typeof item === 'string') {
    return mrkdwn(item);
  }
  // image item
  const img = item.image;
  const result: Record<string, unknown> = { type: 'image', alt_text: img.alt };
  if (img.url) result.image_url = img.url;
  if (img.slack_file) result.slack_file = { url: img.slack_file };
  return result;
}

function compileContext(value: unknown): Record<string, unknown> {
  // value can be an array of items directly, or { elements, block_id }
  let items: ContextItem[];
  let blockId: string | undefined;

  if (Array.isArray(value)) {
    items = value as ContextItem[];
  } else {
    const v = value as { elements?: ContextItem[]; block_id?: string };
    items = v.elements ?? [];
    blockId = v.block_id;
  }

  return {
    type: 'context',
    elements: items.map(compileContextItem),
    ...(blockId ? { block_id: blockId } : {}),
  };
}

function compileActions(value: unknown): Record<string, unknown> {
  const v = value as { elements: DSLElement[]; block_id?: string };
  return {
    type: 'actions',
    elements: v.elements.map(compileElement),
    ...(v.block_id ? { block_id: v.block_id } : {}),
  };
}

function compileImage(value: unknown): Record<string, unknown> {
  const v = value as {
    url?: string;
    slack_file?: string;
    alt: string;
    title?: string;
    block_id?: string;
  };
  const result: Record<string, unknown> = { type: 'image', alt_text: v.alt };
  if (v.url) result.image_url = v.url;
  if (v.slack_file) result.slack_file = { url: v.slack_file };
  if (v.title) result.title = plainText(v.title);
  if (v.block_id) result.block_id = v.block_id;
  return result;
}

function compileVideo(value: unknown): Record<string, unknown> {
  const v = value as {
    url: string;
    thumbnail: string;
    alt: string;
    title: string;
    description?: string;
    provider?: string;
    title_url?: string;
    block_id?: string;
  };
  const result: Record<string, unknown> = {
    type: 'video',
    video_url: v.url,
    thumbnail_url: v.thumbnail,
    alt_text: v.alt,
    title: plainText(v.title),
  };
  if (v.description) result.description = plainText(v.description);
  if (v.provider) result.provider_name = v.provider;
  if (v.title_url) result.title_url = v.title_url;
  if (v.block_id) result.block_id = v.block_id;
  return result;
}

function compileMarkdown(value: unknown): Record<string, unknown> {
  return { type: 'markdown', text: String(value) };
}

function compileFile(value: unknown): Record<string, unknown> {
  const v = value as { external_id: string; block_id?: string };
  return {
    type: 'file',
    external_id: v.external_id,
    source: 'remote',
    ...(v.block_id ? { block_id: v.block_id } : {}),
  };
}

function compileTable(value: unknown): Record<string, unknown> {
  const v = value as {
    columns?: Array<{ label?: string; align?: string; is_wrapped?: boolean }>;
    rows: unknown[][];
    block_id?: string;
  };
  const result: Record<string, unknown> = {
    type: 'table',
    rows: v.rows,
  };
  if (v.columns) result.column_settings = v.columns;
  if (v.block_id) result.block_id = v.block_id;
  return result;
}

function compileBlock(block: DSLBlock): Record<string, unknown> {
  // Legacy raw Block Kit: has `type` directly
  if ('type' in block) return block as Record<string, unknown>;

  // Escape hatch
  if ('raw' in block) return block.raw;

  if ('header' in block) return compileHeader(block.header);
  if ('divider' in block) return compileDivider(block.divider);
  if ('section' in block) return compileSection(block.section);
  if ('context' in block) return compileContext(block.context);
  if ('actions' in block) return compileActions(block.actions);
  if ('image' in block) return compileImage(block.image);
  if ('video' in block) return compileVideo(block.video);
  if ('markdown' in block) return compileMarkdown(block.markdown);
  if ('file' in block) return compileFile(block.file);
  if ('table' in block) return compileTable(block.table);

  throw new Error(`Unknown block: ${JSON.stringify(block)}`);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface CompiledSlackPayload {
  text?: string;
  blocks?: Record<string, unknown>[];
  thread_ts?: string;
  reply_broadcast?: boolean;
  unfurl_links?: boolean;
  unfurl_media?: boolean;
}

export function compileDSL(message: SlackDSLMessage): CompiledSlackPayload {
  const result: CompiledSlackPayload = {};

  if (message.text) result.text = message.text;
  if (message.thread_ts) result.thread_ts = message.thread_ts;
  if (message.reply_broadcast !== undefined) result.reply_broadcast = message.reply_broadcast;
  if (message.unfurl_links !== undefined) result.unfurl_links = message.unfurl_links;
  if (message.unfurl_media !== undefined) result.unfurl_media = message.unfurl_media;

  if (message.blocks) {
    result.blocks = message.blocks.map(compileBlock);
  }

  return result;
}
