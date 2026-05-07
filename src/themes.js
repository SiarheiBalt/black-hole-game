import { createTheme } from './themes/_factory.js';

/** @typedef {import('./themes/_factory.js').HoleThemeConfig} HoleThemeConfig */

/** @type {Record<string, import('./themes/_factory.js').HoleThemeConfig>} */
const THEMES = {
  default: createTheme({
    id: 'default',
    fieldDecorColors: [0x5eead4, 0xff7eb3],
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

/** @returns {readonly string[]} */
export function listRegisteredThemeIds() {
  return Object.keys(THEMES).slice().sort();
}

export { createTheme };
