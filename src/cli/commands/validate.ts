import { Command } from 'commander';
import chalk from 'chalk';
import { loadTemplate } from '../../core/template-loader.js';
import { validateSchema } from '../../core/validator.js';

export function validateCommand(): Command {
  const cmd = new Command('validate');

  cmd
    .description('Validate a template without sending')
    .argument('<template>', 'Path to template file')
    .option('--json', 'Output result as JSON')
    .action(async (template: string, opts: { json?: boolean }) => {
      try {
        const loaded = await loadTemplate(template);
        validateSchema(loaded);

        // Check variables section is consistent (no required=true with a default)
        const variables = loaded.variables ?? {};
        const warnings: string[] = [];
        for (const [key, decl] of Object.entries(variables)) {
          if (decl.required === true && decl.default !== undefined) {
            warnings.push(`Variable "${key}" is marked required but has a default — default will be used when not provided`);
          }
        }

        if (opts.json) {
          console.log(JSON.stringify({ valid: true, template: loaded.name, warnings }, null, 2));
          return;
        }

        console.log(chalk.green('✓'), `Template ${chalk.bold(loaded.name)} is valid`);
        console.log(`  Service: ${chalk.cyan(loaded.destination.service)}`);
        const varCount = Object.keys(variables).length;
        if (varCount > 0) {
          console.log(`  Variables: ${varCount}`);
          for (const [key, decl] of Object.entries(variables)) {
            const req = decl.required !== false && decl.default === undefined ? chalk.red('required') : chalk.gray('optional');
            const def = decl.default ? chalk.gray(` [default: ${decl.default}]`) : '';
            console.log(`    ${chalk.bold(key)} (${req})${def}`);
          }
        }
        for (const w of warnings) {
          console.log(chalk.yellow(`  ⚠ ${w}`));
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (opts.json) {
          console.log(JSON.stringify({ valid: false, error: message }, null, 2));
        } else {
          console.error(chalk.red('✗'), message);
        }
        process.exit(1);
      }
    });

  return cmd;
}
