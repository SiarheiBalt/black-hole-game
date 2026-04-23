import { Application } from 'pixi.js';
import { computeLayout } from '../core/viewport.js';
import {
  createGameState,
  stepHolePhysics,
  setPointerTarget,
  beginPointerDrag,
  endPointerDrag,
} from '../core/gameState.js';
import {
  createBallsState,
  getBallMapPositions,
  shouldBallBeConsumed,
  stepBallFall,
  BALL_COUNT,
} from '../core/ballState.js';
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
  const ballStates = createBallsState();
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
    const ballMapPos = getBallMapPositions(layout);
    for (let i = 0; i < BALL_COUNT; i++) {
      const { mapNx: bnx, mapNy: bny } = ballMapPos[i];
      if (
        ballStates[i].phase === 'idle' &&
        shouldBallBeConsumed(state, layout, ballStates[i], bnx, bny)
      ) {
        ballStates[i].phase = 'falling';
        ballStates[i].t = 0;
      }
      stepBallFall(ballStates[i], dt, () => {});
    }
    playfield.setScroll(state.mapNx, state.mapNy, layout);
    holeView.setScreenCentered();
    holeView.updateBalls(ballStates, layout, {
      mapNx: state.mapNx,
      mapNy: state.mapNy,
      holeRadius01: state.holeRadius01,
      holeVnX: state.holeVnX,
      holeVnY: state.holeVnY,
    });
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
