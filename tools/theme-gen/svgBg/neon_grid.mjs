import { makeRng, parseHex, shade, toHex, wrapSvg } from './_util.mjs';

/**
 * K-pop / neon-noir vibe: dark navy-purple base, perspective grid converging
 * upward, neon scanlines, holo dots scattered in the upper third.
 *
 * @param {{ palette?: { primary?: string, secondary?: string, accent?: string }, width?: number, height?: number, seed?: string }} opts
 */
export function neon_grid(opts = {}) {
  const width = opts.width ?? 1536;
  const height = opts.height ?? 1024;
  const seed = opts.seed ?? 'kr_sea_pop';
  const rng = makeRng(seed);

  const base = parseHex(opts.palette?.primary ?? '#0a0820');
  const deep = shade(base, -0.55);
  const magenta = parseHex(opts.palette?.accent ?? '#ff2bd6');
  const cyan = parseHex(opts.palette?.secondary ?? '#27e3ff');

  const horizonY = Math.round(height * 0.42);
  const vanishX = Math.round(width * 0.5);

  const horiz = [];
  const horizCount = 10;
  for (let i = 0; i < horizCount; i++) {
    const t = i / horizCount;
    const k = Math.pow(t, 1.7);
    const y = horizonY + (height - horizonY) * k;
    const op = (0.12 + 0.32 * t).toFixed(2);
    const sw = (1.0 + 1.2 * t).toFixed(2);
    horiz.push(
      `<line x1="0" y1="${y.toFixed(1)}" x2="${width}" y2="${y.toFixed(
        1,
      )}" stroke="${toHex(magenta)}" stroke-opacity="${op}" stroke-width="${sw}"/>`,
    );
  }

  const vert = [];
  const vertCount = 14;
  for (let i = -vertCount; i <= vertCount; i++) {
    const k = i / vertCount;
    const xBottom = vanishX + k * width * 1.4;
    vert.push(
      `<line x1="${vanishX}" y1="${horizonY}" x2="${xBottom.toFixed(
        1,
      )}" y2="${height}" stroke="${toHex(cyan)}" stroke-opacity="0.18" stroke-width="1.1"/>`,
    );
  }

  let dots = '';
  for (let i = 0; i < 36; i++) {
    const cx = rng() * width;
    const cy = rng() * horizonY * 1.05;
    const r = 1.2 + rng() * 1.8;
    const which = rng() < 0.5 ? magenta : cyan;
    const op = (0.32 + rng() * 0.35).toFixed(2);
    dots += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(
      2,
    )}" fill="${toHex(which)}" fill-opacity="${op}"/>`;
  }

  const defs = `
    <linearGradient id="ngBase" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${toHex(shade(deep, -0.4))}"/>
      <stop offset="50%" stop-color="${toHex(deep)}"/>
      <stop offset="100%" stop-color="${toHex(base)}"/>
    </linearGradient>
    <radialGradient id="ngGlow" cx="50%" cy="42%" r="55%">
      <stop offset="0%" stop-color="${toHex(magenta)}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${toHex(magenta)}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ngCalm" cx="50%" cy="58%" r="38%">
      <stop offset="0%" stop-color="${toHex(deep)}" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="${toHex(deep)}" stop-opacity="0"/>
    </radialGradient>
  `;

  const body = `
    <rect width="${width}" height="${height}" fill="url(#ngBase)"/>
    <rect width="${width}" height="${height}" fill="url(#ngGlow)"/>
    ${vert.join('')}
    ${horiz.join('')}
    ${dots}
    <rect x="0" y="${horizonY - 2}" width="${width}" height="2" fill="${toHex(
      magenta,
    )}" fill-opacity="0.35"/>
    <rect width="${width}" height="${height}" fill="url(#ngCalm)"/>
  `;

  return {
    svg: wrapSvg(body, { width, height, defs }),
    dominantHex: deep,
    accentHex: magenta,
  };
}
