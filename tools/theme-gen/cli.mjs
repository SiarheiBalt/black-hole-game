#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {
  PATHS,
  ICON_KINDS,
  ensureDir,
  log,
  readJson,
  timestamp,
  validateId,
} from './lib.mjs';
import {
  buildIconPrompt,
  buildBackgroundPrompt,
  buildDecorPrompt,
} from './prompts.mjs';
import { generateIcon, generateBackground } from './imageGen.mjs';
import { optimizeIcon, optimizeBackground } from './optimize.mjs';
import {
  extractSphereColors,
  extractFieldDecorColors,
  extractBackgroundFillColor,
} from './palette.mjs';
import { registerTheme } from './register.mjs';
import { qaTheme } from './qa.mjs';
import { writeThemeReport, writeIndexReport } from './report.mjs';
import { runSvgBg } from './svgBg/index.mjs';

const DEFAULT_RETRIES = 3;
const SPHERE_ICON_KIND = 'sphere';
const DECOR_KINDS = /** @type {const} */ (['decor_cube', 'decor_triangle']);
const ALL_ICON_KINDS = [SPHERE_ICON_KIND, ...ICON_KINDS, ...DECOR_KINDS];

/**
 * Контраст-pass с прогрессивным усилением: на 0-й попытке мягкий outline+тень,
 * каждая следующая итерация усиливает обводку и тень — это используется когда
 * QA-проверка контраста сообщает «недостаточно ΔL». Радиус ограничен сверху,
 * чтобы дилатация не выползала в угловые 8x8 семплы (cornerAlpha проверка).
 */
function contrastOptionsForAttempt(attempt, extras = {}) {
  const a = Math.max(0, Math.min(3, attempt));
  return {
    outlineRadius: Math.min(4, 3 + a),
    outlineAlpha: Math.min(0.95, 0.78 + 0.06 * a),
    shadowOffset: Math.min(5, 4 + a),
    shadowBlur: Math.min(5, 4 + a),
    shadowAlpha: Math.min(0.45, 0.28 + 0.06 * a),
    ...extras,
  };
}

function parseArgs(argv) {
  const args = {
    brief: null,
    only: null,
    all: false,
    retries: DEFAULT_RETRIES,
    skipQa: false,
    skipVision: false,
    fromStaged: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--all') args.all = true;
    else if (a === '--brief') args.brief = argv[++i];
    else if (a === '--only') args.only = argv[++i];
    else if (a === '--retries') args.retries = parseInt(argv[++i], 10) || DEFAULT_RETRIES;
    else if (a === '--no-qa') args.skipQa = true;
    else if (a === '--no-vision') args.skipVision = true;
    else if (a === '--from-staged') args.fromStaged = argv[++i];
    else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${a}`);
      printHelp();
      process.exit(2);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  npm run theme:gen -- --all                     Run every brief in tools/theme-gen/briefs/
  npm run theme:gen -- --brief <path>            Run a single brief by file path
  npm run theme:gen -- --only <id>               Run a single brief by id (briefs/<id>.json)
  npm run theme:gen -- --retries N               Per-asset retry budget (default ${DEFAULT_RETRIES})
  npm run theme:gen -- --no-qa                   Skip QA gate (assets are still produced)
  npm run theme:gen -- --no-vision               Skip the vision rubric layer only
  npm run theme:gen -- --from-staged <dir>       Skip image-gen and read pre-staged PNGs from
                                                 <dir>/<id>/{sphere,trump,money,poop,decor_cube,decor_triangle}.png
                                                 (background is always parametric SVG, no PNG needed.)

Env:
  OPENAI_API_KEY          required for image generation and the vision rubric
  THEME_GEN_BACKEND       openai (default) | agent
  THEME_GEN_IMAGE_MODEL   override gpt-image-1
  THEME_GEN_VISION_MODEL  override gpt-4o-mini
`);
}

async function loadBriefs(args) {
  if (args.brief) {
    const brief = await readJson(args.brief);
    return [brief];
  }
  if (args.only) {
    const brief = await readJson(path.join(PATHS.briefsDir, `${args.only}.json`));
    return [brief];
  }
  if (args.all) {
    const files = (await fs.readdir(PATHS.briefsDir)).filter((f) => f.endsWith('.json'));
    files.sort();
    const out = [];
    for (const f of files) out.push(await readJson(path.join(PATHS.briefsDir, f)));
    return out;
  }
  console.error('No brief selected. Use --all, --only <id>, or --brief <path>.');
  process.exit(2);
}

/**
 * Генерация одного ассета (icon | decor) через OpenAI с ретраями.
 * @param {{ kind: string, brief: object, runDir: string, attempts: any[], retries: number }} args
 */
async function generateAssetWithRetries({ kind, brief, runDir, attempts, retries, bgLuminance }) {
  const outDir = path.join(runDir, 'raw');
  let issues = [];
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const prompt = promptFor({ kind, brief, attempt, issues });
    log('info', `Generating ${kind} (attempt ${attempt + 1}/${retries})`);
    let buf;
    try {
      buf = await generateIcon({ prompt });
    } catch (err) {
      issues = [`generation error: ${err.message}`];
      attempts.push({ kind, attempt, prompt, ok: false, issues });
      log('warn', `${kind} generation failed: ${err.message}`);
      continue;
    }
    const result = await optimizeIcon({
      buffer: buf,
      outDir,
      name: kind,
      contrast: contrastOptionsForAttempt(0, { bgLuminance }),
    });
    const validation = await quickValidate(result, false);
    if (validation.ok) {
      attempts.push({ kind, attempt, prompt, ok: true, issues: [] });
      return { rawPath: result.raw, webpPath: result.webp };
    }
    issues = validation.issues;
    attempts.push({ kind, attempt, prompt, ok: false, issues });
    log('warn', `${kind} attempt ${attempt + 1} rejected: ${issues.join('; ')}`);
  }
  throw new Error(`Exhausted retries generating ${kind}.`);
}

function promptFor({ kind, brief, attempt, issues }) {
  if (kind === SPHERE_ICON_KIND || ICON_KINDS.includes(kind)) {
    return buildIconPrompt({ assetKind: kind, brief, attempt, issues });
  }
  if (DECOR_KINDS.includes(kind)) {
    const decorKind = kind === 'decor_cube' ? 'cube' : 'triangle';
    return buildDecorPrompt({ decorKind, brief, attempt, issues });
  }
  if (kind === 'background') {
    return buildBackgroundPrompt({ brief, attempt, issues });
  }
  throw new Error(`Unknown asset kind: ${kind}`);
}

async function quickValidate(file, isBg) {
  const meta = await sharp(file.webp).metadata();
  const issues = [];
  if (isBg) {
    if ((meta.width || 0) > 960) issues.push('background wider than 960px after optimize');
  } else {
    if (!meta.hasAlpha) issues.push('icon missing alpha channel');
    const { data, info } = await sharp(file.webp)
      .ensureAlpha()
      .resize(96, 96, { fit: 'inside' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    let cornerSum = 0;
    let cornerN = 0;
    const sampleCorner = (x0, y0) => {
      for (let y = y0; y < y0 + 8 && y < info.height; y += 1) {
        for (let x = x0; x < x0 + 8 && x < info.width; x += 1) {
          cornerSum += data[(y * info.width + x) * info.channels + 3];
          cornerN += 1;
        }
      }
    };
    sampleCorner(0, 0);
    sampleCorner(info.width - 8, 0);
    sampleCorner(0, info.height - 8);
    sampleCorner(info.width - 8, info.height - 8);
    let contentSum = 0;
    let contentN = 0;
    for (let i = 3; i < data.length; i += info.channels) {
      contentSum += data[i];
      contentN += 1;
    }
    const cornerAlpha = cornerSum / Math.max(1, cornerN);
    const contentAlpha = contentSum / Math.max(1, contentN) / 255;
    if (cornerAlpha > 16) {
      issues.push(`background bleed at corners (alpha ${cornerAlpha.toFixed(1)}/255)`);
    }
    if (contentAlpha < 0.12) issues.push('subject too small / mostly transparent');
  }
  return { ok: issues.length === 0, issues };
}

async function processBrief({ brief, runDir, retries, skipQa, skipVision, fromStaged }) {
  validateId(brief.id);
  log('info', `=== ${brief.id} (${brief.displayName ?? ''}) ===`);
  await ensureDir(runDir);
  const rawDir = path.join(runDir, 'raw');
  await ensureDir(rawDir);

  const attempts = [];

  // Build the bg first so we know its luminance — that's what tells the contrast
  // post-process which way to color the outline. Doing this BEFORE optimizing
  // icons means the very first contrast pass already opposes the bg correctly.
  const bg = await runBgPipeline({ brief, runDir, attempts });
  const bgLuminance = await sampleBgLuminance(bg.rasterBuffer);

  /** @type {Record<string, { rawPath: string, webpPath: string }>} */
  const assetPaths = {};

  if (fromStaged) {
    const stagedDir = path.join(fromStaged, brief.id);
    log('info', `Using staged assets from ${stagedDir}`);
    for (const kind of ALL_ICON_KINDS) {
      const stagedFile = path.join(stagedDir, `${kind}.png`);
      try {
        await fs.access(stagedFile);
      } catch {
        if (DECOR_KINDS.includes(kind)) {
          log(
            'warn',
            `Decor ${kind} not staged for ${brief.id} — theme will fall back to 3D geometry.`,
          );
          continue;
        }
        throw new Error(`Staged file missing: ${stagedFile}`);
      }
      assetPaths[kind] = await intakeStagedIcon({
        kind,
        stagedFile,
        runDir,
        attempts,
        bgLuminance,
      });
    }
  } else {
    for (const kind of ALL_ICON_KINDS) {
      assetPaths[kind] = await generateAssetWithRetries({
        kind,
        brief,
        runDir,
        attempts,
        retries,
        bgLuminance,
      });
    }
  }

  return await finalizeBrief({
    brief,
    assetPaths,
    bg,
    bgLuminance,
    attempts,
    runDir,
    skipQa,
    skipVision,
    retries,
    fromStaged,
  });
}

async function sampleBgLuminance(rasterBuffer) {
  const sample = 256;
  const { data, info } = await sharp(rasterBuffer)
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
  return n > 0 ? sum / n / 255 : 0.5;
}

async function intakeStagedIcon({ kind, stagedFile, runDir, attempts, bgLuminance }) {
  const buf = await fs.readFile(stagedFile);
  const result = await optimizeIcon({
    buffer: buf,
    outDir: path.join(runDir, 'raw'),
    name: kind,
    contrast: contrastOptionsForAttempt(0, { bgLuminance }),
  });
  const validation = await quickValidate(result, false);
  attempts.push({
    kind,
    attempt: 0,
    prompt: `(staged file: ${stagedFile})`,
    ok: validation.ok,
    issues: validation.issues,
  });
  if (!validation.ok) {
    log('warn', `Staged ${kind} flagged: ${validation.issues.join('; ')}`);
  }
  return { rawPath: result.raw, webpPath: result.webp };
}

/**
 * Параметрический SVG bg — пишем в `runDir/raw/bg.svg`. Дополнительно
 * рендерим тот же SVG в PNG для извлечения palette / fieldDecorColors.
 */
async function runBgPipeline({ brief, runDir, attempts }) {
  const out = runSvgBg(brief, brief.id);
  const rawDir = path.join(runDir, 'raw');
  await ensureDir(rawDir);
  const svgPath = path.join(rawDir, 'bg.svg');
  await fs.writeFile(svgPath, out.svg);
  const rasterPath = path.join(rawDir, 'bg.png');
  const rasterBuf = await sharp(Buffer.from(out.svg)).png().toBuffer();
  await fs.writeFile(rasterPath, rasterBuf);
  attempts.push({
    kind: 'background',
    attempt: 0,
    prompt: `(svg generator: ${out.kind})`,
    ok: true,
    issues: [],
  });
  return {
    kind: out.kind,
    svgPath,
    rasterPath,
    rasterBuffer: rasterBuf,
    dominantHex: out.dominantHex,
    accentHex: out.accentHex,
  };
}

async function finalizeBrief({
  brief,
  assetPaths,
  bg,
  bgLuminance,
  attempts,
  runDir,
  skipQa,
  skipVision,
  retries,
  fromStaged,
}) {
  const sphereColors = await extractSphereColors([
    await fs.readFile(assetPaths.trump.webpPath),
    await fs.readFile(assetPaths.money.webpPath),
    await fs.readFile(assetPaths.poop.webpPath),
  ]);
  const fieldDecorColors = await extractFieldDecorColors(bg.rasterBuffer);
  const backgroundColor =
    typeof bg.dominantHex === 'number'
      ? bg.dominantHex
      : await extractBackgroundFillColor(bg.rasterBuffer);
  const palette = {
    sphereColors,
    fieldDecorColors,
    backgroundColor,
    accentColor: bg.accentHex,
  };

  const reg = await registerTheme({
    id: brief.id,
    brief,
    icons: {
      sphere: assetPaths.sphere?.webpPath,
      trump: assetPaths.trump.webpPath,
      money: assetPaths.money.webpPath,
      poop: assetPaths.poop.webpPath,
    },
    decor: {
      cube: assetPaths.decor_cube?.webpPath,
      triangle: assetPaths.decor_triangle?.webpPath,
    },
    bgSvgPath: bg.svgPath,
    palette,
  });

  let qa = { pass: true, layers: [], assetIssues: {}, screenshots: [] };
  if (!skipQa) {
    qa = await qaTheme({
      id: brief.id,
      brief,
      assetDir: reg.assetDir,
      runDir,
      skipVision,
    });

    let qaRound = 0;
    while (!qa.pass && qaRound < retries) {
      qaRound += 1;
      log('warn', `QA failed for ${brief.id} (round ${qaRound}); attempting recovery.`);
      const failingByLayer = layersFromQa(qa);
      const handled = await handleQaFailures({
        brief,
        runDir,
        assetPaths,
        attempts,
        failingByLayer,
        regAssetDir: reg.assetDir,
        retriesRound: qaRound,
        fromStaged,
        bgLuminance,
      });
      if (!handled) {
        log(
          'warn',
          `${brief.id}: nothing actionable to retry (failures route to non-asset layer).`,
        );
        break;
      }
      qa = await qaTheme({
        id: brief.id,
        brief,
        assetDir: reg.assetDir,
        runDir,
        skipVision,
      });
    }
  }

  const reportPath = await writeThemeReport({
    runDir,
    id: brief.id,
    brief,
    attempts,
    qa,
    palette,
  });

  return { id: brief.id, qaPass: qa.pass, reportPath };
}

function layersFromQa(qa) {
  const out = { static: [], contrast: [], render: [], vision: [] };
  for (const layer of qa.layers) {
    if (!layer.pass) {
      const bucket = out[layer.layer];
      if (bucket) bucket.push(...layer.issues);
    }
  }
  return out;
}

/**
 * Решает чем «лечить» текущий QA fail. Возвращает true если что-то сделали.
 *  - contrast → переоптимизировать виновные иконки с усиленным contrastPostProcess.
 *  - static  → если есть raw PNG, переоптимизировать заново (контр-pass поможет с
 *               cornerAlpha / contentAlpha edge-cases для агентом сгенерированных PNG).
 *  - render / vision → перегенерация изображения (только если не --from-staged).
 */
async function handleQaFailures({
  brief,
  runDir,
  assetPaths,
  attempts,
  failingByLayer,
  regAssetDir,
  retriesRound,
  fromStaged,
  bgLuminance,
}) {
  let acted = false;

  // Contrast layer: bump outline + shadow on the offending kinds.
  for (const issue of failingByLayer.contrast) {
    const kind = issue.asset;
    if (!ALL_ICON_KINDS.includes(kind)) continue;
    const src = assetPaths[kind]?.rawPath;
    if (!src) continue;
    const opts = contrastOptionsForAttempt(retriesRound, { bgLuminance });
    log(
      'info',
      `Re-running contrast pass on ${kind} (round ${retriesRound}, outlineR=${opts.outlineRadius}, ` +
        `outlineA=${opts.outlineAlpha.toFixed(2)})`,
    );
    const buf = await fs.readFile(src);
    const result = await optimizeIcon({
      buffer: buf,
      outDir: path.join(runDir, 'raw'),
      name: kind,
      contrast: opts,
    });
    assetPaths[kind] = { rawPath: result.raw, webpPath: result.webp };
    await fs.copyFile(result.webp, path.join(regAssetDir, `${kind}.webp`));
    attempts.push({
      kind,
      attempt: retriesRound + 100,
      prompt: `(contrast retry, options=${JSON.stringify(opts)})`,
      ok: true,
      issues: [issue.note],
    });
    acted = true;
  }

  // Static layer: re-run optimize with default contrast (small fixes for cornerAlpha, etc).
  for (const issue of failingByLayer.static) {
    const kind = issue.asset;
    if (!ALL_ICON_KINDS.includes(kind)) continue;
    if (acted && failingByLayer.contrast.some((c) => c.asset === kind)) continue;
    const src = assetPaths[kind]?.rawPath;
    if (!src) continue;
    log('info', `Re-optimizing ${kind} after static QA flag (round ${retriesRound}).`);
    const buf = await fs.readFile(src);
    const result = await optimizeIcon({
      buffer: buf,
      outDir: path.join(runDir, 'raw'),
      name: kind,
      contrast: contrastOptionsForAttempt(retriesRound, { bgLuminance }),
    });
    assetPaths[kind] = { rawPath: result.raw, webpPath: result.webp };
    await fs.copyFile(result.webp, path.join(regAssetDir, `${kind}.webp`));
    attempts.push({
      kind,
      attempt: retriesRound + 200,
      prompt: '(static-retry re-optimize)',
      ok: true,
      issues: [issue.note],
    });
    acted = true;
  }

  // Render / vision: re-generate via image-gen (skip if staged-only mode).
  if (!fromStaged) {
    const candidates = new Set();
    for (const layer of ['render', 'vision']) {
      for (const issue of failingByLayer[layer]) {
        if (ALL_ICON_KINDS.includes(issue.asset)) candidates.add(issue.asset);
      }
    }
    for (const kind of candidates) {
      log('info', `Regenerating ${kind} via image-gen after ${kind} render/vision flag.`);
      try {
        const result = await generateAssetWithRetries({
          kind,
          brief,
          runDir,
          attempts,
          retries: 2,
        });
        assetPaths[kind] = result;
        await fs.copyFile(result.webpPath, path.join(regAssetDir, `${kind}.webp`));
        acted = true;
      } catch (err) {
        log('warn', `${kind} regeneration failed: ${err.message}`);
      }
    }
  }

  return acted;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const briefs = await loadBriefs(args);
  log('info', `Running ${briefs.length} brief(s).`);

  const stamp = timestamp();
  const runRoot = path.join(PATHS.runsRoot, stamp);
  await ensureDir(runRoot);
  const summaries = [];

  for (const brief of briefs) {
    const runDir = path.join(runRoot, brief.id);
    try {
      const result = await processBrief({
        brief,
        runDir,
        retries: args.retries,
        skipQa: args.skipQa,
        skipVision: args.skipVision,
        fromStaged: args.fromStaged,
      });
      summaries.push(result);
      log(result.qaPass ? 'ok' : 'warn', `${brief.id}: ${result.qaPass ? 'PASS' : 'FAIL'}`);
    } catch (err) {
      log('error', `${brief.id} failed: ${err.message}`);
      summaries.push({
        id: brief.id,
        qaPass: false,
        reportPath: path.join(runDir, 'report.md'),
      });
      await fs
        .writeFile(
          path.join(runDir, 'report.md'),
          `# ${brief.id} — fatal error\n\n${err.stack || err.message}\n`,
        )
        .catch(() => {});
    }
  }

  const indexPath = await writeIndexReport({ runDir: runRoot, themes: summaries });
  log('ok', `Run complete. Index: ${indexPath}`);
  const failed = summaries.filter((s) => !s.qaPass);
  if (failed.length) {
    log('warn', `Failed themes: ${failed.map((s) => s.id).join(', ')}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  log('error', err.stack || err.message);
  process.exit(1);
});
