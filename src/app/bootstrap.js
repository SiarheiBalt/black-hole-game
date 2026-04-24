import { Application } from 'pixi.js';
import { computeLayout } from '../core/viewport.js';
import {
  createGameState,
  stepHolePhysics,
  setPointerTarget,
  beginPointerDrag,
  endPointerDrag,
  getHoleSizeLevelFromConsumed,
  getHoleRadius01FromConsumed,
} from '../core/gameState.js';
import {
  createCollectibleRunStates,
  getCollectibleItems,
  getCollectibleZoneSummary,
  shouldCollectibleBeConsumed,
  stepCollectibleFall,
  COLLECTIBLE_COUNT,
} from '../core/collectibleState.js';
import { attachPointerDrag } from '../input/pointerDrag.js';
import { createPlayfield } from '../render/pixi/createPlayfield.js';
import { createHoleView } from '../render/three/createHoleView.js';
import { createHoleJoystick } from '../ui/holeJoystick.js';
import { createHoleProgressBar } from '../ui/holeProgressBar.js';
import { createHolePopScore } from '../ui/holePopScore.js';

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

  const holeView = await createHoleView(container, {
    collectibleMoneyShadows: false,
    planarCollectibleFall: true,
  });
  holeView.resize(layout);

  const state = createGameState();
  const collectibleRuns = createCollectibleRunStates();
  const c = centerPointerNorm();
  state.mapNx = c.nx;
  state.mapNy = c.ny;
  state.pointerTargetNx = c.nx;
  state.pointerTargetNy = c.ny;
  state.controlCenterNx = c.nx;
  state.controlCenterNy = c.ny;

  playfield.setScroll(state.mapNx, state.mapNy, layout);
  holeView.setScreenCentered();
  holeView.setHoleRadius01Immediate(state.holeRadius01);

  const holeJoystick = createHoleJoystick(container);
  const holeProgressBar = createHoleProgressBar(container);
  const holePopScore = createHolePopScore(container);
  holeProgressBar.sync(0, layout, state.holeRadius01);

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
    const consumed0 = getCollectibleZoneSummary(collectibleRuns).consumed;
    state.holeRadius01 = getHoleRadius01FromConsumed(consumed0);
    state.holeSizeLevel = getHoleSizeLevelFromConsumed(consumed0);
    holeView.setHoleRadius01Immediate(state.holeRadius01);
    holeProgressBar.sync(consumed0, layout, state.holeRadius01);
  });
  ro.observe(container);

  app.ticker.add(() => {
    const dt = app.ticker.deltaMS / 1000;
    let consumed = getCollectibleZoneSummary(collectibleRuns).consumed;
    state.holeSizeLevel = getHoleSizeLevelFromConsumed(consumed);
    state.holeRadius01 = getHoleRadius01FromConsumed(consumed);
    stepHolePhysics(state, dt, layout);
    const items = getCollectibleItems(layout);
    for (let i = 0; i < COLLECTIBLE_COUNT; i++) {
      if (
        collectibleRuns[i].phase === 'idle' &&
        shouldCollectibleBeConsumed(state, layout, collectibleRuns[i], items[i])
      ) {
        collectibleRuns[i].phase = 'falling';
        collectibleRuns[i].t = 0;
        holePopScore.pop(layout, state.holeRadius01);
      }
      stepCollectibleFall(collectibleRuns[i], dt, () => {});
    }
    playfield.setScroll(state.mapNx, state.mapNy, layout);
    holeView.setScreenCentered();
    consumed = getCollectibleZoneSummary(collectibleRuns).consumed;
    state.holeRadius01 = getHoleRadius01FromConsumed(consumed);
    state.holeSizeLevel = getHoleSizeLevelFromConsumed(consumed);
    holeView.setHoleRadiusTarget01(state.holeRadius01);
    holeView.stepHoleRadiusAnimation(dt);
    holeView.updateCollectibles(collectibleRuns, layout, {
      mapNx: state.mapNx,
      mapNy: state.mapNy,
      holeRadius01: state.holeRadius01,
      holeVnX: state.holeVnX,
      holeVnY: state.holeVnY,
      pointerDragging: state.dragging,
    });
    holeView.render();
    holeJoystick.sync(state, layout);
    holeProgressBar.sync(consumed, layout, state.holeRadius01);
  });

  window.addEventListener('pagehide', () => {
    detachPointer();
    ro.disconnect();
    playfield.destroy();
    holeJoystick.destroy();
    holeProgressBar.destroy();
    holePopScore.destroy();
    holeView.dispose();
    app.destroy(true, { children: true, texture: true });
  });
}

main().catch((e) => {
  console.error(e);
});
