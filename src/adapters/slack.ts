import fs from 'node:fs/promises';
import ky from 'ky';
import type { ServiceAdapter } from '../types.js';
import { AdapterValidationError, MissingCredentialsError } from '../types.js';
import { isDSLMessage, compileDSL } from './slack-dsl.js';
import type { DSLFileUpload } from './slack-dsl.js';

const SLACK_POST_MESSAGE_URL = 'https://slack.com/api/chat.postMessage';
const SLACK_UPLOAD_URL_EXTERNAL = 'https://slack.com/api/files.getUploadURLExternal';
const SLACK_COMPLETE_UPLOAD_URL = 'https://slack.com/api/files.completeUploadExternal';

async function post(url: string, body: unknown, headers: Record<string, string>): Promise<unknown> {
  const response = await ky.post(url, { json: body, headers, throwHttpErrors: true });
  return response.json();
}

export class SlackAdapter implements ServiceAdapter {
  readonly serviceName = 'slack';

  compile(message: Record<string, unknown>): Record<string, unknown> {
    return isDSLMessage(message)
      ? compileDSL(message as Parameters<typeof compileDSL>[0]) as Record<string, unknown>
      : message;
  }

  validate(message: Record<string, unknown>): void {
    if (!message.blocks && !message.text) {
      throw new AdapterValidationError(
        this.serviceName,
        'message must have either "blocks" or "text"'
      );
    }
    if (message.blocks !== undefined && !Array.isArray(message.blocks)) {
      throw new AdapterValidationError(this.serviceName, '"blocks" must be an array');
    }
  }

  async send(
    message: Record<string, unknown>,
    destination: Record<string, unknown>,
    credentials: Record<string, string>
  ): Promise<unknown> {
    const token = credentials.botToken;
    if (!token) {
      throw new MissingCredentialsError('slack', 'botToken');
    }

    const channel = destination.channel as string | undefined;
    if (!channel) {
      throw new AdapterValidationError(this.serviceName, 'destination.channel is required');
    }

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Handle file uploads before sending the message
    const files = destination.files as DSLFileUpload[] | undefined;
    if (files && files.length > 0) {
      await uploadFiles(files, channel, token);
    }

    const payload = { channel, ...message };
    const result = await post(SLACK_POST_MESSAGE_URL, payload, authHeaders) as Record<string, unknown>;

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error ?? 'unknown error'}`);
    }

    return result;
  }
}

async function uploadFiles(files: DSLFileUpload[], channel: string, token: string): Promise<void> {
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  for (const file of files) {
    const content = await fs.readFile(file.path);
    const filename = file.filename ?? file.path.split('/').pop() ?? 'file';
    const length = content.byteLength;

    // Step 1: Get upload URL
    const urlResult = await post(
      SLACK_UPLOAD_URL_EXTERNAL,
      { filename, length },
      authHeaders
    ) as Record<string, unknown>;

    if (!urlResult.ok) {
      throw new Error(`Slack file upload error (getUploadURL): ${urlResult.error ?? 'unknown'}`);
    }

    const uploadUrl = urlResult.upload_url as string;
    const fileId = urlResult.file_id as string;

    // Step 2: Upload file content to the provided URL
    await post(uploadUrl, content, { 'Content-Type': 'application/octet-stream' });

    // Step 3: Complete upload and share to channel
    const completeResult = await post(
      SLACK_COMPLETE_UPLOAD_URL,
      {
        files: [{ id: fileId, title: file.title ?? filename }],
        channel_id: channel,
        ...(file.alt_text ? { initial_comment: file.alt_text } : {}),
      },
      authHeaders
    ) as Record<string, unknown>;

    if (!completeResult.ok) {
      throw new Error(`Slack file upload error (completeUpload): ${completeResult.error ?? 'unknown'}`);
    }
  }
}
