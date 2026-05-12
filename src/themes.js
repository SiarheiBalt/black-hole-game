import { createTheme } from './themes/_factory.js';

/** @typedef {import('./themes/_factory.js').HoleThemeConfig} HoleThemeConfig */

const trumpAsset = new URL('./assets/themes/default/trump.webp', import.meta.url).href;
const moneyAsset = new URL('./assets/themes/default/money.webp', import.meta.url).href;
const poopAsset  = new URL('./assets/themes/default/poop.webp',  import.meta.url).href;
const sphereAsset = new URL('./assets/themes/default/sphere.webp', import.meta.url).href;
const decorCubeAsset = new URL('./assets/themes/default/decor_cube.webp', import.meta.url).href;
const decorTriangleAsset = new URL('./assets/themes/default/decor_triangle.webp', import.meta.url).href;

/** @type {Record<string, import('./themes/_factory.js').HoleThemeConfig>} */
const THEMES = {
  default: createTheme({
    id: 'default',
    sphereAsset,
    fieldDecorColors: [0x5eead4, 0xff7eb3],
    assetReplacements: {
      '1': trumpAsset,
      '2': moneyAsset,
      '3': poopAsset,
    },
    fieldDecorAssets: {
      cube: decorCubeAsset,
      triangle: decorTriangleAsset,
    },
    collectibleScaleByKind: {
      sphere: 1.85,
      planar: 1.2,
      trump: 1.18,
      poop: 1.18,
    },
    fieldDecorScaleByKind: {
      cube: 1.25,
      triangle: 1.45,
    },
    hudIcons: {
      planar: moneyAsset,
      trump: trumpAsset,
      poop: poopAsset,
      sphere: sphereAsset,
      decorCube: decorCubeAsset,
      decorTriangle: decorTriangleAsset,
    },
    musicVolume: 0.7,
  }),
};

/**
 * В dev подгружает все темы (`registry.dev.js`). В production — виртуальный модуль
 * `virtual:active-theme`: ровно один `generated|manual` и один `music.mp3` в графе.
 */
export async function initThemes() {
  if (import.meta.env.DEV) {
    const { applyDevThemes } = await import('./themes/registry.dev.js');
    applyDevThemes(THEMES);
  } else {
    const { applyActiveTheme } = await import('virtual:active-theme');
    applyActiveTheme(THEMES);
  }
}

export const DEFAULT_HOLE_THEME = THEMES.default;
export const DEFAULT_PLAYFIELD_THEME = THEMES.default.playfieldTheme;
export const DEFAULT_HUD_ICONS = THEMES.default.hudIcons;

export function getThemeConfig(name = 'default') {
  return THEMES[name] ?? DEFAULT_HOLE_THEME;
}
