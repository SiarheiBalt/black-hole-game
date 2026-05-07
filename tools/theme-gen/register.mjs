import path from 'node:path';
import fs from 'node:fs/promises';
import { PATHS, ensureDir, log, readJson, writeJson } from './lib.mjs';

/**
 * Записывает ассеты темы (копией оптимизированных webp + сгенерированный SVG-фон) в
 * `src/assets/themes/<id>/`, генерирует `src/themes/generated/<id>.js`, `.env.<id>`
 * и добавляет `package.json` scripts.build:<id>.
 *
 * @param {{
 *   id: string,
 *   brief: object,
 *   icons: { sphere?: string, trump: string, money: string, poop: string },
 *   decor?: { cube?: string, triangle?: string } | null,
 *   bgSvgPath?: string | null,
 *   bgWebpPath?: string | null,
 *   palette: {
 *     sphereColors: number[],
 *     fieldDecorColors: number[],
 *     backgroundColor: number,
 *     accentColor?: number,
 *   },
 * }} args
 * @returns {Promise<{ assetDir: string, themeFile: string, envFile: string }>}
 */
export async function registerTheme(args) {
  const { id, brief, icons, decor, bgSvgPath, bgWebpPath, palette } = args;
  const assetDir = path.join(PATHS.assetsThemesDir, id);
  await ensureDir(assetDir);

  let sphereRel = null;
  if (icons.sphere) {
    await fs.copyFile(icons.sphere, path.join(assetDir, 'sphere.webp'));
    sphereRel = 'sphere.webp';
  } else {
    await fs.rm(path.join(assetDir, 'sphere.webp')).catch(() => {});
  }
  await fs.copyFile(icons.trump, path.join(assetDir, 'trump.webp'));
  await fs.copyFile(icons.money, path.join(assetDir, 'money.webp'));
  await fs.copyFile(icons.poop, path.join(assetDir, 'poop.webp'));

  let cubeRel = null;
  let triangleRel = null;
  if (decor?.cube) {
    await fs.copyFile(decor.cube, path.join(assetDir, 'decor_cube.webp'));
    cubeRel = 'decor_cube.webp';
  } else {
    await fs.rm(path.join(assetDir, 'decor_cube.webp')).catch(() => {});
  }
  if (decor?.triangle) {
    await fs.copyFile(decor.triangle, path.join(assetDir, 'decor_triangle.webp'));
    triangleRel = 'decor_triangle.webp';
  } else {
    await fs.rm(path.join(assetDir, 'decor_triangle.webp')).catch(() => {});
  }

  let bgFile = null;
  if (bgSvgPath) {
    await fs.copyFile(bgSvgPath, path.join(assetDir, 'bg.svg'));
    bgFile = 'bg.svg';
    await fs.rm(path.join(assetDir, 'bg.webp')).catch(() => {});
  } else if (bgWebpPath) {
    await fs.copyFile(bgWebpPath, path.join(assetDir, 'bg.webp'));
    bgFile = 'bg.webp';
  }

  const themeFile = path.join(PATHS.generatedThemesDir, `${id}.js`);
  await ensureDir(PATHS.generatedThemesDir);
  await fs.writeFile(
    themeFile,
    renderThemeModule({
      id,
      brief,
      palette,
      bgFile,
      sphereRel,
      cubeRel,
      triangleRel,
    }),
  );

  const envFile = path.join(PATHS.repoRoot, `.env.${id}`);
  await fs.writeFile(envFile, `VITE_THEME=${id}\n`);

  await addBuildScript(id);

  log('ok', `Registered theme "${id}":`, path.relative(PATHS.repoRoot, themeFile));

  return { assetDir, themeFile, envFile };
}

function renderThemeModule({ id, brief, palette, bgFile, sphereRel, cubeRel, triangleRel }) {
  const sphere = palette.sphereColors.map(toHexLiteral).join(', ');
  const decor = palette.fieldDecorColors.map(toHexLiteral).join(', ');
  const bgColor = toHexLiteral(palette.backgroundColor);
  const decorColor = toHexLiteral(deriveDecorColor(palette));
  const playfield = brief?.playfield ?? {};
  const starColor =
    typeof playfield.starColor === 'number' ? toHexLiteral(playfield.starColor) : '0xffffff';
  const starAlpha = numberOrDefault(playfield.starAlpha, 0.3);
  const starCount = numberOrDefault(playfield.starCount, 40);
  const starSize = numberOrDefault(playfield.starSize, 1.2);
  const decorDensity = numberOrDefault(playfield.decorDensity, 0.35);
  const decorAlpha = numberOrDefault(playfield.decorAlpha, 0.55);
  const displayName = brief.displayName ? ` (${brief.displayName})` : '';

  const decorImports = [];
  if (cubeRel) {
    decorImports.push(
      `const decorCubeAsset = new URL('../../assets/themes/${id}/${cubeRel}', import.meta.url).href;`,
    );
  }
  if (triangleRel) {
    decorImports.push(
      `const decorTriangleAsset = new URL('../../assets/themes/${id}/${triangleRel}', import.meta.url).href;`,
    );
  }

  let bgLine = '';
  let backgroundImageField = '';
  if (bgFile) {
    bgLine = `const bgAsset    = new URL('../../assets/themes/${id}/${bgFile}',    import.meta.url).href;`;
    backgroundImageField = '\n    backgroundImage: bgAsset,';
  }

  let sphereLine = '';
  let sphereAssetField = '';
  let hudSphereField = '';
  if (sphereRel) {
    sphereLine = `const sphereAsset = new URL('../../assets/themes/${id}/${sphereRel}', import.meta.url).href;`;
    sphereAssetField = '\n  sphereAsset,';
    hudSphereField = '\n    sphere: sphereAsset,';
  }

  let fieldDecorAssetsField = '';
  let hudDecorCubeField = '';
  let hudDecorTriangleField = '';
  if (cubeRel || triangleRel) {
    const parts = [];
    if (cubeRel) parts.push('    cube: decorCubeAsset,');
    if (triangleRel) parts.push('    triangle: decorTriangleAsset,');
    fieldDecorAssetsField = `\n  fieldDecorAssets: {\n${parts.join('\n')}\n  },`;
  }
  if (cubeRel) hudDecorCubeField = '\n    decorCube: decorCubeAsset,';
  if (triangleRel) hudDecorTriangleField = '\n    decorTriangle: decorTriangleAsset,';

  // Generated themes use bigger 3D icons by default — the prior 1.0 scale read
  // as tiny dots on small screens.
  const collectibleScaleField = `
  collectibleScaleByKind: {
    sphere: 1.85,
    planar: 1.2,
    trump: 1.18,
    poop: 1.18,
  },`;
  const fieldDecorScaleField = `
  fieldDecorScaleByKind: {
    cube: 1.25,
    triangle: 1.45,
  },`;

  return `// AUTOGENERATED by tools/theme-gen — do not edit by hand.
// Source brief: tools/theme-gen/briefs/${id}.json${displayName}
import { createTheme } from '../_factory.js';

const trumpAsset = new URL('../../assets/themes/${id}/trump.webp', import.meta.url).href;
const moneyAsset = new URL('../../assets/themes/${id}/money.webp', import.meta.url).href;
const poopAsset  = new URL('../../assets/themes/${id}/poop.webp',  import.meta.url).href;
${sphereLine}
${bgLine}
${decorImports.join('\n')}

export default createTheme({
  id: '${id}',
  sphereColors: [${sphere}],
${sphereAssetField}
  fieldDecorColors: [${decor}],
  assetReplacements: {
    '1': trumpAsset,
    '2': moneyAsset,
    '3': poopAsset,
  },${fieldDecorAssetsField}${collectibleScaleField}${fieldDecorScaleField}
  playfieldTheme: {
    backgroundColor: ${bgColor},${backgroundImageField}
    decorColor: ${decorColor},
    starColor: ${starColor},
    starAlpha: ${starAlpha},
    starCount: ${starCount},
    starSize: ${starSize},
    decorDensity: ${decorDensity},
    decorAlpha: ${decorAlpha},
  },
  hudIcons: {
    planar: moneyAsset,
    trump: trumpAsset,
    poop: poopAsset,${hudSphereField}${hudDecorCubeField}${hudDecorTriangleField}
  },
});
`;
}

/**
 * Цвет «декоративных пятен» поля (createPlayfield → rebuildDecor). Берём
 * `backgroundColor` темы, чуть осветляем — так пятна читаются как лёгкая
 * фактура поверх bg, а не как отдельный слой.
 */
function deriveDecorColor(palette) {
  const v = (Number(palette.backgroundColor) | 0) >>> 0;
  const r = Math.min(255, Math.round(((v >> 16) & 0xff) * 1.2 + 18));
  const g = Math.min(255, Math.round(((v >> 8) & 0xff) * 1.2 + 18));
  const b = Math.min(255, Math.round((v & 0xff) * 1.2 + 18));
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

function toHexLiteral(n) {
  const v = (Number(n) | 0) >>> 0;
  return `0x${v.toString(16).padStart(6, '0')}`;
}

function numberOrDefault(v, dflt) {
  return typeof v === 'number' && Number.isFinite(v) ? String(v) : String(dflt);
}

async function addBuildScript(id) {
  const pkgPath = PATHS.packageJson;
  const pkg = await readJson(pkgPath);
  pkg.scripts = pkg.scripts || {};
  const key = `build:${id}`;
  const cmd = `cross-env VITE_THEME=${id} vite build`;
  if (pkg.scripts[key] === cmd) return;
  pkg.scripts[key] = cmd;
  pkg.scripts = sortScripts(pkg.scripts);
  await writeJson(pkgPath, pkg);
}

function sortScripts(scripts) {
  const priority = ['dev', 'build', 'theme:gen'];
  const keys = Object.keys(scripts);
  keys.sort((a, b) => {
    const pa = priority.indexOf(a);
    const pb = priority.indexOf(b);
    if (pa !== -1 || pb !== -1) {
      return (pa === -1 ? 1e9 : pa) - (pb === -1 ? 1e9 : pb);
    }
    if (a.startsWith('build:') && b.startsWith('build:')) return a.localeCompare(b);
    if (a.startsWith('build:')) return -1;
    if (b.startsWith('build:')) return 1;
    return a.localeCompare(b);
  });
  const out = {};
  for (const k of keys) out[k] = scripts[k];
  return out;
}
