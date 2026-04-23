import { Container, Graphics } from 'pixi.js';
import {
  BG_COLOR,
  DECOR_COLOR,
  DECOR_COUNT,
  DECOR_SEED,
  WORLD_MAP_VIEW_MULTIPLIER,
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

function rebuildDecor(decorLayer, w, h, count) {
  decorLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
  const rand = seededRandom(DECOR_SEED);
  for (let i = 0; i < count; i++) {
    const g = new Graphics();
    const rw = 8 + rand() * 48;
    const rh = 6 + rand() * 36;
    const x = rand() * w;
    const y = rand() * h;
    const r = 3 + rand() * 8;
    g.roundRect(-rw / 2, -rh / 2, rw, rh, r);
    g.fill({ color: DECOR_COLOR, alpha: 0.22 + rand() * 0.25 });
    g.position.set(x, y);
    g.rotation = rand() * Math.PI * 2;
    g.scale.set(0.85 + rand() * 0.5);
    decorLayer.addChild(g);
  }
}

/**
 * @param {import('pixi.js').Application} app
 */
export function createPlayfield(app) {
  const worldRoot = new Container();
  worldRoot.label = 'playfield';

  const bg = new Graphics();
  const decorLayer = new Container();
  decorLayer.label = 'decor';

  worldRoot.addChild(bg);
  worldRoot.addChild(decorLayer);
  app.stage.addChild(worldRoot);

  /** @type {ReturnType<import('../../core/viewport.js').computeLayout> | null} */
  let layoutRef = null;

  return {
    worldRoot,
    /** @param {ReturnType<import('../../core/viewport.js').computeLayout>} layout */
    resize(layout) {
      layoutRef = layout;
      const { designWidth: vw, designHeight: vh } = layout;
      const m = WORLD_MAP_VIEW_MULTIPLIER;
      const worldW = vw * m;
      const worldH = vh * m;
      const decorCount = Math.round(DECOR_COUNT * m * m);

      bg.clear();
      bg.rect(0, 0, worldW, worldH);
      bg.fill(BG_COLOR);

      rebuildDecor(decorLayer, worldW, worldH, decorCount);

      worldRoot.scale.set(1);
    },

    /**
     * Center the viewport on logical map position (mapNx, mapNy) ∈ [0,1]².
     * @param {number} mapNx
     * @param {number} mapNy
     * @param {ReturnType<import('../../core/viewport.js').computeLayout>} layout
     */
    setScroll(mapNx, mapNy, layout) {
      const m = WORLD_MAP_VIEW_MULTIPLIER;
      const { designWidth: vw, designHeight: vh } = layout;
      const worldW = vw * m;
      const worldH = vh * m;
      const px = mapNx * worldW;
      const py = mapNy * worldH;
      worldRoot.position.set(vw / 2 - px, vh / 2 - py);
    },
    getLayout() {
      return layoutRef;
    },
    destroy() {
      worldRoot.destroy({ children: true });
    },
  };
}
