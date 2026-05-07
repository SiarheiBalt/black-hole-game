#!/usr/bin/env node
// Generate per-theme background music as gapless MP3 loops, free + offline.
//
// Pipeline (per theme):
//   spawn `python3 tools/music-gen/musicgen.py` → mono 32 kHz WAV
//   → ffmpeg trim + acrossfade + loudnorm → mono 96 kbps MP3
//
// Usage:
//   node tools/music-gen/cli.mjs                   # all themes
//   node tools/music-gen/cli.mjs space jp_kawaii   # specific themes
//   FORCE=1 node tools/music-gen/cli.mjs           # overwrite existing files
//   node tools/music-gen/cli.mjs --dry-run         # print prompts and exit
//
// Output: src/assets/themes/<id>/music.mp3
// Cache:  tools/music-gen/.cache/<id>.json (records last successful spec)
//
// Requires: python3 with `torch transformers scipy` installed (see
// `tools/music-gen/requirements.txt`) and `ffmpeg` + `ffprobe` in PATH.

import { spawnSync, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MUSIC_SPECS } from './themes.mjs';
import { makeGaplessLoopMp3 } from './postprocess.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ASSETS_ROOT = path.join(REPO_ROOT, 'src', 'assets', 'themes');
const CACHE_DIR = path.join(__dirname, '.cache');
const PYTHON_SCRIPT = path.join(__dirname, 'musicgen.py');
const PYTHON_BIN = process.env.PYTHON || 'python3';

function parseArgs(argv) {
  const themes = [];
  let dryRun = false;
  for (const a of argv) {
    if (a === '--dry-run' || a === '-n') dryRun = true;
    else if (a === '--force') process.env.FORCE = '1';
    else if (!a.startsWith('-')) themes.push(a);
  }
  return { themes, dryRun };
}

function specFingerprint(spec) {
  const json = JSON.stringify({
    prompt: spec.prompt,
    duration: spec.duration,
    seed: spec.seed ?? null,
    model: spec.model ?? 'facebook/musicgen-small',
  });
  return createHash('sha1').update(json).digest('hex').slice(0, 12);
}

function ensureBinary(bin, args = ['-version']) {
  try {
    execFileSync(bin, args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkPrereqs() {
  if (!ensureBinary('ffmpeg')) {
    console.error('[music-gen] ffmpeg not found in PATH. Install (e.g. `brew install ffmpeg`).');
    process.exit(2);
  }
  if (!ensureBinary('ffprobe')) {
    console.error('[music-gen] ffprobe not found in PATH (usually ships with ffmpeg).');
    process.exit(2);
  }
  if (!ensureBinary(PYTHON_BIN, ['--version'])) {
    console.error(`[music-gen] python3 not found (looked for "${PYTHON_BIN}"). Set $PYTHON to override.`);
    process.exit(2);
  }
  // Confirm transformers + torch are importable; print a clean install hint otherwise.
  const probe = spawnSync(PYTHON_BIN, ['-c', 'import torch, transformers, scipy.io.wavfile'], {
    stdio: 'pipe',
  });
  if (probe.status !== 0) {
    console.error(
      '[music-gen] missing Python deps. Install with:\n' +
        `  ${PYTHON_BIN} -m pip install -r tools/music-gen/requirements.txt`,
    );
    if (probe.stderr?.length) console.error(probe.stderr.toString().trim());
    process.exit(2);
  }
}

function readCache(id) {
  const p = path.join(CACHE_DIR, `${id}.json`);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function writeCache(id, payload) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(path.join(CACHE_DIR, `${id}.json`), JSON.stringify(payload, null, 2));
}

function runPython(spec, rawWavPath) {
  const args = [
    PYTHON_SCRIPT,
    '--prompt', spec.prompt,
    '--duration', String(spec.duration ?? 24),
    '--output', rawWavPath,
  ];
  if (spec.seed != null) args.push('--seed', String(spec.seed));
  if (spec.model) args.push('--model', spec.model);
  const r = spawnSync(PYTHON_BIN, args, { stdio: 'inherit' });
  if (r.status !== 0) {
    throw new Error(`musicgen.py exited with status ${r.status}`);
  }
}

function generateOne(id, spec, { force }) {
  const outDir = path.join(ASSETS_ROOT, id);
  mkdirSync(outDir, { recursive: true });
  const finalPath = path.join(outDir, 'music.mp3');
  const rawPath = path.join(outDir, '.raw.wav');

  const fp = specFingerprint(spec);
  const cached = readCache(id);

  if (existsSync(finalPath) && !force && cached?.fingerprint === fp) {
    console.log(`[music-gen] ${id}: up to date (${fp}), skipping (FORCE=1 to regenerate)`);
    return { skipped: true };
  }

  console.log(`[music-gen] ${id}: prompt="${spec.prompt}"`);
  runPython(spec, rawPath);

  process.stdout.write(`[music-gen] ${id}: postprocess (loop+normalize)…`);
  const { inputDurationSec, outputDurationSec } = makeGaplessLoopMp3({
    inputPath: rawPath,
    outputPath: finalPath,
  });
  rmSync(rawPath, { force: true });
  console.log(
    ` ✓ ${path.relative(REPO_ROOT, finalPath)} (in=${inputDurationSec.toFixed(1)}s → out=${outputDurationSec.toFixed(1)}s)`,
  );
  writeCache(id, { id, fingerprint: fp, prompt: spec.prompt, savedAt: new Date().toISOString() });
  return { skipped: false };
}

async function main() {
  const { themes: argThemes, dryRun } = parseArgs(process.argv.slice(2));
  const themes = argThemes.length ? argThemes : Object.keys(MUSIC_SPECS);

  if (dryRun) {
    for (const id of themes) {
      const spec = MUSIC_SPECS[id];
      if (!spec) {
        console.warn(`[music-gen] unknown theme '${id}'`);
        continue;
      }
      console.log(`[music-gen] ${id} (${spec._hint ?? ''})`);
      console.log(`  prompt: ${spec.prompt}`);
      console.log(`  duration=${spec.duration ?? 24}s seed=${spec.seed ?? '(random)'}`);
    }
    return;
  }

  checkPrereqs();

  const force = process.env.FORCE === '1';
  let okCount = 0;
  let skipCount = 0;
  const failures = [];

  for (const id of themes) {
    const spec = MUSIC_SPECS[id];
    if (!spec) {
      console.warn(`[music-gen] unknown theme '${id}' — skipping`);
      continue;
    }
    try {
      const r = generateOne(id, spec, { force });
      if (r.skipped) skipCount += 1;
      else okCount += 1;
    } catch (err) {
      console.error(`[music-gen] ${id}: FAILED — ${err?.stack ?? err}`);
      failures.push(id);
    }
  }

  console.log(
    `[music-gen] done — generated ${okCount}, skipped ${skipCount}, failed ${failures.length}`,
  );
  if (failures.length) process.exit(1);
}

main().catch((err) => {
  console.error('[music-gen] fatal:', err?.stack ?? err);
  process.exit(1);
});
