import {
  WORLD_MAP_VIEW_MULTIPLIER,
  HOLE_ELLIPSE_X,
  HOLE_ELLIPSE_Z,
  HOLE_BALL_EAT_INNER,
  BALL_RADIUS_01,
  BALL_FALL_SPEED,
  BALL_CIRCLE_R01,
  BALL_COUNT,
} from './constants.js';

/**
 * @typedef {Object} BallState
 * @property {'idle' | 'falling' | 'done'} phase
 * @property {number} t — 0..1 during falling
 */

/** @returns {BallState} */
export function createBallState() {
  return { phase: 'idle', t: 0 };
}

/** @returns {BallState[]} */
export function createBallsState() {
  return Array.from({ length: BALL_COUNT }, () => createBallState());
}

/**
 * @param {ReturnType<import('./viewport.js').computeLayout>} layout
 * @returns {{ mapNx: number, mapNy: number }[]}
 */
export function getBallMapPositions(layout) {
  const m = WORLD_MAP_VIEW_MULTIPLIER;
  const worldW = layout.designWidth * m;
  const worldH = layout.designHeight * m;
  const rWorld = BALL_CIRCLE_R01 * Math.min(layout.designWidth, layout.designHeight);
  const out = /** @type {{ mapNx: number, mapNy: number }[]} */ ([]);
  for (let i = 0; i < BALL_COUNT; i++) {
    const a = (i / BALL_COUNT) * Math.PI * 2;
    const dx = rWorld * Math.cos(a);
    const dz = rWorld * Math.sin(a);
    out.push({ mapNx: 0.5 + dx / worldW, mapNy: 0.5 + dz / worldH });
  }
  return out;
}

/**
 * @param {import('./gameState.js').GameState} game
 * @param {ReturnType<import('./viewport.js').computeLayout>} layout
 * @param {BallState} ball
 * @param {number} mapNx
 * @param {number} mapNy
 * @returns {boolean}
 */
export function shouldBallBeConsumed(game, layout, ball, mapNx, mapNy) {
  if (ball.phase !== 'idle') return false;

  const m = WORLD_MAP_VIEW_MULTIPLIER;
  const { designWidth, designHeight } = layout;
  const worldW = designWidth * m;
  const worldH = designHeight * m;
  const dx = (mapNx - game.mapNx) * worldW;
  const dz = (mapNy - game.mapNy) * worldH;

  const base = Math.min(designWidth, designHeight);
  const s = game.holeRadius01 * base;
  const a = s * HOLE_ELLIPSE_X * HOLE_BALL_EAT_INNER;
  const b = s * HOLE_ELLIPSE_Z * HOLE_BALL_EAT_INNER;
  if (a <= 0 || b <= 0) return false;

  const rBall = BALL_RADIUS_01 * base;
  const safe =
    1 - Math.min(0.25, (rBall / Math.min(a, b)) * 0.55);
  const e = (dx * dx) / (a * a) + (dz * dz) / (b * b);
  return e < safe;
}

/**
 * @param {BallState} ball
 * @param {number} dt
 * @param {() => void} onDone
 */
export function stepBallFall(ball, dt, onDone) {
  if (ball.phase !== 'falling') return;
  const h = Math.min(dt, 1 / 30);
  ball.t += BALL_FALL_SPEED * h;
  if (ball.t >= 1) {
    ball.t = 1;
    ball.phase = 'done';
    onDone();
  }
}

export { BALL_RADIUS_01, BALL_COUNT };
