import { Application } from 'pixi.js';
import { computeLayout } from '../core/viewport.js';
import {
  createGameState,
  stepHolePhysics,
  setPointerTarget,
  beginPointerDrag,
  endPointerDrag,
} from '../core/gameState.js';
import { attachPointerDrag } from '../input/pointerDrag.js';
import { createPlayfield } from '../render/pixi/createPlayfield.js';
import { createHoleView } from '../render/three/createHoleView.js';

function centerPointerNorm() {
  return { nx: 0.5, ny: 0.5 };
}

async function main() {
  const container = document.getElementById('game-container');
  if (!container) throw new Error('#game-container missing');

  let layout = computeLayout(container);

  const app = new Application();
  await app.init({
    resizeTo: container,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  app.canvas.classList.add('pixi-layer');
  container.appendChild(app.canvas);

  if (import.meta.env.DEV) {
    const { initDevtools } = await import('@pixi/devtools');
    initDevtools({ app });
    globalThis.__PIXI_APP__ = app;
  }

  const playfield = createPlayfield(app);
  playfield.resize(layout);

  const holeView = createHoleView(container);
  holeView.resize(layout);

  const state = createGameState();
  const c = centerPointerNorm();
  state.mapNx = c.nx;
  state.mapNy = c.ny;
  state.pointerTargetNx = c.nx;
  state.pointerTargetNy = c.ny;
  state.controlCenterNx = c.nx;
  state.controlCenterNy = c.ny;

  playfield.setScroll(state.mapNx, state.mapNy, layout);
  holeView.setScreenCentered();
  holeView.setRadius01(state.holeRadius01);

  const detachPointer = attachPointerDrag(
    container,
    (nx, ny) => {
      setPointerTarget(state, nx, ny);
    },
    (nx, ny) => {
      beginPointerDrag(state, nx, ny);
    },
    () => {
      endPointerDrag(state);
    },
  );

  const ro = new ResizeObserver(() => {
    layout = computeLayout(container);
    playfield.resize(layout);
    playfield.setScroll(state.mapNx, state.mapNy, layout);
    holeView.resize(layout);
    holeView.setScreenCentered();
    holeView.setRadius01(state.holeRadius01);
  });
  ro.observe(container);

  app.ticker.add(() => {
    const dt = app.ticker.deltaMS / 1000;
    stepHolePhysics(state, dt);
    playfield.setScroll(state.mapNx, state.mapNy, layout);
    holeView.setScreenCentered();
    holeView.render();
  });

  window.addEventListener('pagehide', () => {
    detachPointer();
    ro.disconnect();
    playfield.destroy();
    holeView.dispose();
    app.destroy(true, { children: true, texture: true });
  });
}

main().catch((e) => {
  console.error(e);
});
