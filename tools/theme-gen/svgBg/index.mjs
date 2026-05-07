/**
 * Registry of parametric SVG background generators. Each entry is a generator
 * function that returns `{ svg, dominantHex, accentHex }` and accepts
 * `{ palette?, width?, height?, seed? }`.
 *
 * Briefs reference a generator via `backgroundSvg.kind`; the CLI looks up the
 * function here, runs it, writes `bg.svg` into `src/assets/themes/<id>/` and
 * passes the dominant/accent colors to the theme registration step.
 */

import { kawaii_dots } from './kawaii_dots.mjs';
import { neon_grid } from './neon_grid.mjs';
import { paper_festive } from './paper_festive.mjs';
import { cafe_cobble } from './cafe_cobble.mjs';
import { brick_warm } from './brick_warm.mjs';
import { beach_mosaic } from './beach_mosaic.mjs';

export const SVG_BG_GENERATORS = {
  kawaii_dots,
  neon_grid,
  paper_festive,
  cafe_cobble,
  brick_warm,
  beach_mosaic,
};

/**
 * @param {string} kind
 * @returns {(opts: { palette?: object, width?: number, height?: number, seed?: string }) => { svg: string, dominantHex: number, accentHex: number }}
 */
export function getSvgBgGenerator(kind) {
  const fn = SVG_BG_GENERATORS[kind];
  if (typeof fn !== 'function') {
    throw new Error(
      `Unknown SVG bg generator "${kind}". Known: ${Object.keys(SVG_BG_GENERATORS).join(', ')}`,
    );
  }
  return fn;
}

/**
 * @param {object} brief
 * @param {string} fallbackSeed
 * @returns {{ svg: string, dominantHex: number, accentHex: number, kind: string }}
 */
export function runSvgBg(brief, fallbackSeed) {
  const cfg = brief?.backgroundSvg ?? {};
  const kind = typeof cfg.kind === 'string' && cfg.kind ? cfg.kind : 'kawaii_dots';
  const gen = getSvgBgGenerator(kind);
  const out = gen({
    palette: cfg.palette,
    width: cfg.width ?? 1536,
    height: cfg.height ?? 1024,
    seed: cfg.seed ?? fallbackSeed,
  });
  return { ...out, kind };
}
