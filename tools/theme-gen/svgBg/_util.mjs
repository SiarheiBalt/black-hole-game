/**
 * Shared utilities for SVG background generators.
 *
 * Generators return a `{ svg, dominantHex, accentHex }` triple. `svg` is a complete
 * `<svg>` document ready to be rasterized by Pixi `Assets.load(...)` (v8) at theme
 * build time. `dominantHex` / `accentHex` are JS numbers (e.g. `0xff3d9a`) that the
 * pipeline uses to pick `playfieldTheme.backgroundColor` / `decorColor` and to seed
 * sphere / decor palettes when QA needs to retry contrast.
 */

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * @param {string} hex
 * @returns {number}
 */
export function parseHex(hex) {
  if (typeof hex !== 'string' || !HEX_RE.test(hex.trim())) return 0x000000;
  let h = hex.trim().slice(1);
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return parseInt(h, 16) >>> 0;
}

/**
 * @param {number} num
 * @returns {string}
 */
export function toHex(num) {
  return `#${(num & 0xffffff).toString(16).padStart(6, '0')}`;
}

/**
 * @param {number} hex
 * @param {number} amt -1..1 (positive lightens, negative darkens)
 */
export function shade(hex, amt) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  const t = amt > 0 ? 255 : 0;
  const k = Math.abs(amt);
  const nr = Math.round((1 - k) * r + k * t);
  const ng = Math.round((1 - k) * g + k * t);
  const nb = Math.round((1 - k) * b + k * t);
  return ((nr & 0xff) << 16) | ((ng & 0xff) << 8) | (nb & 0xff);
}

/**
 * Mulberry32 PRNG — deterministic per-theme so successive `theme:gen` runs produce
 * the same SVG bytes. Seeded with a hash of the theme id.
 * @param {string} seedKey
 */
export function makeRng(seedKey) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedKey.length; i++) {
    h ^= seedKey.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let s = h || 1;
  return function rng() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {string} body — inner SVG markup (no wrapping <svg>).
 * @param {{ width: number, height: number, defs?: string }} opts
 */
export function wrapSvg(body, { width, height, defs = '' }) {
  const w = Math.round(width);
  const h = Math.round(height);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
${defs ? `<defs>${defs}</defs>\n` : ''}${body}
</svg>
`;
}
