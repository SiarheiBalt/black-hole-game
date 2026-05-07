import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const here = path.dirname(fileURLToPath(import.meta.url));

export const PATHS = {
  toolDir: here,
  briefsDir: path.join(here, 'briefs'),
  runsRoot: path.join(here, 'runs'),
  repoRoot: path.resolve(here, '..', '..'),
  assetsThemesDir: path.resolve(here, '..', '..', 'src', 'assets', 'themes'),
  generatedThemesDir: path.resolve(here, '..', '..', 'src', 'themes', 'generated'),
  packageJson: path.resolve(here, '..', '..', 'package.json'),
  distDir: path.resolve(here, '..', '..', 'dist'),
};

export const ICON_KINDS = /** @type {const} */ (['trump', 'money', 'poop']);

const LEVEL_COLORS = {
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  ok: '\x1b[32m',
  dim: '\x1b[2m',
};
const RESET = '\x1b[0m';

export function log(level, ...parts) {
  const prefix = `${LEVEL_COLORS[level] ?? ''}[theme-gen:${level}]${RESET}`;
  // eslint-disable-next-line no-console
  console.log(prefix, ...parts);
}

export async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

export async function writeFile(p, data) {
  await ensureDir(path.dirname(p));
  await fs.writeFile(p, data);
}

export async function readJson(p) {
  const txt = await fs.readFile(p, 'utf8');
  return JSON.parse(txt);
}

export async function writeJson(p, value) {
  await ensureDir(path.dirname(p));
  await fs.writeFile(p, JSON.stringify(value, null, 2) + '\n');
}

export function timestamp() {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .replace('Z', '');
}

export function hexFromRgb([r, g, b]) {
  const v = ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
  return `0x${v.toString(16).padStart(6, '0')}`;
}

export function hexNumber([r, g, b]) {
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

/**
 * @param {string} id
 * @returns {string} sanitized lowercase id usable as a filename and JS identifier suffix
 */
export function validateId(id) {
  if (typeof id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(id)) {
    throw new Error(
      `Invalid theme id "${id}". Use lowercase letters, digits and "_", starting with a letter.`,
    );
  }
  return id;
}
