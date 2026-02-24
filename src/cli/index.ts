#!/usr/bin/env node
import { Command } from 'commander';
import { sendCommand } from './commands/send.js';
import { listCommand } from './commands/list.js';
import { validateCommand } from './commands/validate.js';

const program = new Command();

program
  .name('pigeon')
  .description('Template-first messaging tool for Slack, Notion, and more')
  .version('0.1.0');

program.addCommand(sendCommand());
program.addCommand(listCommand());
program.addCommand(validateCommand());

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\nError: ${message}\n`);
  process.exit(1);
});
