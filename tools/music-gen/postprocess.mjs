// Make a downloaded MP3 reliably gapless when looped under Howler/Web Audio.
//
// Even with Mubert's `mode: "loop"` the seam can have a tiny click. We:
//   1) probe the duration with ffprobe
//   2) trim to the nearest whole second (so the loop length is musical-ish
//      and reproducible)
//   3) split [head | tail] and acrossfade them so the end melts back into
//      the start (loop-bouncing) — produces a track of length `trimmed - xfade`
//   4) loudness-normalize to -16 LUFS, mono, 96 kbps MP3
//
// Requires `ffmpeg` (and `ffprobe`) in PATH.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const DEFAULT_XFADE_SEC = 0.5;

function ffprobeDurationSec(filePath) {
  const out = execFileSync(
    'ffprobe',
    [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=nw=1:nk=1',
      filePath,
    ],
    { encoding: 'utf8' },
  ).trim();
  const dur = Number(out);
  if (!Number.isFinite(dur) || dur <= 0) {
    throw new Error(`ffprobe could not read duration of ${filePath} (got "${out}")`);
  }
  return dur;
}

function runFfmpeg(args) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
}

/**
 * @param {{
 *   inputPath: string,
 *   outputPath: string,
 *   xfadeSec?: number,
 *   bitrateKbps?: number,
 * }} opts
 * @returns {{ inputDurationSec: number, outputDurationSec: number }}
 */
export function makeGaplessLoopMp3({
  inputPath,
  outputPath,
  xfadeSec = DEFAULT_XFADE_SEC,
  bitrateKbps = 96,
}) {
  const inputDurationSec = ffprobeDurationSec(inputPath);
  const trimmedSec = Math.max(
    Math.floor(xfadeSec * 2 + 1),
    Math.floor(inputDurationSec),
  );
  const headSec = trimmedSec - xfadeSec;

  const tmp = mkdtempSync(path.join(tmpdir(), 'music-gen-'));
  const trimmedPath = path.join(tmp, 'trimmed.wav');
  const headPath = path.join(tmp, 'head.wav');
  const tailPath = path.join(tmp, 'tail.wav');
  const loopedPath = path.join(tmp, 'looped.wav');

  try {
    // 1) Trim to integer seconds, decode to WAV mono 44100 (clean editing surface).
    runFfmpeg([
      '-i', inputPath,
      '-t', String(trimmedSec),
      '-ac', '1',
      '-ar', '44100',
      trimmedPath,
    ]);

    // 2) Split [0..headSec] and [headSec..trimmedSec].
    runFfmpeg(['-i', trimmedPath, '-t', String(headSec), headPath]);
    runFfmpeg(['-i', trimmedPath, '-ss', String(headSec), tailPath]);

    // 3) acrossfade tail into head → length = headSec.
    runFfmpeg([
      '-i', headPath,
      '-i', tailPath,
      '-filter_complex',
      `[0:a][1:a]acrossfade=d=${xfadeSec}:c1=tri:c2=tri[a]`,
      '-map', '[a]',
      loopedPath,
    ]);

    // 4) Loudness-normalize and encode.
    runFfmpeg([
      '-i', loopedPath,
      '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
      '-codec:a', 'libmp3lame',
      '-b:a', `${bitrateKbps}k`,
      '-ac', '1',
      '-ar', '44100',
      outputPath,
    ]);

    return {
      inputDurationSec,
      outputDurationSec: ffprobeDurationSec(outputPath),
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
