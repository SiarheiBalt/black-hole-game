import path from 'node:path';
import fs from 'node:fs';

const VIRTUAL = '\0virtual:active-theme';

/**
 * Production: один модуль темы + один music.mp3 в графе (никакого switch по всем рынкам).
 * resolveId разруливает от `src/themes/` относительные пути из виртуального кода.
 */
export function vitePluginActiveTheme() {
  /** @type {string} */
  let root = process.cwd();
  /** @type {boolean} */
  let isBuild = false;

  return {
    name: 'vite-plugin-active-theme',

    configResolved(config) {
      root = config.root;
      isBuild = config.command === 'build';
    },

    resolveId(source, importer) {
      if (source === 'virtual:active-theme') return VIRTUAL;

      if (importer === VIRTUAL) {
        const q = source.indexOf('?');
        const bare = q === -1 ? source : source.slice(0, q);
        const query = q === -1 ? '' : source.slice(q);
        const resolved = path.resolve(path.join(root, 'src', 'themes'), bare);
        return `${resolved}${query}`;
      }
      return null;
    },

    load(id) {
      if (id !== VIRTUAL) return null;

      if (!isBuild) {
        return `export function applyActiveTheme() {}\n`;
      }

      const activeId = process.env.VITE_THEME?.trim() || 'default';
      const themesBase = path.join(root, 'src', 'themes');
      const genPath = path.join(themesBase, 'generated', `${activeId}.js`);
      const musicPath = path.join(root, 'src/assets/themes', activeId, 'music.mp3');
      const hasMusic = fs.existsSync(musicPath);

      if (activeId === 'default') {
        if (!hasMusic) {
          return `export function applyActiveTheme() {}\n`;
        }
        return `
import musicUrl from "../assets/themes/default/music.mp3?url";
export function applyActiveTheme(THEMES) {
  THEMES.default = { ...THEMES.default, musicUrl };
}
`;
      }

      let themeSpecifier;
      if (activeId === 'space') {
        themeSpecifier = './manual/space.js';
      } else if (activeId === 'city') {
        themeSpecifier = './manual/city.js';
      } else if (fs.existsSync(genPath)) {
        themeSpecifier = `./generated/${activeId}.js`;
      } else {
        return `export function applyActiveTheme() {}\n`;
      }

      if (!hasMusic) {
        return `
import t from ${JSON.stringify(themeSpecifier)};
export function applyActiveTheme(THEMES) {
  THEMES[${JSON.stringify(activeId)}] = t;
}
`;
      }

      const musicSpec = `../assets/themes/${activeId}/music.mp3?url`;
      return `
import t from ${JSON.stringify(themeSpecifier)};
import musicUrl from ${JSON.stringify(musicSpec)};
export function applyActiveTheme(THEMES) {
  THEMES[${JSON.stringify(activeId)}] = { ...t, musicUrl };
}
`;
    },
  };
}
