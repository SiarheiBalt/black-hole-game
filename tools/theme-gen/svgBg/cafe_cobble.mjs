import { makeRng, parseHex, shade, toHex, wrapSvg } from './_util.mjs';

/**
 * fr_chic: deep navy base with warm cobblestone tiles + cream awning stripes.
 * Darker than the original photo bg so warm cream / pastel macarons icons pop.
 *
 * @param {{ palette?: { primary?: string, secondary?: string, accent?: string }, width?: number, height?: number, seed?: string }} opts
 */
export function cafe_cobble(opts = {}) {
  const width = opts.width ?? 1536;
  const height = opts.height ?? 1024;
  const seed = opts.seed ?? 'fr_chic';
  const rng = makeRng(seed);

  const base = parseHex(opts.palette?.primary ?? '#1c2238');
  const baseDeep = shade(base, -0.35);
  const stone = parseHex(opts.palette?.secondary ?? '#2c3450');
  const stoneHi = shade(stone, 0.18);
  const cream = parseHex(opts.palette?.accent ?? '#e8d5a8');
  const bordeaux = parseHex('#7a1d34');

  // Sparser cobblestones — only the bottom half — leaves the upper play zone
  // calm so icons read clearly against the navy gradient.
  const cobble = [];
  const cols = 14;
  const rows = 7;
  const cellW = width / cols;
  const cellH = (height * 0.55) / rows;
  const yStart = height * 0.45;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ox = c * cellW + (r % 2 === 0 ? 0 : cellW * 0.5);
      const oy = yStart + r * cellH;
      const w = cellW * (0.78 + rng() * 0.18);
      const h = cellH * (0.7 + rng() * 0.22);
      const rx = Math.min(w, h) * (0.32 + rng() * 0.18);
      const fill = rng() < 0.92 ? stone : stoneHi;
      const op = 0.36 + rng() * 0.18;
      cobble.push(
        `<rect x="${(ox + (cellW - w) / 2).toFixed(1)}" y="${(oy + (cellH - h) / 2).toFixed(
          1,
        )}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${rx.toFixed(
          1,
        )}" fill="${toHex(fill)}" fill-opacity="${op.toFixed(2)}"/>`,
      );
    }
  }

  // Awning stripe is now confined to the upper-left corner via clipping
  // overlay so it does not march across the central play zone.
  const stripeBand = `
    <g opacity="0.55" transform="translate(${(width * 0.04).toFixed(1)} 0) rotate(-14 ${(
      width * 0.5
    ).toFixed(1)} ${(height * 0.5).toFixed(1)})">
      ${(() => {
        const out = [];
        const stripeW = 80;
        for (let i = -4; i < 6; i++) {
          const x = i * (stripeW * 2);
          out.push(
            `<rect x="${x}" y="${-height * 0.2}" width="${stripeW}" height="${
              height * 0.55
            }" fill="${toHex(cream)}" fill-opacity="0.10"/>`,
          );
          out.push(
            `<rect x="${x + stripeW}" y="${-height * 0.2}" width="${stripeW}" height="${
              height * 0.55
            }" fill="${toHex(bordeaux)}" fill-opacity="0.12"/>`,
          );
        }
        return out.join('');
      })()}
    </g>
  `;

  const defs = `
    <radialGradient id="ccBase" cx="50%" cy="50%" r="80%">
      <stop offset="0%" stop-color="${toHex(base)}"/>
      <stop offset="100%" stop-color="${toHex(baseDeep)}"/>
    </radialGradient>
    <radialGradient id="ccCalm" cx="50%" cy="50%" r="36%">
      <stop offset="0%" stop-color="${toHex(baseDeep)}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${toHex(baseDeep)}" stop-opacity="0"/>
    </radialGradient>
  `;

  const body = `
    <rect width="${width}" height="${height}" fill="url(#ccBase)"/>
    ${stripeBand}
    ${cobble.join('')}
    <rect width="${width}" height="${height}" fill="url(#ccCalm)"/>
  `;

  return {
    svg: wrapSvg(body, { width, height, defs }),
    dominantHex: baseDeep,
    accentHex: cream,
  };
}
