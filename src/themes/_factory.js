import {
  BG_COLOR,
  COLLECTIBLE_COUNT,
  COLLECTIBLE_SPHERE_COUNT,
  DECOR_COLOR,
} from '../core/constants.js';
import {
  FIELD_DECOR_CUBE_COUNT,
  FIELD_DECOR_TRIANGLE_COUNT,
  COLLECTIBLE_PLANAR_SPRITE_FILES,
  getCollectibleSlotKind,
  isPlanarCollectibleKind,
} from '../core/collectibleState.js';

const DONUT_SPHERE_PALETTE = [
  0xff3d9a,
  0xff6fae,
  0xffb326,
  0xffea54,
  0xff6b81,
  0xe067ff,
  0xff8f62,
  0x58ffe8,
  0xff9edb,
  0xa78bff,
];

const DEFAULT_FIELD_DECOR_COLORS = [0x5eead4, 0xff7eb3];

const BASE_PLAYFIELD_THEME = {
  backgroundColor: BG_COLOR,
  /** @type {string | undefined} полный URL текстуры фона (Pixi `Assets.load`), опционально */
  backgroundImage: undefined,
  decorColor: DECOR_COLOR,
  starColor: 0xffffff,
  starAlpha: 0.45,
  starCount: 0,
  starSize: 1.8,
  /** Множитель количества пятен procedural decor в Pixi (`createPlayfield`). 0 = нет. */
  decorDensity: 1,
  /** Множитель прозрачности пятен (0..1). */
  decorAlpha: 1,
};

const DEFAULT_COLLECTIBLE_SCALE = {
  sphere: 1,
  planar: 1,
  trump: 1,
  poop: 1,
};

const DEFAULT_FIELD_DECOR_SCALE = {
  cube: 1,
  triangle: 1,
};

const DEFAULT_HUD_ICON_PATHS = {
  planar: new URL('../assets/money.webp', import.meta.url).href,
  trump: new URL('../assets/trump.webp', import.meta.url).href,
  poop: new URL('../assets/poop.webp', import.meta.url).href,
};

const DEFAULT_MUSIC_URL = new URL('../assets/sounds/back.mp3', import.meta.url).href;

const FIELD_DECOR_TOTAL_COUNT =
  FIELD_DECOR_CUBE_COUNT + FIELD_DECOR_TRIANGLE_COUNT;

const PLANAR_ASSET_ORDER = ['trump.webp', 'money.webp', 'poop.webp'];

/**
 * @param {{ sphereColor?: number, sphereColors?: number[] }} config
 * @returns {number[]}
 */
function normalizeSphereColors(config) {
  const len = COLLECTIBLE_SPHERE_COUNT;
  const custom = Array.isArray(config.sphereColors)
    ? config.sphereColors.filter((c) => typeof c === 'number')
    : [];
  if (custom.length > 0) {
    return Array.from({ length: len }, (_, i) => custom[i % custom.length]);
  }
  if (typeof config.sphereColor === 'number') {
    return Array.from({ length: len }, () => config.sphereColor);
  }
  return Array.from({ length: len }, (_, i) => DONUT_SPHERE_PALETTE[i % DONUT_SPHERE_PALETTE.length]);
}

function buildFieldDecorColors(candidate) {
  if (
    Array.isArray(candidate) &&
    candidate.length >= FIELD_DECOR_TOTAL_COUNT &&
    FIELD_DECOR_TOTAL_COUNT > 0
  ) {
    return candidate.slice(0, FIELD_DECOR_TOTAL_COUNT);
  }
  if (FIELD_DECOR_TOTAL_COUNT === 0) return [];
  return Array.from(
    { length: FIELD_DECOR_TOTAL_COUNT },
    (_, index) => DEFAULT_FIELD_DECOR_COLORS[index % DEFAULT_FIELD_DECOR_COLORS.length],
  );
}

function buildSlotRenderKinds(overrides = []) {
  const slotKinds = Array.from({ length: COLLECTIBLE_COUNT }, (_, index) =>
    getCollectibleSlotKind(index),
  );
  for (const override of overrides) {
    if (
      !override ||
      !Number.isInteger(override.position) ||
      override.position < 0 ||
      override.position >= COLLECTIBLE_COUNT
    ) {
      continue;
    }
    if (!override.kind || !isPlanarCollectibleKind(override.kind)) continue;
    const baseKind = slotKinds[override.position];
    if (!isPlanarCollectibleKind(baseKind)) continue;
    slotKinds[override.position] = override.kind;
  }
  return slotKinds;
}

function normalizePlayfieldTheme(theme = {}) {
  const backgroundImageRaw = theme.backgroundImage;
  const backgroundImage =
    typeof backgroundImageRaw === 'string' && backgroundImageRaw.trim()
      ? backgroundImageRaw.trim()
      : BASE_PLAYFIELD_THEME.backgroundImage;
  return {
    backgroundColor:
      typeof theme.backgroundColor === 'number'
        ? theme.backgroundColor
        : BASE_PLAYFIELD_THEME.backgroundColor,
    backgroundImage,
    decorColor:
      typeof theme.decorColor === 'number'
        ? theme.decorColor
        : BASE_PLAYFIELD_THEME.decorColor,
    starColor:
      typeof theme.starColor === 'number'
        ? theme.starColor
        : BASE_PLAYFIELD_THEME.starColor,
    starAlpha:
      typeof theme.starAlpha === 'number'
        ? theme.starAlpha
        : BASE_PLAYFIELD_THEME.starAlpha,
    starCount:
      typeof theme.starCount === 'number'
        ? Math.max(0, Math.floor(theme.starCount))
        : BASE_PLAYFIELD_THEME.starCount,
    starSize:
      typeof theme.starSize === 'number'
        ? Math.max(0.1, theme.starSize)
        : BASE_PLAYFIELD_THEME.starSize,
    decorDensity:
      typeof theme.decorDensity === 'number' && Number.isFinite(theme.decorDensity)
        ? Math.max(0, theme.decorDensity)
        : BASE_PLAYFIELD_THEME.decorDensity,
    decorAlpha:
      typeof theme.decorAlpha === 'number' && Number.isFinite(theme.decorAlpha)
        ? Math.max(0, Math.min(1, theme.decorAlpha))
        : BASE_PLAYFIELD_THEME.decorAlpha,
  };
}

function normalizeHudIcons(icons = {}) {
  return {
    ...DEFAULT_HUD_ICON_PATHS,
    ...icons,
  };
}

function normalizeScaleMap(input, defaults) {
  const out = { ...defaults };
  if (input && typeof input === 'object') {
    for (const key of Object.keys(defaults)) {
      const v = input[key];
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
        out[key] = Math.max(0.1, Math.min(4, v));
      }
    }
  }
  return out;
}

/**
 * `fieldDecorAssets` — опциональные плоские текстуры (PNG/WebP) для куба и треугольника.
 * Если задан соответствующий URL, движок заменяет 3D-геометрию (Box / Cone) плоской
 * прямоугольной плоскостью с прозрачной текстурой; если нет — рендерит исходные 3D-фигуры.
 *
 * @param {{ cube?: unknown, triangle?: unknown } | undefined} assets
 * @returns {{ cube: string | undefined, triangle: string | undefined }}
 */
function normalizeFieldDecorAssets(assets) {
  const cube =
    assets && typeof assets === 'object' && typeof assets.cube === 'string' && assets.cube.trim()
      ? assets.cube.trim()
      : undefined;
  const triangle =
    assets &&
    typeof assets === 'object' &&
    typeof assets.triangle === 'string' &&
    assets.triangle.trim()
      ? assets.triangle.trim()
      : undefined;
  return { cube, triangle };
}

function normalizeOptionalAsset(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * @typedef {Object} ThemeSlotOverride
 * @property {number} position
 * @property {import('../core/collectibleState.js').CollectibleKind} [kind]
 * @property {string} [asset] — путь внутри `src/assets/`, например `themes/space/alien-ship.svg`.
 */

/**
 * @typedef {Object} PlayfieldThemeOptions
 * @property {number} [backgroundColor]
 * @property {number} [decorColor]
 * @property {number} [starColor]
 * @property {number} [starAlpha]
 * @property {number} [starCount]
 * @property {number} [starSize]
 * @property {string} [backgroundImage]
 */

/**
 * @typedef {Object} HoleThemeConfig
 * @property {string} id
 * @property {number} sphereColor
 * @property {number[]} sphereColors
 * @property {string | undefined} sphereAsset
 * @property {number[]} fieldDecorColors
 * @property {{ cube: string | undefined, triangle: string | undefined }} fieldDecorAssets
 * @property {import('../core/collectibleState.js').CollectibleKind[]} slotRenderKinds
 * @property {Record<'planar' | 'trump' | 'poop', string>} planarAssets
 * @property {ThemeSlotOverride[]} slotAssetOverrides
 * @property {PlayfieldThemeOptions} playfieldTheme
 * @property {{ planar: string, trump: string, poop: string, sphere?: string, decorCube?: string, decorTriangle?: string }} hudIcons
 * @property {{ sphere: number, planar: number, trump: number, poop: number }} collectibleScaleByKind
 * @property {{ cube: number, triangle: number }} fieldDecorScaleByKind
 * @property {string} musicUrl — bundled URL to the looping background track
 * @property {number} musicVolume — 0..1
 */

/**
 * Создаёт нормализованную тему. Используется как `src/themes.js` (handcoded), так
 * и автогенерированными темами в `src/themes/generated/<id>.js`.
 * @returns {HoleThemeConfig}
 */
export function createTheme(config) {
  const slotOverrides = Array.isArray(config.slotOverrides) ? config.slotOverrides : [];
  const slotRenderKinds = buildSlotRenderKinds(slotOverrides);
  const slotAssetOverrides = [];
  const occupiedPositions = new Set();
  for (const override of slotOverrides) {
    if (
      !override ||
      !Number.isInteger(override.position) ||
      override.position < 0 ||
      override.position >= COLLECTIBLE_COUNT
    ) {
      continue;
    }
    const kind = slotRenderKinds[override.position];
    if (!isPlanarCollectibleKind(kind)) continue;
    if (typeof override.asset === 'string' && override.asset.trim()) {
      occupiedPositions.add(override.position);
      slotAssetOverrides.push({ position: override.position, asset: override.asset.trim() });
    }
  }
  const replacements = config.assetReplacements ?? {};
  const fileReplacements = {};
  if (typeof replacements === 'object' && replacements !== null) {
    for (const [key, value] of Object.entries(replacements)) {
      if (typeof value !== 'string' || !value.trim()) continue;
      const asset = value.trim();
      const numericKey = Number(key);
      if (
        !Number.isNaN(numericKey) &&
        Number.isInteger(numericKey) &&
        Number.isFinite(numericKey)
      ) {
        const assetIndex = numericKey - 1;
        const targetFile = PLANAR_ASSET_ORDER[assetIndex];
        if (typeof targetFile === 'string') {
          fileReplacements[targetFile] = asset;
        }
        continue;
      }
      fileReplacements[key] = asset;
    }
  }
  for (let idx = 0; idx < COLLECTIBLE_COUNT; idx += 1) {
    if (occupiedPositions.has(idx)) continue;
    const kind = slotRenderKinds[idx];
    if (!isPlanarCollectibleKind(kind)) continue;
    const defaultAsset = COLLECTIBLE_PLANAR_SPRITE_FILES[kind];
    const replacement = fileReplacements[defaultAsset];
    if (typeof replacement === 'string' && replacement.trim()) {
      slotAssetOverrides.push({ position: idx, asset: replacement.trim() });
      occupiedPositions.add(idx);
    }
  }
  const sphereColors = normalizeSphereColors(config);
  const sphereColor =
    typeof config.sphereColor === 'number' ? config.sphereColor : sphereColors[0];
  return {
    id: config.id ?? 'default',
    sphereColor,
    sphereColors,
    sphereAsset: normalizeOptionalAsset(config.sphereAsset),
    fieldDecorColors: buildFieldDecorColors(config.fieldDecorColors),
    fieldDecorAssets: normalizeFieldDecorAssets(config.fieldDecorAssets),
    slotRenderKinds,
    planarAssets: {
      ...COLLECTIBLE_PLANAR_SPRITE_FILES,
      ...(config.planarAssets ?? {}),
    },
    slotAssetOverrides,
    playfieldTheme: normalizePlayfieldTheme(config.playfieldTheme),
    hudIcons: normalizeHudIcons(config.hudIcons),
    collectibleScaleByKind: normalizeScaleMap(
      config.collectibleScaleByKind,
      DEFAULT_COLLECTIBLE_SCALE,
    ),
    fieldDecorScaleByKind: normalizeScaleMap(
      config.fieldDecorScaleByKind,
      DEFAULT_FIELD_DECOR_SCALE,
    ),
    musicUrl:
      typeof config.musicUrl === 'string' && config.musicUrl.trim()
        ? config.musicUrl.trim()
        : DEFAULT_MUSIC_URL,
    musicVolume:
      typeof config.musicVolume === 'number' && Number.isFinite(config.musicVolume)
        ? Math.max(0, Math.min(1, config.musicVolume))
        : 0.8,
  };
}

export { BASE_PLAYFIELD_THEME, DEFAULT_HUD_ICON_PATHS, DEFAULT_MUSIC_URL };
