#!/usr/bin/env node
/**
 * Build every showcase theme with the Attack Hole brand (VITE_BRAND=attack_hole),
 * upload each resulting dist/index.html to Stashy, publish it, and emit a JSON
 * mapping of { themeId -> { id, url } } so the showcase can be rewritten.
 *
 * Auth: reads the first non-empty line of `.env` as the Stashy bearer token.
 * Endpoints (see https://files.alconost.com/openapi.yaml):
 *   POST /v1/files                — upload raw binary, returns { id, url }
 *   POST /v1/files/{id}/publish   — make the file publicly accessible
 *
 * Run with: node tools/upload-homa-builds.mjs
 */
import { spawn } from 'node:child_process';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const distFile = resolve(repoRoot, 'dist/index.html');
const envFile = resolve(repoRoot, '.env');
const outFile = resolve(repoRoot, 'tools/homa-build-urls.json');

const STASHY_BASE = 'https://files.alconost.com';

const THEMES = [
  { id: 'default', script: 'build:default:homa' },
  { id: 'space', script: 'build:space:homa' },
  { id: 'city', script: 'build:city:homa' },
  { id: 'global_fiesta', script: 'build:global_fiesta:homa' },
  { id: 'jp_kawaii', script: 'build:jp_kawaii:homa' },
  { id: 'kr_sea_pop', script: 'build:kr_sea_pop:homa' },
  { id: 'uk_pub', script: 'build:uk_pub:homa' },
  { id: 'zh_urban', script: 'build:zh_urban:homa' },
];

async function readToken() {
  const raw = await readFile(envFile, 'utf8');
  const firstLine = raw.split(/\r?\n/).find((l) => l.trim().length > 0);
  if (!firstLine) throw new Error('.env is empty — expected Stashy token on line 1.');
  return firstLine.trim();
}

function runNpm(script) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn('npm', ['run', script], {
      cwd: repoRoot,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('error', rejectPromise);
    child.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`npm run ${script} exited with code ${code}`));
    });
  });
}

async function uploadFile(token, themeId, body) {
  const res = await fetch(`${STASHY_BASE}/v1/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/html; charset=utf-8',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Upload failed for ${themeId} — HTTP ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (!json.id || !json.url) {
    throw new Error(`Upload response missing id/url for ${themeId}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function publishFile(token, id) {
  const res = await fetch(`${STASHY_BASE}/v1/files/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Publish failed for ${id} — HTTP ${res.status}: ${text}`);
  }
}

async function main() {
  const token = await readToken();
  console.log(`[homa] Loaded Stashy token (${token.length} chars).`);

  const mapping = {};

  for (const theme of THEMES) {
    console.log(`\n[homa] ===== ${theme.id} =====`);
    console.log(`[homa] Building ${theme.id} (npm run ${theme.script})…`);
    const buildStart = Date.now();
    await runNpm(theme.script);
    const buildMs = Date.now() - buildStart;

    const info = await stat(distFile);
    console.log(
      `[homa] Built in ${buildMs}ms — dist/index.html is ${(info.size / 1024).toFixed(1)} KB.`,
    );

    const bytes = await readFile(distFile);
    console.log(`[homa] Uploading ${theme.id} (${bytes.length} bytes)…`);
    const uploadStart = Date.now();
    const uploaded = await uploadFile(token, theme.id, bytes);
    const uploadMs = Date.now() - uploadStart;
    console.log(`[homa] Uploaded ${theme.id} in ${uploadMs}ms → id=${uploaded.id}`);

    console.log(`[homa] Publishing ${theme.id}…`);
    await publishFile(token, uploaded.id);

    mapping[theme.id] = {
      id: uploaded.id,
      url: uploaded.url,
      bundleBytes: bytes.length,
    };
    console.log(`[homa] ✓ ${theme.id} → ${uploaded.url}`);

    await writeFile(outFile, JSON.stringify(mapping, null, 2));
  }

  console.log('\n[homa] All builds uploaded.');
  console.log(`[homa] Mapping written to ${outFile}`);
}

main().catch((err) => {
  console.error('\n[homa] FAILED:', err.message);
  process.exitCode = 1;
});
