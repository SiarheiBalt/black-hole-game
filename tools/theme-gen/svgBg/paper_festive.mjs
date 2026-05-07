import { makeRng, parseHex, shade, toHex, wrapSvg } from './_util.mjs';

/**
 * zh-CN festive: deep cinnabar red base, gold scroll-cloud damask pattern,
 * soft edge vignette, scattered gold pinpoint highlights.
 *
 * @param {{ palette?: { primary?: string, secondary?: string, accent?: string }, width?: number, height?: number, seed?: string }} opts
 */
export function paper_festive(opts = {}) {
  const width = opts.width ?? 1536;
  const height = opts.height ?? 1024;
  const seed = opts.seed ?? 'zh_urban';
  const rng = makeRng(seed);

  const base = parseHex(opts.palette?.primary ?? '#7a1414');
  const deep = shade(base, -0.4);
  const gold = parseHex(opts.palette?.accent ?? '#e8b14a');
  const goldDeep = shade(gold, -0.35);
  const cream = parseHex(opts.palette?.secondary ?? '#f3d27a');

  const tile = 192;
  const cols = Math.ceil(width / tile) + 1;
  const rows = Math.ceil(height / tile) + 1;

  const cloud = (cx, cy, R, op) => {
    const lobes = [];
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      const lx = cx + Math.cos(a) * R * 0.55;
      const ly = cy + Math.sin(a) * R * 0.55;
      lobes.push(
        `<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(
          1,
        )}" r="${(R * 0.42).toFixed(2)}" fill="${toHex(gold)}" fill-opacity="${op.toFixed(2)}"/>`,
      );
    }
    return (
      lobes.join('') +
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(R * 0.55).toFixed(
        2,
      )}" fill="${toHex(goldDeep)}" fill-opacity="${(op * 0.78).toFixed(2)}"/>`
    );
  };

  let pattern = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * tile + (r % 2 === 0 ? 0 : tile / 2);
      const cy = r * tile;
      pattern += cloud(cx, cy, tile * 0.36, 0.09);
    }
  }

  let sparkles = '';
  for (let i = 0; i < 24; i++) {
    const cx = rng() * width;
    const cy = rng() * height;
    const r = 1.2 + rng() * 1.8;
    const op = 0.32 + rng() * 0.25;
    sparkles += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(
      2,
    )}" fill="${toHex(cream)}" fill-opacity="${op.toFixed(2)}"/>`;
  }

  const defs = `
    <radialGradient id="pfBase" cx="50%" cy="50%" r="78%">
      <stop offset="0%" stop-color="${toHex(base)}"/>
      <stop offset="100%" stop-color="${toHex(deep)}"/>
    </radialGradient>
    <radialGradient id="pfVignette" cx="50%" cy="50%" r="72%">
      <stop offset="60%" stop-color="${toHex(deep)}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${toHex(deep)}" stop-opacity="0.55"/>
    </radialGradient>
    <radialGradient id="pfCalm" cx="50%" cy="50%" r="34%">
      <stop offset="0%" stop-color="${toHex(deep)}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${toHex(deep)}" stop-opacity="0"/>
    </radialGradient>
  `;

  const body = `
    <rect width="${width}" height="${height}" fill="url(#pfBase)"/>
    ${pattern}
    ${sparkles}
    <rect width="${width}" height="${height}" fill="url(#pfVignette)"/>
    <rect width="${width}" height="${height}" fill="url(#pfCalm)"/>
  `;

  return {
    svg: wrapSvg(body, { width, height, defs }),
    dominantHex: deep,
    accentHex: gold,
  };
}
