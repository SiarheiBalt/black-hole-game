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
  ROUND_TIME_SEC,
  TIME_URGENT_LAST_SEC,
  COLLECTIBLE_FALL_SPEED,
} from '../core/constants.js';
import {
  createCollectibleRunStates,
  createCollectibleRunState,
  getCollectibleItems,
  getCollectibleZoneSummary,
  getConsumedCountsByKind,
  getFieldDecorItems,
  getFieldDecorConsumedCount,
  getTotalConsumedForProgress,
  shouldCollectibleBeConsumed,
  stepCollectibleFall,
  collectibleItemWithEffective,
  stepCollectibleIdleAttract,
  resetCollectibleRunAttractOffset,
  COLLECTIBLE_COUNT,
  FIELD_DECOR_CUBE_COUNT,
} from '../core/collectibleState.js';
import { attachPointerDrag } from '../input/pointerDrag.js';
import { createPlayfield } from '../render/pixi/createPlayfield.js';
import { createHoleView } from '../render/three/createHoleView.js';
import { createHoleJoystick } from '../ui/holeJoystick.js';
import { createHoleProgressBar } from '../ui/holeProgressBar.js';
import { createHolePopScore } from '../ui/holePopScore.js';
import { createCollectibleStatsHud } from '../ui/collectibleStatsHud.js';
import { createGameOverOverlay } from '../ui/gameOverOverlay.js';
import {
  attachPlayableApp,
  disposePlayableLifecycle,
  fireGameEnd,
  fireGameReady,
  installPlayableLifecycle,
  markGameClosed,
} from './playableAdapter.js';
import { createGameAudio, SOUND_IDS } from '../audio/gameAudio.js';

function centerPointerNorm() {
  return { nx: 0.5, ny: 0.5 };
}

async function main() {
  const container = document.getElementById('game-container');
  if (!container) throw new Error('#game-container missing');

  const run = { gameEnded: false, fatalHandled: false };
  /** @type {import('pixi.js').Application | undefined} */
  let app;

  const gameOverOverlay = createGameOverOverlay(container);

  installPlayableLifecycle({
    shouldResumeTicker: () => !run.gameEnded,
    onFatalError: () => {
      if (run.fatalHandled) return;
      run.fatalHandled = true;
      run.gameEnded = true;
      app?.ticker?.stop();
      gameOverOverlay.show('Something went wrong', false, { isFatal: true });
    },
  });

  let layout = computeLayout(container);

  const gameScene = document.createElement('div');
  gameScene.className = 'game-scene';
  container.appendChild(gameScene);
  const timeUrgencyVignette = document.createElement('div');
  timeUrgencyVignette.className = 'time-urgent-vignette';
  timeUrgencyVignette.setAttribute('aria-hidden', 'true');
  container.appendChild(timeUrgencyVignette);
  const gameSceneFlash = document.createElement('div');
  gameSceneFlash.className = 'game-scene__flash';

  app = new Application();
  await app.init({
    resizeTo: container,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  attachPlayableApp(app);
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
  /** Чтобы при апгрейде size показать подпись один раз и не дублировать после resize. */
  let prevHoleSizeLevel = 1;

  const state = createGameState();
  const collectibleRuns = createCollectibleRunStates();
  const fieldDecorRuns = Array.from({ length: FIELD_DECOR_CUBE_COUNT }, () =>
    createCollectibleRunState(),
  );
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
  const gameAudio = createGameAudio();
  gameAudio.initPlayableAudioLifecycle();
  let timeLeftSec = ROUND_TIME_SEC;
  /** С первого кадра, где дыра реально движется (ненулевая скорость). */
  let roundTimerStarted = false;
  const HOLE_V2_START_EPS = 1e-20;

  collectibleStatsHud.sync(
    {
      ...getConsumedCountsByKind(collectibleRuns),
      box: getFieldDecorConsumedCount(fieldDecorRuns),
    },
    layout,
    timeLeftSec,
  );
  holeProgressBar.sync(0, layout, state.holeRadius01);
  prevHoleSizeLevel = state.holeSizeLevel;

  fireGameReady();

  function endRound(won) {
    if (run.gameEnded) return;
    run.gameEnded = true;
    fireGameEnd();
    app.ticker.stop();
    gameOverOverlay.show(won ? 'Wonderful' : "Time's up", won);
  }

  function applyResizeSync(consumedSnapshot) {
    state.holeRadius01 = getHoleRadius01FromConsumed(consumedSnapshot);
    state.holeSizeLevel = getHoleSizeLevelFromConsumed(consumedSnapshot);
    viewZoomCurrent = getViewZoomTargetFromSizeLevel(state.holeSizeLevel);
    lastViewZoomTarget = viewZoomCurrent;
    holeView.setViewZoom(viewZoomCurrent);
    playfield.setScroll(state.mapNx, state.mapNy, layout, viewZoomCurrent);
    holeView.setHoleRadius01Immediate(state.holeRadius01);
    viewShakeStrength = 0;
    viewZoomFlashStrength = 0;
    gameScene.style.transform = '';
    gameSceneFlash.style.opacity = '0';
    holeProgressBar.sync(consumedSnapshot, layout, state.holeRadius01);
    prevHoleSizeLevel = state.holeSizeLevel;
    for (const run of collectibleRuns) resetCollectibleRunAttractOffset(run);
    for (const run of fieldDecorRuns) resetCollectibleRunAttractOffset(run);
    collectibleStatsHud.sync(
      {
        ...getConsumedCountsByKind(collectibleRuns),
        box: getFieldDecorConsumedCount(fieldDecorRuns),
      },
      layout,
      timeLeftSec,
    );
  }

  const detachPointer = attachPointerDrag(
    container,
    (nx, ny) => {
      gameAudio.unlock();
      setPointerTarget(state, nx, ny);
    },
    (nx, ny) => {
      gameAudio.unlock();
      beginPointerDrag(state, nx, ny);
    },
    () => {
      gameAudio.unlock();
      endPointerDrag(state);
    },
  );

  const ro = new ResizeObserver(() => {
    layout = computeLayout(container);
    playfield.resize(layout);
    holeView.resize(layout);
    holeView.setScreenCentered();
    const consumed0 = getTotalConsumedForProgress(
      collectibleRuns,
      fieldDecorRuns,
    );
    applyResizeSync(consumed0);
  });
  ro.observe(container);

  app.ticker.add(() => {
    if (run.gameEnded) {
      return;
    }
    const dt = app.ticker.deltaMS / 1000;

    stepHolePhysics(state, dt, layout);

    if (!roundTimerStarted) {
      const v2 = state.holeVnX * state.holeVnX + state.holeVnY * state.holeVnY;
      if (v2 > HOLE_V2_START_EPS) {
        roundTimerStarted = true;
        collectibleStatsHud.playTimerStartFlyout();
      }
    }

    const items = getCollectibleItems(layout);
    const fieldDecorItems = getFieldDecorItems(layout);
    for (let i = 0; i < COLLECTIBLE_COUNT; i++) {
      const runState = collectibleRuns[i];
      const item = items[i];
      if (runState.phase === 'idle') {
        stepCollectibleIdleAttract(runState, state, layout, item, dt);
      }
      const itemEff = collectibleItemWithEffective(item, runState);
      if (
        runState.phase === 'idle' &&
        shouldCollectibleBeConsumed(state, layout, runState, itemEff)
      ) {
        runState.phase = 'falling';
        runState.t = 0;
        runState.fallSpeed = COLLECTIBLE_FALL_SPEED;
        resetCollectibleRunAttractOffset(runState);
        holePopScore.pop(layout, state.holeRadius01);
        gameAudio.play(SOUND_IDS.suction);
      }
      stepCollectibleFall(runState, dt, () => {
        const kind = items[i].kind;
        if (
          kind === 'sphere' ||
          kind === 'planar' ||
          kind === 'trump' ||
          kind === 'poop'
        ) {
          collectibleStatsHud.playArrival(
            kind,
            holeView.getHoleScreenCenterIn(container),
          );
        }
      });
    }
    for (let i = 0; i < FIELD_DECOR_CUBE_COUNT; i++) {
      const runState = fieldDecorRuns[i];
      const item = fieldDecorItems[i];
      if (runState.phase === 'idle') {
        stepCollectibleIdleAttract(runState, state, layout, item, dt);
      }
      const itemEff = collectibleItemWithEffective(item, runState);
      if (
        runState.phase === 'idle' &&
        shouldCollectibleBeConsumed(state, layout, runState, itemEff)
      ) {
        runState.phase = 'falling';
        runState.t = 0;
        runState.fallSpeed = COLLECTIBLE_FALL_SPEED;
        resetCollectibleRunAttractOffset(runState);
        holePopScore.pop(layout, state.holeRadius01);
        gameAudio.play(SOUND_IDS.suction);
      }
      stepCollectibleFall(runState, dt, () => {
        collectibleStatsHud.playArrival(
          'box',
          holeView.getHoleScreenCenterIn(container),
        );
      });
    }

    const mainConsumed = getCollectibleZoneSummary(collectibleRuns).consumed;
    const totalConsumed = getTotalConsumedForProgress(
      collectibleRuns,
      fieldDecorRuns,
    );
    state.holeRadius01 = getHoleRadius01FromConsumed(totalConsumed);
    state.holeSizeLevel = getHoleSizeLevelFromConsumed(totalConsumed);
    if (state.holeSizeLevel > prevHoleSizeLevel) {
      holePopScore.pop(layout, state.holeRadius01, `size ${state.holeSizeLevel}`, {
        kind: 'sizeUp',
      });
      prevHoleSizeLevel = state.holeSizeLevel;
    }

    const zTarget = getViewZoomTargetFromSizeLevel(state.holeSizeLevel);
    const zAlpha = 1 - Math.exp(-HOLE_VIEW_ZOOM_SMOOTH_RATE * Math.min(dt, 0.1));
    viewZoomCurrent += (zTarget - viewZoomCurrent) * zAlpha;
    if (Math.abs(viewZoomCurrent - zTarget) < 1.5e-4) {
      viewZoomCurrent = zTarget;
    }
    if (zTarget > lastViewZoomTarget + 1e-7) {
      viewShakeStrength = 1;
      viewZoomFlashStrength = 1;
      gameAudio.play(SOUND_IDS.holeZoom);
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
    }, fieldDecorRuns);
    holeView.render();

    if (roundTimerStarted) {
      timeLeftSec = Math.max(0, timeLeftSec - dt);
    }

    holeJoystick.sync(state, layout);
    holeProgressBar.sync(totalConsumed, layout, state.holeRadius01);
    collectibleStatsHud.sync(
      {
        ...getConsumedCountsByKind(collectibleRuns),
        box: getFieldDecorConsumedCount(fieldDecorRuns),
      },
      layout,
      timeLeftSec,
    );

    timeUrgencyVignette.classList.toggle(
      'time-urgent-vignette--on',
      roundTimerStarted &&
        !run.gameEnded &&
        timeLeftSec > 0 &&
        timeLeftSec <= TIME_URGENT_LAST_SEC,
    );

    if (mainConsumed >= COLLECTIBLE_COUNT) {
      endRound(true);
    } else if (timeLeftSec <= 0) {
      endRound(false);
    }
  });

  window.addEventListener('pagehide', () => {
    markGameClosed();
    disposePlayableLifecycle();
    detachPointer();
    ro.disconnect();
    playfield.destroy();
    holeJoystick.destroy();
    holeProgressBar.destroy();
    holePopScore.destroy();
    collectibleStatsHud.destroy();
    gameOverOverlay.destroy();
    timeUrgencyVignette.remove();
    holeView.dispose();
    gameAudio.dispose();
    app.destroy(true, { children: true, texture: true });
  });
}

main().catch((e) => {
  console.error(e);
  const c = document.getElementById('game-container');
  if (!c) return;
  c.replaceChildren();
  createGameOverOverlay(c).show('Unable to start', false, { isFatal: true });
});
