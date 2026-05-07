/**
 * Полный реестр тем для `vite` dev (`?theme=`, все рынки). Не попадает в production-бандл.
 */
import spaceTheme from './manual/space.js';
import cityTheme from './manual/city.js';

/**
 * @param {Record<string, import('./_factory.js').HoleThemeConfig>} THEMES
 */
export function applyDevThemes(THEMES) {
  THEMES.space = spaceTheme;
  THEMES.city = cityTheme;

  const generatedModules = import.meta.glob('./generated/*.js', { eager: true });
  for (const mod of Object.values(generatedModules)) {
    const t = mod && mod.default;
    if (t && typeof t === 'object' && typeof t.id === 'string' && t.id) {
      THEMES[t.id] = t;
    }
  }

  const themeMusicUrls = import.meta.glob('../assets/themes/*/music.mp3', {
    eager: true,
    import: 'default',
  });
  for (const [filePath, url] of Object.entries(themeMusicUrls)) {
    const match = /\/themes\/([^/]+)\/music\.mp3$/.exec(filePath);
    if (!match) continue;
    const id = match[1];
    const theme = THEMES[id];
    if (theme && typeof url === 'string') {
      THEMES[id] = { ...theme, musicUrl: url };
    }
  }
}
