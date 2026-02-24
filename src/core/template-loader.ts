import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import type { PigeonTemplate } from '../types.js';

const YAML_EXTS = ['.yml', '.yaml'];
const JSON_EXTS = ['.json'];

function parseContent(filePath: string, content: string): PigeonTemplate {
  const ext = path.extname(filePath).toLowerCase();
  if (YAML_EXTS.includes(ext)) {
    return yaml.load(content) as PigeonTemplate;
  }
  if (JSON_EXTS.includes(ext)) {
    return JSON.parse(content) as PigeonTemplate;
  }
  // Fallback: try YAML first, then JSON
  try {
    return yaml.load(content) as PigeonTemplate;
  } catch {
    return JSON.parse(content) as PigeonTemplate;
  }
}

export async function loadTemplate(filePath: string): Promise<PigeonTemplate> {
  const resolved = path.resolve(filePath);
  let content: string;
  try {
    content = await fs.readFile(resolved, 'utf-8');
  } catch {
    throw new Error(`Template not found: ${filePath}`);
  }
  return parseContent(resolved, content);
}
