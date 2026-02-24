import { Command } from 'commander';
import chalk from 'chalk';
import { dispatch } from '../../core/dispatcher.js';

function parseVars(value: string, prev: Record<string, string>): Record<string, string> {
  const eqIndex = value.indexOf('=');
  if (eqIndex === -1) {
    throw new Error(`Invalid --var format "${value}" — expected key=value`);
  }
  const key = value.slice(0, eqIndex).trim();
  const val = value.slice(eqIndex + 1);
  if (!key) {
    throw new Error(`Invalid --var format "${value}" — key cannot be empty`);
  }
  return { ...prev, [key]: val };
}

export function sendCommand(): Command {
  const cmd = new Command('send');

  cmd
    .description('Send a message using a template')
    .argument('<template>', 'Path to template file')
    .option('-v, --var <key=value>', 'Set a template variable (repeatable)', parseVars, {})
    .option('--dry-run', 'Print the resolved payload without sending')
    .option('--json', 'Output result as JSON (for scripting)')
    .option('--config <file>', 'Path to credentials config file')
    .option('-e, --env-file <file>', 'Load a .env file for credentials')
    .action(async (template: string, opts: {
      var: Record<string, string>;
      dryRun?: boolean;
      json?: boolean;
      config?: string;
      envFile?: string;
    }) => {
      try {
        const result = await dispatch(template, {
          vars: opts.var,
          dryRun: opts.dryRun,
          configFile: opts.config,
          envFile: opts.envFile,
        });

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        if (opts.dryRun) {
          console.log(chalk.yellow('Dry run — resolved payload:'));
          console.log(JSON.stringify(result.resolvedMessage, null, 2));
          return;
        }

        console.log(
          chalk.green('✓'),
          `Message sent via ${chalk.bold(result.service)} (template: ${chalk.bold(result.templateName)})`
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (opts.json) {
          console.log(JSON.stringify({ success: false, error: message }, null, 2));
        } else {
          console.error(chalk.red('✗'), message);
        }
        process.exit(1);
      }
    });

  return cmd;
}
