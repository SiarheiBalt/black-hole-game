import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ensureDir } from './lib.mjs';

/** Согласовано с `scripts/optimize-images.py`. */
export const ICON_MAX_EDGE = 320;
export const BG_MAX_WIDTH = 960;
export const ICON_QUALITY = 82;
export const BG_QUALITY = 74;

/**
 * Сохраняет исходник PNG (диагностика), вырезает фон (если иконка пришла без
 * прозрачности — к примеру, gpt-image-1 иногда отдаёт RGB с нарисованным
 * checker-фоном), кадрирует к субъекту, прогоняет contrast pass (контур + тень),
 * затем оптимизирует в WebP с альфой.
 *
 * @param {{
 *   buffer: Buffer,
 *   outDir: string,
 *   name: string,
 *   contrast?: false | {
 *     outlineRadius?: number,
 *     outlineAlpha?: number,
 *     shadowOffset?: number,
 *     shadowBlur?: number,
 *     shadowAlpha?: number,
 *   }
 * }} args
 * @returns {Promise<{ raw: string, webp: string, width: number, height: number, sizeBytes: number, contrastApplied: boolean, meanLuminance: number }>}
 */
export async function optimizeIcon({ buffer, outDir, name, contrast }) {
  await ensureDir(outDir);
  const rawPath = path.join(outDir, `${name}.png`);
  await fs.writeFile(rawPath, buffer);

  const transparentBuffer = await ensureTransparentIcon(buffer);

  const meta = await sharp(transparentBuffer).metadata();
  const longEdge = Math.max(meta.width || ICON_MAX_EDGE, meta.height || ICON_MAX_EDGE);
  const scale = Math.min(1, ICON_MAX_EDGE / longEdge);
  const tw = Math.max(1, Math.round((meta.width || ICON_MAX_EDGE) * scale));
  const th = Math.max(1, Math.round((meta.height || ICON_MAX_EDGE) * scale));

  const resizedBuffer = await sharp(transparentBuffer)
    .resize(tw, th, { fit: 'inside', kernel: 'lanczos3' })
    .png()
    .toBuffer();

  let pngForEncode = resizedBuffer;
  let contrastApplied = false;
  let meanLuminance = 0.5;
  if (contrast !== false) {
    const post = await contrastPostProcess(resizedBuffer, contrast || {});
    pngForEncode = post.buffer;
    meanLuminance = post.meanLuminance;
    contrastApplied = true;
  } else {
    meanLuminance = await measureMeanLuminance(resizedBuffer);
  }

  const webpPath = path.join(outDir, `${name}.webp`);
  const webpBuffer = await sharp(pngForEncode)
    .webp({ quality: ICON_QUALITY, alphaQuality: 90, effort: 6 })
    .toBuffer();
  await fs.writeFile(webpPath, webpBuffer);

  const finalMeta = await sharp(webpBuffer).metadata();

  return {
    raw: rawPath,
    webp: webpPath,
    width: finalMeta.width || tw,
    height: finalMeta.height || th,
    sizeBytes: webpBuffer.length,
    contrastApplied,
    meanLuminance,
  };
}

/**
 * Adds a contour outline + soft drop shadow to an icon so it stays readable
 * across very different theme backgrounds. Outline color is auto-picked: if a
 * `bgLuminance` is supplied (0..1), the outline opposes the background (dark
 * outline on light bg, light outline on dark bg) — this is the right choice
 * because the outline is what visually separates the icon from what's behind
 * it. Without `bgLuminance`, falls back to picking opposite of the icon's own
 * mean luminance.
 *
 * @param {Buffer} pngBuffer — square RGBA PNG (already at final display size).
 * @param {{
 *   outlineRadius?: number,
 *   outlineAlpha?: number,
 *   shadowOffset?: number,
 *   shadowBlur?: number,
 *   shadowAlpha?: number,
 *   bgLuminance?: number,
 * }} opts
 * @returns {Promise<{ buffer: Buffer, meanLuminance: number, outlineColor: [number, number, number], width: number, height: number }>}
 */
export async function contrastPostProcess(pngBuffer, opts = {}) {
  const {
    outlineRadius = 3,
    outlineAlpha = 0.78,
    shadowOffset = 4,
    shadowBlur = 4,
    shadowAlpha = 0.28,
    bgLuminance,
  } = opts;

  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const stride = info.channels;

  let lumSum = 0;
  let lumN = 0;
  const alphaMask = Buffer.alloc(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * stride;
      const a = data[i + 3];
      alphaMask[y * w + x] = a;
      if (a >= 200) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        lumSum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
        lumN += 1;
      }
    }
  }
  const meanLuminance = lumN > 0 ? lumSum / lumN / 255 : 0.5;
  // Pick outline color to oppose whatever the icon will sit on. Prefer the
  // explicit `bgLuminance` (real reference); otherwise oppose the icon's own
  // luma as a best guess.
  const referenceLum =
    typeof bgLuminance === 'number' && Number.isFinite(bgLuminance)
      ? Math.max(0, Math.min(1, bgLuminance))
      : meanLuminance;
  const useDarkOutline = referenceLum > 0.5;
  const outlineColor = /** @type {[number, number, number]} */ (
    useDarkOutline ? [22, 24, 36] : [248, 248, 252]
  );

  const r = Math.max(1, Math.round(outlineRadius));
  const dilH = dilateMaxHorizontal(alphaMask, w, h, r);
  const dilated = dilateMaxVertical(dilH, w, h, r);

  const outlineRGBA = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i += 1) {
    const dA = dilated[i];
    const oA = alphaMask[i];
    if (dA > 32 && oA < 220) {
      const ringStrength = (dA - oA) / 255;
      const a = Math.round(Math.min(255, dA * outlineAlpha * (0.5 + 0.5 * ringStrength)));
      const off = i * 4;
      outlineRGBA[off] = outlineColor[0];
      outlineRGBA[off + 1] = outlineColor[1];
      outlineRGBA[off + 2] = outlineColor[2];
      outlineRGBA[off + 3] = a;
    }
  }

  const shadowMaskRGBA = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i += 1) {
    const a = dilated[i];
    const off = i * 4;
    shadowMaskRGBA[off] = 0;
    shadowMaskRGBA[off + 1] = 0;
    shadowMaskRGBA[off + 2] = 0;
    shadowMaskRGBA[off + 3] = Math.round(a * shadowAlpha);
  }
  const shadowBlurred = await sharp(shadowMaskRGBA, {
    raw: { width: w, height: h, channels: 4 },
  })
    .blur(Math.max(0.3, shadowBlur))
    .png()
    .toBuffer();

  const composed = await sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: shadowBlurred, left: shadowOffset, top: shadowOffset, blend: 'over' },
      {
        input: outlineRGBA,
        raw: { width: w, height: h, channels: 4 },
        blend: 'over',
      },
      { input: pngBuffer, blend: 'over' },
    ])
    .png()
    .toBuffer();

  return { buffer: composed, meanLuminance, outlineColor, width: w, height: h };
}

/**
 * Mean luminance of opaque (alpha >= 200) pixels of a PNG. Used by contrast QA.
 * @param {Buffer} pngBuffer
 * @returns {Promise<number>} 0..1
 */
export async function measureMeanLuminance(pngBuffer) {
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const stride = info.channels;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += stride) {
    const a = data[i + 3];
    if (a >= 200) {
      sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      n += 1;
    }
  }
  return n > 0 ? sum / n / 255 : 0.5;
}

/**
 * Alpha-weighted mean absolute luminance distance to a reference luma. This is
 * the contrast QA metric — unlike `measureMeanLuminance`, it doesn't cancel out
 * a bright outline against a dark icon body (which simple mean does), so the
 * contrastPostProcess actually moves this metric in the right direction.
 *
 * @param {Buffer} pngBuffer
 * @param {number} bgLuminance — 0..1
 * @returns {Promise<number>} 0..1, larger is more contrasty
 */
export async function measureContrastVsBg(pngBuffer, bgLuminance) {
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const stride = info.channels;
  let weighted = 0;
  let totalAlpha = 0;
  for (let i = 0; i < data.length; i += stride) {
    const a = data[i + 3] / 255;
    if (a < 0.04) continue;
    const L =
      (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    weighted += a * Math.abs(L - bgLuminance);
    totalAlpha += a;
  }
  return totalAlpha > 0 ? weighted / totalAlpha : 0;
}

function dilateMaxHorizontal(mask, w, h, radius) {
  const out = Buffer.alloc(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let maxV = 0;
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(w - 1, x + radius);
      for (let xi = x0; xi <= x1; xi += 1) {
        const v = mask[y * w + xi];
        if (v > maxV) maxV = v;
      }
      out[y * w + x] = maxV;
    }
  }
  return out;
}

function dilateMaxVertical(mask, w, h, radius) {
  const out = Buffer.alloc(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let maxV = 0;
      const y0 = Math.max(0, y - radius);
      const y1 = Math.min(h - 1, y + radius);
      for (let yi = y0; yi <= y1; yi += 1) {
        const v = mask[yi * w + x];
        if (v > maxV) maxV = v;
      }
      out[y * w + x] = maxV;
    }
  }
  return out;
}

/**
 * Если иконка пришла RGB без альфы или с почти полностью непрозрачным фоном —
 * убираем «фон» по доминирующим цветам по периметру (k-means на бордюре),
 * затем кадрируем к bbox субъекта и подбиваем до квадрата.
 */
export async function ensureTransparentIcon(buffer) {
  const probe = sharp(buffer);
  const meta = await probe.metadata();
  const hasMeaningfulAlpha = meta.hasAlpha && (await isAlphaSparse(buffer));
  if (hasMeaningfulAlpha) {
    return await squarePadToBbox(buffer);
  }
  return await keyOutBackgroundAndSquare(buffer);
}

async function isAlphaSparse(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const stride = info.channels;
  let cornerSum = 0;
  let cornerN = 0;
  const sampleCorner = (x0, y0) => {
    for (let y = y0; y < y0 + 8 && y < h; y += 1) {
      for (let x = x0; x < x0 + 8 && x < w; x += 1) {
        cornerSum += data[(y * w + x) * stride + 3];
        cornerN += 1;
      }
    }
  };
  sampleCorner(0, 0);
  sampleCorner(w - 8, 0);
  sampleCorner(0, h - 8);
  sampleCorner(w - 8, h - 8);
  return cornerN > 0 && cornerSum / cornerN < 32;
}

async function keyOutBackgroundAndSquare(buffer) {
  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  const borderSamples = sampleBorder(data, w, h, 14);
  let centers = kmeansRgb(borderSamples, 3);
  if (centers.length === 0) centers = [[238, 238, 238]];

  // Try mask with progressively wider tolerance until corners are mostly transparent.
  let rgba = null;
  let bbox = null;
  for (const tol of [30, 38, 46, 56, 70]) {
    const tolSq = tol * tol * 3;
    rgba = Buffer.alloc(w * h * 4);
    for (let i = 0, p = 0; i < data.length; i += 3, p += 1) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      let isBg = false;
      for (const c of centers) {
        const dr = r - c[0];
        const dg = g - c[1];
        const db = b - c[2];
        if (dr * dr + dg * dg + db * db < tolSq) {
          isBg = true;
          break;
        }
      }
      rgba[p * 4] = r;
      rgba[p * 4 + 1] = g;
      rgba[p * 4 + 2] = b;
      rgba[p * 4 + 3] = isBg ? 0 : 255;
    }
    const cornerAlpha = sampleCornerAlphaFromRgba(rgba, w, h);
    if (cornerAlpha < 16) {
      bbox = findOpaqueBbox(rgba, w, h);
      if (bbox) break;
    }
  }

  if (!rgba) {
    return await sharp(buffer).ensureAlpha().png().toBuffer();
  }
  if (!bbox) bbox = findOpaqueBbox(rgba, w, h);
  if (!bbox) {
    return await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  }

  const subjectW = bbox.maxX - bbox.minX + 1;
  const subjectH = bbox.maxY - bbox.minY + 1;
  // 10% padding leaves ~32px on each side after the resize to ICON_MAX_EDGE,
  // which is enough room for the contrast pass's outline (≤4px) + shadow tail
  // (≤9px) to stay inside the alpha-cutout. cornerAlpha QA sampling is at 8x8,
  // so the buffer must be larger than the worst-case effect ring.
  const pad = Math.max(12, Math.round(Math.max(subjectW, subjectH) * 0.1));
  const cx0 = Math.max(0, bbox.minX - pad);
  const cy0 = Math.max(0, bbox.minY - pad);
  const cx1 = Math.min(w - 1, bbox.maxX + pad);
  const cy1 = Math.min(h - 1, bbox.maxY + pad);
  const cw = cx1 - cx0 + 1;
  const ch = cy1 - cy0 + 1;
  const side = Math.max(cw, ch);
  const tPad = Math.floor((side - ch) / 2);
  const bPad = side - ch - tPad;
  const lPad = Math.floor((side - cw) / 2);
  const rPad = side - cw - lPad;
  const extraPad = Math.max(8, Math.round(side * 0.04));

  return await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: cx0, top: cy0, width: cw, height: ch })
    .extend({
      top: tPad + extraPad,
      bottom: bPad + extraPad,
      left: lPad + extraPad,
      right: rPad + extraPad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function squarePadToBbox(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const bbox = findOpaqueBbox(data, w, h);
  if (!bbox) return buffer;
  const subjectW = bbox.maxX - bbox.minX + 1;
  const subjectH = bbox.maxY - bbox.minY + 1;
  const pad = Math.max(12, Math.round(Math.max(subjectW, subjectH) * 0.1));
  const cx0 = Math.max(0, bbox.minX - pad);
  const cy0 = Math.max(0, bbox.minY - pad);
  const cx1 = Math.min(w - 1, bbox.maxX + pad);
  const cy1 = Math.min(h - 1, bbox.maxY + pad);
  const cw = cx1 - cx0 + 1;
  const ch = cy1 - cy0 + 1;
  const side = Math.max(cw, ch);
  const tPad = Math.floor((side - ch) / 2);
  const bPad = side - ch - tPad;
  const lPad = Math.floor((side - cw) / 2);
  const rPad = side - cw - lPad;
  const extraPad = Math.max(8, Math.round(side * 0.04));
  return await sharp(buffer)
    .ensureAlpha()
    .extract({ left: cx0, top: cy0, width: cw, height: ch })
    .extend({
      top: tPad + extraPad,
      bottom: bPad + extraPad,
      left: lPad + extraPad,
      right: rPad + extraPad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

function findOpaqueBbox(buffer, w, h) {
  const stride = buffer.length === w * h * 4 ? 4 : Math.floor(buffer.length / (w * h));
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const a = buffer[(y * w + x) * stride + 3];
      if (a > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { minX, minY, maxX, maxY };
}

function sampleBorder(data, w, h, strip) {
  const out = [];
  for (let y = 0; y < h; y += 1) {
    if (y >= strip && y < h - strip) {
      for (let x = 0; x < w; x += 1) {
        if (x >= strip && x < w - strip) continue;
        const idx = (y * w + x) * 3;
        out.push([data[idx], data[idx + 1], data[idx + 2]]);
      }
      continue;
    }
    for (let x = 0; x < w; x += 1) {
      const idx = (y * w + x) * 3;
      out.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
  }
  return out;
}

function sampleCornerAlphaFromRgba(rgba, w, h) {
  const sample = (x0, y0) => {
    let s = 0;
    let n = 0;
    for (let y = y0; y < y0 + 8 && y < h; y += 1) {
      for (let x = x0; x < x0 + 8 && x < w; x += 1) {
        s += rgba[(y * w + x) * 4 + 3];
        n += 1;
      }
    }
    return n ? s / n : 0;
  };
  return (sample(0, 0) + sample(w - 8, 0) + sample(0, h - 8) + sample(w - 8, h - 8)) / 4;
}

function kmeansRgb(points, k) {
  if (points.length === 0) return [];
  const seed = mulberry32(0xfeedbeef);
  const centers = [];
  for (let i = 0; i < k; i += 1) {
    centers.push(points[Math.floor(seed() * points.length)].slice());
  }
  const assign = new Array(points.length).fill(-1);
  for (let iter = 0; iter < 16; iter += 1) {
    let changed = 0;
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centers.length; c += 1) {
        const dr = p[0] - centers[c][0];
        const dg = p[1] - centers[c][1];
        const db = p[2] - centers[c][2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (assign[i] !== best) {
        assign[i] = best;
        changed += 1;
      }
    }
    const sums = centers.map(() => [0, 0, 0]);
    const counts = centers.map(() => 0);
    for (let i = 0; i < points.length; i += 1) {
      const a = assign[i];
      sums[a][0] += points[i][0];
      sums[a][1] += points[i][1];
      sums[a][2] += points[i][2];
      counts[a] += 1;
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
  return centers;
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

/**
 * Опаковый bg → WebP, максимальная ширина 960 px (как в city-теме).
 * @param {{ buffer: Buffer, outDir: string, name: string }} args
 */
export async function optimizeBackground({ buffer, outDir, name }) {
  await ensureDir(outDir);
  const rawPath = path.join(outDir, `${name}.png`);
  await fs.writeFile(rawPath, buffer);

  const meta = await sharp(buffer).metadata();
  const w = meta.width || BG_MAX_WIDTH;
  const h = meta.height || Math.round((BG_MAX_WIDTH * 2) / 3);
  const tw = Math.min(BG_MAX_WIDTH, w);
  const th = Math.max(1, Math.round((h * tw) / w));

  const webpPath = path.join(outDir, `${name}.webp`);
  const webpBuffer = await sharp(buffer)
    .removeAlpha()
    .resize(tw, th, { fit: 'inside', kernel: 'lanczos3' })
    .webp({ quality: BG_QUALITY, effort: 6 })
    .toBuffer();
  await fs.writeFile(webpPath, webpBuffer);

  return {
    raw: rawPath,
    webp: webpPath,
    width: tw,
    height: th,
    sizeBytes: webpBuffer.length,
  };
}
