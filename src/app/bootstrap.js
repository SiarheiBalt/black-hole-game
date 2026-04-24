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
  getViewZoomTargetFromSizeLevel,
} from '../core/gameState.js';
import {
  HOLE_VIEW_ZOOM_SMOOTH_RATE,
  GAME_VIEW_SHAKE_AMP_PX,
  GAME_VIEW_SHAKE_DECAY,
  GAME_VIEW_SHAKE_RESONANCE,
  GAME_VIEW_ZOOM_FLASH_MAX,
  GAME_VIEW_ZOOM_FLASH_DECAY,
} from '../core/constants.js';
import {
  createCollectibleRunStates,
  getCollectibleItems,
  getCollectibleZoneSummary,
  getConsumedCountsByKind,
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
import { createCollectibleStatsHud } from '../ui/collectibleStatsHud.js';

function centerPointerNorm() {
  return { nx: 0.5, ny: 0.5 };
}

async function main() {
  const container = document.getElementById('game-container');
  if (!container) throw new Error('#game-container missing');

  let layout = computeLayout(container);

  const gameScene = document.createElement('div');
  gameScene.className = 'game-scene';
  container.appendChild(gameScene);
  const gameSceneFlash = document.createElement('div');
  gameSceneFlash.className = 'game-scene__flash';

  const app = new Application();
  await app.init({
    resizeTo: container,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  app.canvas.classList.add('pixi-layer');
  gameScene.appendChild(app.canvas);

  if (import.meta.env.DEV) {
    const { initDevtools } = await import('@pixi/devtools');
    initDevtools({ app });
    globalThis.__PIXI_APP__ = app;
  }

  const playfield = createPlayfield(app);
  playfield.resize(layout);

  const holeView = await createHoleView(gameScene, {
    collectibleMoneyShadows: false,
    planarCollectibleFall: true,
  });
  gameScene.appendChild(gameSceneFlash);
  holeView.resize(layout);
  let viewZoomCurrent = getViewZoomTargetFromSizeLevel(1);
  let lastViewZoomTarget = viewZoomCurrent;
  let viewShakeStrength = 0;
  let viewZoomFlashStrength = 0;
  let viewShakeTime = 0;

  const state = createGameState();
  const collectibleRuns = createCollectibleRunStates();
  const c = centerPointerNorm();
  state.mapNx = c.nx;
  state.mapNy = c.ny;
  state.pointerTargetNx = c.nx;
  state.pointerTargetNy = c.ny;
  state.controlCenterNx = c.nx;
  state.controlCenterNy = c.ny;

  playfield.setScroll(state.mapNx, state.mapNy, layout, viewZoomCurrent);
  holeView.setViewZoom(viewZoomCurrent);
  holeView.setScreenCentered();
  holeView.setHoleRadius01Immediate(state.holeRadius01);

  const holeJoystick = createHoleJoystick(container);
  const holeProgressBar = createHoleProgressBar(container);
  const holePopScore = createHolePopScore(container);
  const collectibleStatsHud = createCollectibleStatsHud(container);
  collectibleStatsHud.sync(getConsumedCountsByKind(collectibleRuns), layout);
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
    holeView.resize(layout);
    holeView.setScreenCentered();
    const consumed0 = getCollectibleZoneSummary(collectibleRuns).consumed;
    state.holeRadius01 = getHoleRadius01FromConsumed(consumed0);
    state.holeSizeLevel = getHoleSizeLevelFromConsumed(consumed0);
    viewZoomCurrent = getViewZoomTargetFromSizeLevel(state.holeSizeLevel);
    lastViewZoomTarget = viewZoomCurrent;
    holeView.setViewZoom(viewZoomCurrent);
    playfield.setScroll(state.mapNx, state.mapNy, layout, viewZoomCurrent);
    holeView.setHoleRadius01Immediate(state.holeRadius01);
    viewShakeStrength = 0;
    viewZoomFlashStrength = 0;
    gameScene.style.transform = '';
    gameSceneFlash.style.opacity = '0';
    holeProgressBar.sync(consumed0, layout, state.holeRadius01);
    collectibleStatsHud.sync(getConsumedCountsByKind(collectibleRuns), layout);
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
    consumed = getCollectibleZoneSummary(collectibleRuns).consumed;
    state.holeRadius01 = getHoleRadius01FromConsumed(consumed);
    state.holeSizeLevel = getHoleSizeLevelFromConsumed(consumed);
    const zTarget = getViewZoomTargetFromSizeLevel(state.holeSizeLevel);
    const zAlpha = 1 - Math.exp(-HOLE_VIEW_ZOOM_SMOOTH_RATE * Math.min(dt, 0.1));
    viewZoomCurrent += (zTarget - viewZoomCurrent) * zAlpha;
    if (Math.abs(viewZoomCurrent - zTarget) < 1.5e-4) {
      viewZoomCurrent = zTarget;
    }
    if (zTarget > lastViewZoomTarget + 1e-7) {
      viewShakeStrength = 1;
      viewZoomFlashStrength = 1;
    }
    lastViewZoomTarget = zTarget;
    viewShakeTime += dt * (34 + 22 * viewShakeStrength);
    viewShakeStrength *= Math.exp(-GAME_VIEW_SHAKE_DECAY * dt);
    if (viewShakeStrength < 0.004) viewShakeStrength = 0;
    viewZoomFlashStrength *= Math.exp(-GAME_VIEW_ZOOM_FLASH_DECAY * dt);
    if (viewZoomFlashStrength < 0.003) viewZoomFlashStrength = 0;
    const sAmp =
      GAME_VIEW_SHAKE_AMP_PX * viewShakeStrength * GAME_VIEW_SHAKE_RESONANCE;
    const oxs = Math.sin(viewShakeTime * 3.7) * sAmp;
    const oys = Math.sin(viewShakeTime * 2.1 + 1.1) * sAmp * 0.86;
    gameScene.style.transform =
      viewShakeStrength > 0.002
        ? `translate3d(${oxs}px, ${oys}px, 0)`
        : '';
    const fOp = viewZoomFlashStrength * GAME_VIEW_ZOOM_FLASH_MAX;
    gameSceneFlash.style.opacity = fOp > 0.002 ? String(fOp) : '0';
    playfield.setScroll(state.mapNx, state.mapNy, layout, viewZoomCurrent);
    holeView.setViewZoom(viewZoomCurrent);
    holeView.setScreenCentered();
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
    collectibleStatsHud.sync(getConsumedCountsByKind(collectibleRuns), layout);
  });

  window.addEventListener('pagehide', () => {
    detachPointer();
    ro.disconnect();
    playfield.destroy();
    holeJoystick.destroy();
    holeProgressBar.destroy();
    holePopScore.destroy();
    collectibleStatsHud.destroy();
    holeView.dispose();
    app.destroy(true, { children: true, texture: true });
  });
}

main().catch((e) => {
  console.error(e);
});
