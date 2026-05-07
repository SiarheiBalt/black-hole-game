import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium } from 'playwright';
import OpenAI from 'openai';
import { PATHS, ensureDir, log } from './lib.mjs';
import { buildVisionRubricPrompt } from './prompts.mjs';
import { measureMeanLuminance, measureContrastVsBg } from './optimize.mjs';

const execFileAsync = promisify(execFile);

/**
 * @typedef {{
 *   layer: 'static' | 'render' | 'vision',
 *   pass: boolean,
 *   issues: { asset?: string, note: string }[],
 *   artifacts?: Record<string, string>,
 * }} QaLayerResult
 */

/**
 * @typedef {{ pass: boolean, layers: QaLayerResult[], assetIssues: Record<string, string[]>, screenshots: string[] }} QaResult
 */

const STATIC_RULES = {
  iconMaxBytes: 80 * 1024,
  iconMaxEdge: 320,
  bgMaxBytes: 350 * 1024,
  bgMaxWidth: 960,
  cornerAlphaMax: 16,
  meanContentAlphaMin: 0.12,
};

/**
 * @param {{ assetDir: string }} args
 * @returns {Promise<QaLayerResult>}
 */
export async function runStaticChecks({ assetDir }) {
  const issues = [];
  const requiredIcons = ['sphere', 'trump', 'money', 'poop'];
  const optionalIcons = ['decor_cube', 'decor_triangle'];
  for (const kind of [...requiredIcons, ...optionalIcons]) {
    const file = path.join(assetDir, `${kind}.webp`);
    const optional = optionalIcons.includes(kind);
    try {
      await fs.access(file);
    } catch {
      if (!optional) {
        issues.push({ asset: kind, note: `Icon ${kind}.webp missing` });
      }
      continue;
    }
    try {
      const stat = await fs.stat(file);
      if (stat.size > STATIC_RULES.iconMaxBytes) {
        issues.push({
          asset: kind,
          note: `Icon ${kind} too large: ${(stat.size / 1024).toFixed(1)} KB > ${STATIC_RULES.iconMaxBytes / 1024} KB`,
        });
      }
      const meta = await sharp(file).metadata();
      const longEdge = Math.max(meta.width || 0, meta.height || 0);
      if (longEdge > STATIC_RULES.iconMaxEdge) {
        issues.push({
          asset: kind,
          note: `Icon ${kind} too large: ${longEdge}px > ${STATIC_RULES.iconMaxEdge}px`,
        });
      }
      if (!meta.hasAlpha) {
        issues.push({ asset: kind, note: `Icon ${kind} missing alpha channel` });
      }
      const alphaCheck = await checkIconAlpha(file);
      if (alphaCheck.cornerAlpha > STATIC_RULES.cornerAlphaMax) {
        issues.push({
          asset: kind,
          note: `Icon ${kind} has background bleed (corner alpha mean ${alphaCheck.cornerAlpha.toFixed(1)}/255)`,
        });
      }
      if (alphaCheck.contentAlpha < STATIC_RULES.meanContentAlphaMin) {
        issues.push({
          asset: kind,
          note: `Icon ${kind} subject too small / mostly transparent (content alpha ${alphaCheck.contentAlpha.toFixed(2)})`,
        });
      }
    } catch (err) {
      issues.push({ asset: kind, note: `Icon ${kind} unreadable: ${err.message}` });
    }
  }
  // Background can be either bg.svg (parametric) or bg.webp (raster fallback).
  const svgPath = path.join(assetDir, 'bg.svg');
  const webpPath = path.join(assetDir, 'bg.webp');
  let bgPath = svgPath;
  let bgIsSvg = false;
  try {
    await fs.access(svgPath);
    bgIsSvg = true;
  } catch {
    bgPath = webpPath;
  }
  try {
    const stat = await fs.stat(bgPath);
    if (!bgIsSvg && stat.size > STATIC_RULES.bgMaxBytes) {
      issues.push({
        asset: 'background',
        note: `BG too large: ${(stat.size / 1024).toFixed(1)} KB > ${STATIC_RULES.bgMaxBytes / 1024} KB`,
      });
    }
    if (!bgIsSvg) {
      const meta = await sharp(bgPath).metadata();
      if ((meta.width || 0) > STATIC_RULES.bgMaxWidth) {
        issues.push({
          asset: 'background',
          note: `BG too wide: ${meta.width}px > ${STATIC_RULES.bgMaxWidth}px`,
        });
      }
    }
  } catch (err) {
    issues.push({ asset: 'background', note: `BG unreadable: ${err.message}` });
  }
  return { layer: 'static', pass: issues.length === 0, issues };
}

async function checkIconAlpha(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .resize(96, 96, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const stride = info.channels;
  const w = info.width;
  const h = info.height;
  let cornerSum = 0;
  let cornerN = 0;
  const sampleCorner = (x0, y0) => {
    for (let y = y0; y < y0 + 8 && y < h; y += 1) {
      for (let x = x0; x < x0 + 8 && x < w; x += 1) {
        const i = (y * w + x) * stride + 3;
        cornerSum += data[i];
        cornerN += 1;
      }
    }
  };
  sampleCorner(0, 0);
  sampleCorner(w - 8, 0);
  sampleCorner(0, h - 8);
  sampleCorner(w - 8, h - 8);
  let contentSum = 0;
  let contentN = 0;
  for (let i = 3; i < data.length; i += stride) {
    contentSum += data[i];
    contentN += 1;
  }
  return {
    cornerAlpha: cornerN ? cornerSum / cornerN : 0,
    contentAlpha: contentN ? contentSum / contentN / 255 : 0,
  };
}

/**
 * Builds the theme via vite + opens dist/index.html in headless chromium and
 * makes a few screenshots. Returns paths.
 * @param {{ id: string, runDir: string }} args
 * @returns {Promise<QaLayerResult>}
 */
export async function runHeadlessRender({ id, runDir }) {
  const issues = [];
  const screenshotsDir = path.join(runDir, 'screenshots');
  await ensureDir(screenshotsDir);

  try {
    await execFileAsync('npm', ['run', `build:${id}`], { cwd: PATHS.repoRoot, env: process.env });
  } catch (err) {
    return {
      layer: 'render',
      pass: false,
      issues: [{ asset: 'general', note: `vite build failed: ${err.shortMessage || err.message}` }],
    };
  }

  const distHtml = path.join(PATHS.distDir, 'index.html');
  try {
    await fs.access(distHtml);
  } catch {
    return {
      layer: 'render',
      pass: false,
      issues: [{ asset: 'general', note: 'dist/index.html not found after build' }],
    };
  }

  let browser;
  const screenshots = [];
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    const fileUrl = 'file://' + distHtml;
    await page.goto(fileUrl, { waitUntil: 'load' });
    await page.waitForSelector('canvas.pixi-layer', { timeout: 10000 });
    await page.waitForTimeout(1500);
    const t0 = path.join(screenshotsDir, 't0.png');
    await page.screenshot({ path: t0, fullPage: false });
    screenshots.push(t0);

    const w = 390;
    const h = 844;
    await page.mouse.move(w / 2, h / 2);
    await page.mouse.down();
    for (let i = 1; i <= 8; i += 1) {
      await page.mouse.move(w / 2 + i * 4, h / 2 + i * 3, { steps: 2 });
      await page.waitForTimeout(60);
    }
    await page.mouse.up();
    await page.waitForTimeout(1500);
    const t2 = path.join(screenshotsDir, 't2.png');
    await page.screenshot({ path: t2, fullPage: false });
    screenshots.push(t2);

    await page.waitForTimeout(2000);
    const t4 = path.join(screenshotsDir, 't4.png');
    await page.screenshot({ path: t4, fullPage: false });
    screenshots.push(t4);

    const heur = await checkScreenshotHeuristics(t2);
    if (!heur.pass) issues.push(...heur.issues.map((n) => ({ asset: 'general', note: n })));
  } catch (err) {
    issues.push({ asset: 'general', note: `Playwright failed: ${err.message}` });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  return {
    layer: 'render',
    pass: issues.length === 0,
    issues,
    artifacts: Object.fromEntries(screenshots.map((s, i) => [`screenshot_${i}`, s])),
  };
}

async function checkScreenshotHeuristics(file) {
  const issues = [];
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const stride = info.channels;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  let varSum = 0;
  let prev = -1;
  let satSum = 0;
  for (let i = 0; i < data.length; i += stride) {
    const cr = data[i];
    const cg = data[i + 1];
    const cb = data[i + 2];
    r += cr;
    g += cg;
    b += cb;
    const max = Math.max(cr, cg, cb);
    const min = Math.min(cr, cg, cb);
    satSum += max === 0 ? 0 : (max - min) / max;
    const lum = (cr + cg + cb) / 3;
    if (prev !== -1) varSum += (lum - prev) * (lum - prev);
    prev = lum;
    n += 1;
  }
  const meanLum = (r + g + b) / (3 * n);
  const meanSat = satSum / n;
  if (varSum / n < 4) {
    issues.push('Screenshot looks blank or solid color (variance too low).');
  }
  if (meanSat < 0.06) {
    issues.push(`Screenshot too desaturated (mean saturation ${meanSat.toFixed(3)}).`);
  }
  if (meanLum < 4) {
    issues.push('Screenshot is essentially black.');
  }
  return { pass: issues.length === 0, issues };
}

const CONTRAST_RULES = {
  /** Минимальный alpha-weighted mean(|L_pixel - L_bg|) (0..1). 0.20 — комфортно
   *  читаемая иконка с outline; 0.10 — минимум при котором глаз ещё «отрывает»
   *  иконку от фона благодаря обводке. */
  minDelta: 0.18,
  /** Какие ассеты обязаны проходить проверку. */
  iconKinds: /** @type {const} */ ([
    'sphere',
    'trump',
    'money',
    'poop',
    'decor_cube',
    'decor_triangle',
  ]),
  /** Ширина центральной выборки фона (px) — представляет «комфортную зону карты». */
  bgSampleSize: 256,
};

/**
 * Compares mean luminance of each icon (mask-weighted, opaque pixels only) to
 * the bg's central sample. Failures attribute to the icon — the retry budget
 * uses these to schedule a stronger contrast pass on subsequent attempts.
 *
 * @param {{ assetDir: string }} args
 * @returns {Promise<QaLayerResult>}
 */
export async function runContrastCheck({ assetDir }) {
  const issues = [];
  let bgLum = null;
  /** @type {Record<string, { lum: number, delta: number }>} */
  const perAsset = {};

  let bgPath = path.join(assetDir, 'bg.svg');
  try {
    await fs.access(bgPath);
  } catch {
    bgPath = path.join(assetDir, 'bg.webp');
  }

  try {
    const sample = CONTRAST_RULES.bgSampleSize;
    const { data, info } = await sharp(bgPath)
      .resize(sample * 2, sample * 2, { fit: 'cover', position: 'center' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    const stride = info.channels;
    const x0 = Math.floor((w - sample) / 2);
    const y0 = Math.floor((h - sample) / 2);
    let sum = 0;
    let n = 0;
    for (let y = y0; y < y0 + sample; y += 1) {
      for (let x = x0; x < x0 + sample; x += 1) {
        const i = (y * w + x) * stride;
        sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        n += 1;
      }
    }
    bgLum = n > 0 ? sum / n / 255 : 0.5;
  } catch (err) {
    return {
      layer: 'contrast',
      pass: false,
      issues: [{ asset: 'background', note: `Contrast bg unreadable: ${err.message}` }],
    };
  }

  for (const kind of CONTRAST_RULES.iconKinds) {
    const file = path.join(assetDir, `${kind}.webp`);
    try {
      await fs.access(file);
    } catch {
      perAsset[kind] = { lum: -1, delta: 0 };
      continue;
    }
    try {
      const buf = await fs.readFile(file);
      const lum = await measureMeanLuminance(buf);
      const delta = await measureContrastVsBg(buf, bgLum);
      perAsset[kind] = { lum, delta };
      if (delta < CONTRAST_RULES.minDelta) {
        issues.push({
          asset: kind,
          note: `Low contrast for ${kind} (icon L=${lum.toFixed(2)} vs bg L=${bgLum.toFixed(
            2,
          )} → weighted Δ=${delta.toFixed(2)} < ${CONTRAST_RULES.minDelta})`,
        });
      }
    } catch (err) {
      issues.push({ asset: kind, note: `Contrast check failed for ${kind}: ${err.message}` });
    }
  }

  return {
    layer: 'contrast',
    pass: issues.length === 0,
    issues,
    artifacts: {
      bgLum: String(bgLum?.toFixed(3) ?? 'n/a'),
      perAsset: JSON.stringify(perAsset),
    },
  };
}

/**
 * @param {{ brief: object, screenshotPath: string }} args
 * @returns {Promise<QaLayerResult>}
 */
export async function runVisionRubric({ brief, screenshotPath }) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      layer: 'vision',
      pass: true,
      issues: [{ asset: 'general', note: 'Vision rubric skipped: OPENAI_API_KEY missing.' }],
    };
  }
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const buf = await fs.readFile(screenshotPath);
    const dataUrl = `data:image/png;base64,${buf.toString('base64')}`;
    const model = process.env.THEME_GEN_VISION_MODEL || 'gpt-4o-mini';
    const resp = await client.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildVisionRubricPrompt(brief) },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    });
    const txt = resp.choices?.[0]?.message?.content || '{}';
    /** @type {{ pass?: boolean, issues?: { asset?: string, note?: string }[] }} */
    let parsed;
    try {
      parsed = JSON.parse(txt);
    } catch {
      return {
        layer: 'vision',
        pass: false,
        issues: [{ asset: 'general', note: `Vision returned non-JSON: ${txt.slice(0, 200)}` }],
      };
    }
    const issues = (parsed.issues ?? []).map((i) => ({
      asset: i.asset || 'general',
      note: i.note || 'unspecified',
    }));
    return { layer: 'vision', pass: !!parsed.pass, issues };
  } catch (err) {
    log('warn', `Vision rubric error: ${err.message}; treating layer as warning-only.`);
    return {
      layer: 'vision',
      pass: true,
      issues: [{ asset: 'general', note: `Vision rubric error: ${err.message}` }],
    };
  }
}

/**
 * @param {{ id: string, brief: object, assetDir: string, runDir: string, skipVision?: boolean }} args
 * @returns {Promise<QaResult>}
 */
export async function qaTheme({ id, brief, assetDir, runDir, skipVision }) {
  const layers = [];
  const stat = await runStaticChecks({ assetDir });
  layers.push(stat);
  let contrast = null;
  let render = null;
  let vision = null;
  if (stat.pass) {
    contrast = await runContrastCheck({ assetDir });
    layers.push(contrast);
    if (contrast.pass) {
      render = await runHeadlessRender({ id, runDir });
      layers.push(render);
      if (render.pass && !skipVision) {
        const screenshot = render.artifacts?.screenshot_1 || render.artifacts?.screenshot_0;
        if (screenshot) {
          vision = await runVisionRubric({ brief, screenshotPath: screenshot });
          layers.push(vision);
        }
      }
    } else {
      log(
        'warn',
        `Contrast QA failed for ${id}; skipping render+vision until contrast is fixed.`,
      );
    }
  } else {
    log('warn', `Static QA failed for ${id}; skipping render+vision until icons are valid.`);
  }
  const assetIssues = {};
  for (const layer of layers) {
    for (const iss of layer.issues) {
      const k = iss.asset || 'general';
      if (!assetIssues[k]) assetIssues[k] = [];
      assetIssues[k].push(`[${layer.layer}] ${iss.note}`);
    }
  }
  const pass = layers.every((l) => l.pass);
  const screenshots = render?.artifacts ? Object.values(render.artifacts) : [];
  return { pass, layers, assetIssues, screenshots };
}
