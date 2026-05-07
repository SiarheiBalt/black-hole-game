import { Assets, Container, Graphics, Sprite } from 'pixi.js';
import { DEFAULT_PLAYFIELD_THEME } from '../../themes.js';
import {
  BG_COLOR,
  DECOR_COLOR,
  DECOR_COUNT,
  DECOR_SEED,
  WORLD_MAP_VIEW_MULTIPLIER,
  getMapPositionBounds01,
} from '../../core/constants.js';

/** Mulberry32 */
function seededRandom(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function rebuildDecor(decorLayer, w, h, count, color, alphaScale = 1) {
  decorLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
  if (count <= 0 || alphaScale <= 0) return;
  const rand = seededRandom(DECOR_SEED);
  for (let i = 0; i < count; i++) {
    const g = new Graphics();
    const rw = 8 + rand() * 48;
    const rh = 6 + rand() * 36;
    const x = rand() * w;
    const y = rand() * h;
    const r = 3 + rand() * 8;
    g.roundRect(-rw / 2, -rh / 2, rw, rh, r);
    g.fill({
      color: color ?? DECOR_COLOR,
      alpha: (0.22 + rand() * 0.25) * alphaScale,
    });
    g.position.set(x, y);
    g.rotation = rand() * Math.PI * 2;
    g.scale.set(0.85 + rand() * 0.5);
    decorLayer.addChild(g);
  }
}

function drawPlayfieldBackground(bg, w, h, theme) {
  bg.clear();
  const color = theme.backgroundColor ?? DEFAULT_PLAYFIELD_THEME.backgroundColor;
  bg.beginFill(color);
  bg.drawRect(0, 0, w, h);
  bg.endFill();
}

/**
 * @param {Sprite} sprite
 * @param {number} w
 * @param {number} h
 */
function layoutBackgroundCover(sprite, w, h) {
  const tex = sprite.texture;
  if (!tex || !tex.width || !tex.height) return;
  const tw = tex.width;
  const th = tex.height;
  const scale = Math.max(w / tw, h / th);
  sprite.scale.set(scale);
  sprite.position.set((w - tw * scale) / 2, (h - th * scale) / 2);
}

function rebuildStars(graphics, w, h, theme) {
  graphics.clear();
  const count = theme.starCount ?? 0;
  if (!count) return;
  const rand = seededRandom(DECOR_SEED + 1);
  const starColor = theme.starColor ?? DEFAULT_PLAYFIELD_THEME.starColor;
  const starAlpha = theme.starAlpha ?? DEFAULT_PLAYFIELD_THEME.starAlpha;
  const starSize = theme.starSize ?? DEFAULT_PLAYFIELD_THEME.starSize;
  graphics.beginFill(starColor, starAlpha);
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const size = Math.max(0.5, starSize * (0.75 + rand() * 0.5));
    graphics.drawCircle(x, y, size);
  }
  graphics.endFill();
}

/**
 * @param {import('pixi.js').Application} app
 */
export function createPlayfield(app, theme = DEFAULT_PLAYFIELD_THEME) {
  const resolvedTheme = { ...DEFAULT_PLAYFIELD_THEME, ...theme };
  const worldRoot = new Container();
  worldRoot.label = 'playfield';

  const bgFill = new Graphics();
  const bgImage = new Sprite();
  bgImage.visible = false;
  bgImage.label = 'playfield-bg-image';
  const bgLayer = new Container();
  bgLayer.label = 'playfield-bg';
  bgLayer.addChild(bgFill);
  bgLayer.addChild(bgImage);

  const decorLayer = new Container();
  decorLayer.label = 'decor';
  const starGraphics = new Graphics();
  starGraphics.label = 'stars';

  worldRoot.addChild(bgLayer);
  worldRoot.addChild(starGraphics);
  worldRoot.addChild(decorLayer);
  app.stage.addChild(worldRoot);

  /** @type {ReturnType<import('../../core/viewport.js').computeLayout> | null} */
  let layoutRef = null;
  /** @type {Promise<void> | null} */
  let bgLoadPromise = null;

  /** @param {ReturnType<import('../../core/viewport.js').computeLayout>} layout */
  function applyResize(layout) {
    layoutRef = layout;
    const { designWidth: vw, designHeight: vh } = layout;
    const m = WORLD_MAP_VIEW_MULTIPLIER;
    const worldW = vw * m;
    const worldH = vh * m;
    const densityScale =
      typeof resolvedTheme.decorDensity === 'number' && Number.isFinite(resolvedTheme.decorDensity)
        ? Math.max(0, resolvedTheme.decorDensity)
        : 1;
    const alphaScale =
      typeof resolvedTheme.decorAlpha === 'number' && Number.isFinite(resolvedTheme.decorAlpha)
        ? Math.max(0, Math.min(1, resolvedTheme.decorAlpha))
        : 1;
    const decorCount = Math.round(DECOR_COUNT * m * m * densityScale);

    drawPlayfieldBackground(bgFill, worldW, worldH, resolvedTheme);
    layoutBackgroundCover(bgImage, worldW, worldH);
    rebuildStars(starGraphics, worldW, worldH, resolvedTheme);
    rebuildDecor(decorLayer, worldW, worldH, decorCount, resolvedTheme.decorColor, alphaScale);

    worldRoot.scale.set(1);
  }

  return {
    worldRoot,
    /** @param {ReturnType<import('../../core/viewport.js').computeLayout>} layout */
    resize(layout) {
      applyResize(layout);
    },

    /** Загружает опциональную текстуру `playfieldTheme.backgroundImage` (Pixi). */
    async loadThemeAssets() {
      const url = resolvedTheme.backgroundImage;
      if (!url || bgLoadPromise) return bgLoadPromise ?? Promise.resolve();
      bgLoadPromise = (async () => {
        const tex = await Assets.load(url);
        bgImage.texture = tex;
        bgImage.visible = true;
        if (layoutRef) applyResize(layoutRef);
      })();
      return bgLoadPromise;
    },

    /**
     * Center the viewport on logical map position (mapNx, mapNy) ∈ [0,1]².
     * @param {number} mapNx
     * @param {number} mapNy
     * @param {ReturnType<import('../../core/viewport.js').computeLayout>} layout
     * @param {number} [viewZoom=1] — &gt;1: вид шире (как в Three.js-ортогоне; масштаб `1/zoom` у корня).
     */
    setScroll(mapNx, mapNy, layout, viewZoom = 1) {
      const m = WORLD_MAP_VIEW_MULTIPLIER;
      const { designWidth: vw, designHeight: vh } = layout;
      const worldW = vw * m;
      const worldH = vh * m;
      const { min, max } = getMapPositionBounds01();
      const nx = Math.max(min, Math.min(max, mapNx));
      const ny = Math.max(min, Math.min(max, mapNy));
      const px = nx * worldW;
      const py = ny * worldH;
      const z = Math.max(1, viewZoom);
      const s = 1 / z;
      worldRoot.scale.set(s, s);
      worldRoot.position.set(vw / 2 - px * s, vh / 2 - py * s);
    },
    getLayout() {
      return layoutRef;
    },
    destroy() {
      worldRoot.destroy({ children: true });
    },
  };
}
