import { makeRng, parseHex, shade, toHex, wrapSvg } from './_util.mjs';

/**
 * uk_pub: rich brick-red wall texture with offset bond pattern, mortar grout,
 * a few cream / pale stones for variety, gentle wet-sheen highlight on top.
 *
 * @param {{ palette?: { primary?: string, secondary?: string, accent?: string }, width?: number, height?: number, seed?: string }} opts
 */
export function brick_warm(opts = {}) {
  const width = opts.width ?? 1536;
  const height = opts.height ?? 1024;
  const seed = opts.seed ?? 'uk_pub';
  const rng = makeRng(seed);

  const base = parseHex(opts.palette?.primary ?? '#3b1410');
  const grout = shade(base, -0.5);
  const brick = parseHex(opts.palette?.secondary ?? '#7a2f24');
  const brickHi = shade(brick, 0.15);
  const cream = parseHex(opts.palette?.accent ?? '#e6cf9c');

  const brickH = 72;
  const brickW = 220;
  const rows = Math.ceil(height / brickH) + 2;
  const cols = Math.ceil(width / brickW) + 2;

  let bricks = '';
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : brickW * 0.5;
    for (let c = -1; c < cols; c++) {
      const x = c * brickW + offset;
      const y = r * brickH;
      const wVar = brickW - 8 - rng() * 8;
      const hVar = brickH - 10 - rng() * 6;
      let fillHex;
      const which = rng();
      if (which < 0.04) fillHex = cream;
      else if (which < 0.5) fillHex = brick;
      else fillHex = brickHi;
      const op = 0.62 + rng() * 0.16;
      bricks += `<rect x="${(x + 3).toFixed(1)}" y="${(y + 3).toFixed(1)}" width="${wVar.toFixed(
        1,
      )}" height="${hVar.toFixed(1)}" rx="6" fill="${toHex(fillHex)}" fill-opacity="${op.toFixed(
        2,
      )}"/>`;
    }
  }

  const defs = `
    <linearGradient id="bwBase" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${toHex(shade(grout, -0.1))}"/>
      <stop offset="100%" stop-color="${toHex(grout)}"/>
    </linearGradient>
    <radialGradient id="bwSheen" cx="48%" cy="20%" r="55%">
      <stop offset="0%" stop-color="${toHex(cream)}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${toHex(cream)}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bwCalm" cx="50%" cy="55%" r="36%">
      <stop offset="0%" stop-color="${toHex(grout)}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${toHex(grout)}" stop-opacity="0"/>
    </radialGradient>
  `;

  const body = `
    <rect width="${width}" height="${height}" fill="url(#bwBase)"/>
    ${bricks}
    <rect width="${width}" height="${height}" fill="url(#bwSheen)"/>
    <rect width="${width}" height="${height}" fill="url(#bwCalm)"/>
  `;

  return {
    svg: wrapSvg(body, { width, height, defs }),
    dominantHex: brick,
    accentHex: cream,
  };
}
