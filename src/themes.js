import {
  BG_COLOR,
  COLLECTIBLE_COUNT,
  COLLECTIBLE_MONEY_COUNT,
  COLLECTIBLE_SPHERE_COUNT,
  COLLECTIBLE_TRUMP_COUNT,
  DECOR_COLOR,
} from './core/constants.js';
import {
  FIELD_DECOR_CUBE_COUNT,
  FIELD_DECOR_TRIANGLE_COUNT,
  COLLECTIBLE_PLANAR_SPRITE_FILES,
  getCollectibleSlotKind,
  isPlanarCollectibleKind,
} from './core/collectibleState.js';

const DEFAULT_SPHERE_COLOR = 0x4cc4ff;
const DEFAULT_FIELD_DECOR_COLORS = [0x5eead4, 0xff7eb3];
const BASE_PLAYFIELD_THEME = {
  backgroundColor: BG_COLOR,
  decorColor: DECOR_COLOR,
  starColor: 0xffffff,
  starAlpha: 0.45,
  starCount: 0,
  starSize: 1.8,
};
const DEFAULT_HUD_ICON_PATHS = {
  planar: new URL('./assets/money.png', import.meta.url).href,
  trump: new URL('./assets/trump.png', import.meta.url).href,
  poop: new URL('./assets/poop.png', import.meta.url).href,
};

const FIELD_DECOR_TOTAL_COUNT =
  FIELD_DECOR_CUBE_COUNT + FIELD_DECOR_TRIANGLE_COUNT;

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
  return {
    backgroundColor:
      typeof theme.backgroundColor === 'number'
        ? theme.backgroundColor
        : BASE_PLAYFIELD_THEME.backgroundColor,
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
  };
}

function normalizeHudIcons(icons = {}) {
  return {
    ...DEFAULT_HUD_ICON_PATHS,
    ...icons,
  };
}

/**
 * @typedef {Object} ThemeSlotOverride
 * @property {number} position
 * @property {import('./core/collectibleState.js').CollectibleKind} [kind]
 * @property {string} [asset] — путь внутри `src/assets/`, например `themes/space/alien-ship.svg`.
 */

/**
 * @typedef {Object} HoleThemeConfig
 * @property {string} id
 * @property {number} sphereColor
 * @property {number[]} fieldDecorColors
 * @property {import('./core/collectibleState.js').CollectibleKind[]} slotRenderKinds
 * @property {Record<'planar' | 'trump' | 'poop', string>} planarAssets
 * @property {ThemeSlotOverride[]} slotAssetOverrides
 * @property {PlayfieldThemeOptions} playfieldTheme
 * @property {{ planar: string, trump: string, poop: string }} hudIcons
 */

/**
 * @typedef {Object} PlayfieldThemeOptions
 * @property {number} [backgroundColor]
 * @property {number} [decorColor]
 * @property {number} [starColor]
 * @property {number} [starAlpha]
 * @property {number} [starCount]
 * @property {number} [starSize]
 */

const PLANAR_ASSET_ORDER = ['trump.png', 'money.png', 'poop.png'];

function createTheme(config) {
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
  return {
    id: config.id ?? 'default',
    sphereColor:
      typeof config.sphereColor === 'number' ? config.sphereColor : DEFAULT_SPHERE_COLOR,
    fieldDecorColors: buildFieldDecorColors(config.fieldDecorColors),
    slotRenderKinds,
    planarAssets: {
      ...COLLECTIBLE_PLANAR_SPRITE_FILES,
      ...(config.planarAssets ?? {}),
    },
    slotAssetOverrides,
    playfieldTheme: normalizePlayfieldTheme(config.playfieldTheme),
    hudIcons: normalizeHudIcons(config.hudIcons),
  };
}

const baseSpacePlanarPositions = Array.from(
  { length: 3 },
  (_, index) => COLLECTIBLE_SPHERE_COUNT + index,
);

const alienShip = new URL('./assets/themes/space/alien-ship.svg', import.meta.url).href;
const sun = new URL('./assets/themes/space/sun.svg', import.meta.url).href;
const planet = new URL('./assets/themes/space/planet.svg', import.meta.url).href;

/** @type {Record<string, HoleThemeConfig>} */
const THEMES = {
  default: createTheme({
    id: 'default',
    sphereColor: DEFAULT_SPHERE_COLOR,
    fieldDecorColors: DEFAULT_FIELD_DECOR_COLORS,
  }),
  space: createTheme({
    id: 'space',
    sphereColor: 0x7fffd4,
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
  }),
};

export const DEFAULT_HOLE_THEME = THEMES.default;
export const DEFAULT_PLAYFIELD_THEME = THEMES.default.playfieldTheme;
export const DEFAULT_HUD_ICONS = THEMES.default.hudIcons;

export function getThemeConfig(name = 'default') {
  return THEMES[name] ?? DEFAULT_HOLE_THEME;
}
