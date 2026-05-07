import sharp from 'sharp';
import { hexNumber } from './lib.mjs';

/**
 * Простая, без нативных зависимостей k-means реализация над массивом RGB.
 * Достаточно качественно для палитры из 8-10 кластеров.
 */

const SPHERE_PALETTE_SIZE = 10;
const SPHERE_K = 12; // чуть больше кластеров — потом фильтруем по насыщенности
const BG_FIELD_DECOR_COUNT = 2;

/**
 * @param {Buffer[]} iconBuffers
 * @returns {Promise<number[]>} — `sphereColors`, длина = `SPHERE_PALETTE_SIZE`
 */
export async function extractSphereColors(iconBuffers) {
  const samples = [];
  for (const buf of iconBuffers) {
    const pixels = await samplePixelsFromIcon(buf);
    for (const p of pixels) samples.push(p);
  }
  if (samples.length === 0) {
    return defaultSphereColors();
  }
  const clusters = kmeans(samples, SPHERE_K);
  const ranked = clusters
    .map((c) => ({
      rgb: c.center.map((v) => Math.round(v)),
      saturation: hsvSaturation(c.center),
      brightness: hsvValue(c.center),
      weight: c.weight,
    }))
    .filter((c) => c.brightness > 0.18 && c.brightness < 0.96)
    .sort((a, b) => b.saturation * b.weight - a.saturation * a.weight);

  if (ranked.length === 0) return defaultSphereColors();
  const out = [];
  let i = 0;
  while (out.length < SPHERE_PALETTE_SIZE) {
    out.push(hexNumber(ranked[i % ranked.length].rgb));
    i += 1;
    if (i > ranked.length * 4) break;
  }
  return out;
}

/**
 * @param {Buffer} bgBuffer
 */
export async function extractBackgroundFillColor(bgBuffer) {
  const stats = await sharp(bgBuffer).removeAlpha().stats();
  const r = clamp255(stats.channels[0]?.mean ?? 32);
  const g = clamp255(stats.channels[1]?.mean ?? 32);
  const b = clamp255(stats.channels[2]?.mean ?? 32);
  // Чуть притемним подложку, чтобы ярче читались декор и звёзды.
  return hexNumber([Math.round(r * 0.7), Math.round(g * 0.7), Math.round(b * 0.7)]);
}

/**
 * @param {Buffer} bgBuffer
 * @returns {Promise<number[]>} — два hex для `fieldDecorColors`
 */
export async function extractFieldDecorColors(bgBuffer) {
  const samples = await samplePixelsFromBackground(bgBuffer);
  if (!samples.length) return [0xffffff, 0xffd166];
  const clusters = kmeans(samples, 6);
  const ranked = clusters
    .map((c) => ({
      rgb: c.center.map((v) => Math.round(v)),
      saturation: hsvSaturation(c.center),
      brightness: hsvValue(c.center),
      weight: c.weight,
    }))
    .filter((c) => c.brightness > 0.4 && c.brightness < 0.95)
    .sort((a, b) => b.saturation - a.saturation);

  if (ranked.length < BG_FIELD_DECOR_COUNT) {
    while (ranked.length < BG_FIELD_DECOR_COUNT) {
      ranked.push({
        rgb: [255, 255, 255],
        saturation: 0,
        brightness: 1,
        weight: 1,
      });
    }
  }
  return [hexNumber(ranked[0].rgb), hexNumber(ranked[1].rgb)];
}

/**
 * @param {Buffer} buffer
 * @returns {Promise<number[][]>} — массив [r, g, b]
 */
async function samplePixelsFromIcon(buffer) {
  const w = 96;
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .resize(w, w, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = [];
  const stride = info.channels;
  for (let i = 0; i < data.length; i += stride) {
    const a = data[i + 3];
    if (a < 200) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r + g + b < 24) continue;
    if (r + g + b > 750) continue;
    out.push([r, g, b]);
  }
  return out;
}

async function samplePixelsFromBackground(buffer) {
  const w = 128;
  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .resize(w, w, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = [];
  const stride = info.channels;
  for (let i = 0; i < data.length; i += stride) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    out.push([r, g, b]);
  }
  return out;
}

function clamp255(v) {
  return Math.max(0, Math.min(255, v));
}

function hsvSaturation([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}
function hsvValue([r, g, b]) {
  return Math.max(r, g, b) / 255;
}

function defaultSphereColors() {
  return [
    0xff3d9a, 0xff6fae, 0xffb326, 0xffea54, 0xff6b81, 0xe067ff, 0xff8f62,
    0x58ffe8, 0xff9edb, 0xa78bff,
  ];
}

/**
 * Простая k-means поверх RGB. Возвращает кластеры с центром и весом.
 * @param {number[][]} points
 * @param {number} k
 */
function kmeans(points, k) {
  if (points.length === 0) return [];
  const seedRng = mulberry32(0xc0ffee);
  const centers = [];
  for (let i = 0; i < k; i += 1) {
    const idx = Math.floor(seedRng() * points.length);
    centers.push(points[idx].slice());
  }
  const assignments = new Array(points.length).fill(-1);

  for (let iter = 0; iter < 18; iter += 1) {
    let changed = 0;
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centers.length; c += 1) {
        const d = sqDist(p, centers[c]);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      if (assignments[i] !== best) {
        assignments[i] = best;
        changed += 1;
      }
    }
    const sums = centers.map(() => [0, 0, 0]);
    const counts = centers.map(() => 0);
    for (let i = 0; i < points.length; i += 1) {
      const c = assignments[i];
      const p = points[i];
      sums[c][0] += p[0];
      sums[c][1] += p[1];
      sums[c][2] += p[2];
      counts[c] += 1;
    }
    for (let c = 0; c < centers.length; c += 1) {
      if (counts[c] === 0) continue;
      centers[c] = [
        sums[c][0] / counts[c],
        sums[c][1] / counts[c],
        sums[c][2] / counts[c],
      ];
    }
    if (changed === 0) break;
  }

  const counts = centers.map(() => 0);
  for (const a of assignments) counts[a] += 1;
  return centers.map((center, i) => ({ center, weight: counts[i] / points.length }));
}

function sqDist(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
