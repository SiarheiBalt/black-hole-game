import { makeRng, parseHex, shade, toHex, wrapSvg } from './_util.mjs';

/**
 * Pastel kawaii grid: warm pink gradient base, scattered sakura silhouettes,
 * soft cream radial highlight off-center. Mid-saturation by design so darker
 * outlined icons read clearly.
 *
 * @param {{ palette?: { primary?: string, secondary?: string, accent?: string }, width?: number, height?: number, seed?: string }} opts
 */
export function kawaii_dots(opts = {}) {
  const width = opts.width ?? 1536;
  const height = opts.height ?? 1024;
  const seed = opts.seed ?? 'jp_kawaii';
  const rng = makeRng(seed);

  const baseHex = parseHex(opts.palette?.primary ?? '#ffb8d4');
  const deepHex = shade(baseHex, -0.18);
  const dotHex = shade(baseHex, -0.32);
  const accentHex = parseHex(opts.palette?.accent ?? '#ffd28a');
  const sakuraHex = parseHex(opts.palette?.secondary ?? '#ff7aa8');
  const highlight = shade(baseHex, 0.18);

  const cells = 9;
  const cellW = width / cells;
  const cellH = cellW;
  const dotR = cellW * 0.06;
  let dots = '';
  for (let y = 0; y * cellH < height + cellH; y++) {
    for (let x = 0; x < cells; x++) {
      const cx = x * cellW + cellW * 0.5;
      const cy = y * cellH + cellH * 0.5;
      const r = dotR * (0.85 + rng() * 0.4);
      dots += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(
        2,
      )}" fill="${toHex(dotHex)}" fill-opacity="0.22"/>`;
    }
  }

  const sakuraPath = (cx, cy, R, rot) => {
    const petals = [];
    for (let i = 0; i < 5; i++) {
      const a = rot + (i * Math.PI * 2) / 5;
      const px = cx + Math.cos(a) * R;
      const py = cy + Math.sin(a) * R;
      const c1x = cx + Math.cos(a - 0.55) * R * 0.9;
      const c1y = cy + Math.sin(a - 0.55) * R * 0.9;
      const c2x = cx + Math.cos(a + 0.55) * R * 0.9;
      const c2y = cy + Math.sin(a + 0.55) * R * 0.9;
      petals.push(
        `M${cx.toFixed(1)},${cy.toFixed(1)} Q${c1x.toFixed(1)},${c1y.toFixed(1)} ${px.toFixed(
          1,
        )},${py.toFixed(1)} Q${c2x.toFixed(1)},${c2y.toFixed(1)} ${cx.toFixed(1)},${cy.toFixed(1)} Z`,
      );
    }
    return petals.join(' ');
  };

  // Petals are pushed to the corners so the central play zone stays clean.
  let petals = '';
  const petalCount = 12;
  for (let i = 0; i < petalCount; i++) {
    const corner = i % 4;
    const cx =
      corner % 2 === 0
        ? rng() * width * 0.32
        : width - rng() * width * 0.32;
    const cy =
      corner < 2
        ? rng() * height * 0.32
        : height - rng() * height * 0.32;
    const R = (18 + rng() * 24) * (height / 1024);
    const rot = rng() * Math.PI * 2;
    const op = 0.16 + rng() * 0.18;
    petals += `<path d="${sakuraPath(cx, cy, R, rot)}" fill="${toHex(
      sakuraHex,
    )}" fill-opacity="${op.toFixed(2)}"/>`;
    petals += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(R * 0.18).toFixed(
      1,
    )}" fill="${toHex(accentHex)}" fill-opacity="${(op * 0.9).toFixed(2)}"/>`;
  }

  const defs = `
    <radialGradient id="kBase" cx="48%" cy="42%" r="80%">
      <stop offset="0%" stop-color="${toHex(highlight)}"/>
      <stop offset="55%" stop-color="${toHex(baseHex)}"/>
      <stop offset="100%" stop-color="${toHex(deepHex)}"/>
    </radialGradient>
    <radialGradient id="kHilite" cx="74%" cy="22%" r="34%">
      <stop offset="0%" stop-color="${toHex(shade(accentHex, 0.35))}" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="${toHex(accentHex)}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="kCalm" cx="50%" cy="55%" r="34%">
      <stop offset="0%" stop-color="${toHex(deepHex)}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${toHex(deepHex)}" stop-opacity="0"/>
    </radialGradient>
  `;

  const body = `
    <rect width="${width}" height="${height}" fill="url(#kBase)"/>
    ${dots}
    ${petals}
    <rect width="${width}" height="${height}" fill="url(#kHilite)"/>
    <rect width="${width}" height="${height}" fill="url(#kCalm)"/>
  `;

  return {
    svg: wrapSvg(body, { width, height, defs }),
    dominantHex: baseHex,
    accentHex: sakuraHex,
  };
}
