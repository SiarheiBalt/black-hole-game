import { createTheme } from './themes/_factory.js';

const alienShip = new URL('./assets/themes/space/alien-ship.svg', import.meta.url).href;
const sun = new URL('./assets/themes/space/sun.svg', import.meta.url).href;
const planet = new URL('./assets/themes/space/planet.svg', import.meta.url).href;

const cityPlayfieldBg = new URL(
  './assets/themes/city/city-playfield-bg.webp',
  import.meta.url,
).href;
const cityPizza = new URL('./assets/themes/city/city-pizza.webp', import.meta.url).href;
const cityCoffee = new URL('./assets/themes/city/city-coffee.webp', import.meta.url).href;
const cityCone = new URL('./assets/themes/city/city-cone.webp', import.meta.url).href;

/** @type {Record<string, import('./themes/_factory.js').HoleThemeConfig>} */
const THEMES = {
  default: createTheme({
    id: 'default',
    fieldDecorColors: [0x5eead4, 0xff7eb3],
    musicVolume: 0.7,
  }),
  space: createTheme({
    id: 'space',
    fieldDecorColors: [0xF69837, 0x4f41ff],
    assetReplacements: {
      '1': alienShip,
      '2': sun,
      '3': planet,
    },
    playfieldTheme: {
      backgroundColor: 0x020a1f,
      decorColor: 0x28304b,
      starColor: 0xffffff,
      starAlpha: 0.7,
      starCount: 480,
      starSize: 1.2,
    },
    hudIcons: {
      planar: sun,
      trump: alienShip,
      poop: planet,
    },
    musicVolume: 0.7,
  }),
  /** Город сверху: пицца, кофе, конусы; контрастные спрайты для читаемости на карте. */
  city: createTheme({
    id: 'city',
    fieldDecorColors: [0x94a3b8, 0xf59e0b],
    assetReplacements: {
      '1': cityPizza,
      '2': cityCoffee,
      '3': cityCone,
    },
    playfieldTheme: {
      backgroundColor: 0x1e1433,
      backgroundImage: cityPlayfieldBg,
      decorColor: 0x4c4658,
      starColor: 0xffe066,
      starAlpha: 0.5,
      starCount: 100,
      starSize: 1.35,
    },
    hudIcons: {
      planar: cityCoffee,
      trump: cityPizza,
      poop: cityCone,
    },
    musicVolume: 0.7,
  }),
};

// Авто-регистрация сгенерированных тем (`tools/theme-gen` пишет файлы в
// `src/themes/generated/<id>.js`, каждый — `export default createTheme({...})`).
// Vite раскрывает glob на этапе сборки, поэтому пустая папка тоже работает.
const generatedModules = import.meta.glob('./themes/generated/*.js', { eager: true });
for (const mod of Object.values(generatedModules)) {
  const t = mod && mod.default;
  if (t && typeof t === 'object' && typeof t.id === 'string' && t.id) {
    THEMES[t.id] = t;
  }
}

// Авто-привязка музыки темы. `tools/music-gen` кладёт файлы в
// `src/assets/themes/<id>/music.mp3` — если файл есть, тема его подхватит,
// даже если не объявляла `musicUrl` явно (тип `default`/`space`/`city`).
const themeMusicUrls = import.meta.glob('./assets/themes/*/music.mp3', {
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
