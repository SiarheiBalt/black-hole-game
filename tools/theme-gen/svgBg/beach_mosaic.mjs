import { makeRng, parseHex, shade, toHex, wrapSvg } from './_util.mjs';

/**
 * global_fiesta: turquoise base, sun-yellow wave bands, mosaic dot grid,
 * radial sun glow off-center. High-saturation festive backdrop that gives
 * vivid icons (taco, paleta, piñata) plenty of room to read.
 *
 * @param {{ palette?: { primary?: string, secondary?: string, accent?: string }, width?: number, height?: number, seed?: string }} opts
 */
export function beach_mosaic(opts = {}) {
  const width = opts.width ?? 1536;
  const height = opts.height ?? 1024;
  const seed = opts.seed ?? 'global_fiesta';
  const rng = makeRng(seed);

  const base = parseHex(opts.palette?.primary ?? '#0a5b66');
  const baseDeep = shade(base, -0.45);
  const sun = parseHex(opts.palette?.accent ?? '#ffc12a');
  const accent = parseHex(opts.palette?.secondary ?? '#ff4a92');

  let waves = '';
  for (let i = 0; i < 3; i++) {
    const t = i / 3;
    const y = height * (0.55 + t * 0.45);
    const amp = 18 + i * 4;
    const points = [];
    const seg = 24;
    for (let s = 0; s <= seg; s++) {
      const x = (s / seg) * width;
      const phase = (s / seg) * Math.PI * 4 + i * 0.7;
      const yy = y + Math.sin(phase) * amp;
      points.push(`${x.toFixed(1)},${yy.toFixed(1)}`);
    }
    points.push(`${width},${height}`);
    points.push(`0,${height}`);
    const op = 0.07 + t * 0.05;
    const fill = i % 2 === 0 ? sun : accent;
    waves += `<polygon points="${points.join(' ')}" fill="${toHex(
      fill,
    )}" fill-opacity="${op.toFixed(2)}"/>`;
  }

  // Mosaic dots are kept only in a corner band, leaving the central play
  // zone clean for icons.
  const tile = 56;
  let mosaic = '';
  const cols = Math.ceil(width / tile) + 1;
  const rows = Math.ceil((height * 0.32) / tile) + 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * tile + (r % 2 === 0 ? 0 : tile * 0.5);
      const cy = r * tile;
      const which = rng();
      const colorHex =
        which < 0.16 ? sun : which < 0.32 ? accent : shade(base, 0.18);
      const r1 = tile * 0.13 * (0.85 + rng() * 0.4);
      const op = 0.28 + rng() * 0.22;
      mosaic += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r1.toFixed(
        2,
      )}" fill="${toHex(colorHex)}" fill-opacity="${op.toFixed(2)}"/>`;
    }
  }

  const sunCx = width * 0.82;
  const sunCy = height * 0.18;
  let rays = '';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const x2 = sunCx + Math.cos(a) * 240;
    const y2 = sunCy + Math.sin(a) * 240;
    rays += `<line x1="${sunCx}" y1="${sunCy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(
      1,
    )}" stroke="${toHex(sun)}" stroke-opacity="0.18" stroke-width="4"/>`;
  }

  const defs = `
    <radialGradient id="bmBase" cx="40%" cy="60%" r="80%">
      <stop offset="0%" stop-color="${toHex(shade(base, 0.15))}"/>
      <stop offset="100%" stop-color="${toHex(baseDeep)}"/>
    </radialGradient>
    <radialGradient id="bmSun" cx="82%" cy="18%" r="22%">
      <stop offset="0%" stop-color="${toHex(sun)}" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="${toHex(sun)}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bmCalm" cx="50%" cy="55%" r="36%">
      <stop offset="0%" stop-color="${toHex(baseDeep)}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${toHex(baseDeep)}" stop-opacity="0"/>
    </radialGradient>
  `;

  const body = `
    <rect width="${width}" height="${height}" fill="url(#bmBase)"/>
    ${rays}
    <circle cx="${sunCx}" cy="${sunCy}" r="92" fill="url(#bmSun)"/>
    ${waves}
    ${mosaic}
    <rect width="${width}" height="${height}" fill="url(#bmCalm)"/>
  `;

  return {
    svg: wrapSvg(body, { width, height, defs }),
    dominantHex: base,
    accentHex: sun,
  };
}
