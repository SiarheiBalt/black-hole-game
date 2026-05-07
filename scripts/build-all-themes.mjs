#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Keep in sync with `package.json` `build:<id>` scripts. */
const THEME_IDS = [
  'city',
  'fr_chic',
  'global_fiesta',
  'jp_kawaii',
  'kr_sea_pop',
  'space',
  'uk_pub',
  'zh_urban',
];

for (const id of THEME_IDS) {
  console.log(`\n>>> vite build (VITE_THEME=${id})\n`);
  const r = spawnSync(
    'npx',
    ['cross-env', `VITE_THEME=${id}`, 'vite', 'build'],
    { cwd: root, stdio: 'inherit', shell: true },
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
}
