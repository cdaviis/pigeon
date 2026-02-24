import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import type { PigeonTemplate } from '../../types.js';

const ALL_EXTS = ['.yml', '.yaml', '.json'];

export function listCommand(): Command {
  const cmd = new Command('list');

  cmd
    .description('List templates in a directory')
    .argument('<dir>', 'Directory containing templates')
    .option('--json', 'Output as JSON')
    .action(async (dir: string, opts: { json?: boolean }) => {
      const resolved = path.resolve(dir);
      let entries: string[];
      try {
        const dirEntries = await fs.readdir(resolved);
        entries = dirEntries.filter(e => ALL_EXTS.some(ext => e.endsWith(ext)));
      } catch {
        console.error(chalk.red('✗'), `Directory not found: ${dir}`);
        process.exit(1);
        return;
      }

      const results: Array<{ file: string; name: string; description?: string }> = [];
      for (const entry of entries) {
        const filePath = path.join(resolved, entry);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const ext = path.extname(filePath).toLowerCase();
          const template = (ext === '.json'
            ? JSON.parse(content)
            : yaml.load(content)) as PigeonTemplate;
          results.push({ file: filePath, name: template.name ?? entry, description: template.description });
        } catch {
          results.push({ file: filePath, name: entry });
        }
      }

      if (opts.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      if (results.length === 0) {
        console.log(chalk.yellow(`No templates found in ${dir}`));
        return;
      }

      console.log(chalk.bold(`\nTemplates in ${chalk.cyan(dir)}:\n`));
      const maxFile = Math.max(...results.map(t => t.file.length));
      for (const t of results) {
        const file = chalk.cyan(t.file.padEnd(maxFile + 2));
        const name = chalk.white(t.name);
        const desc = t.description ? chalk.gray(`  — ${t.description}`) : '';
        console.log(`  ${file}${name}${desc}`);
      }
      console.log(`\nRun ${chalk.bold('pigeon send <path> --dry-run')} to preview a template.\n`);
    });

  return cmd;
}
