/**
 * Игровое состояние дыры и ввод «виртуального стика» от точки клика.
 *
 * Пока зажата ЛКМ, скорость дыры задаётся вектором (курсор − центр клика):
 * чем дальше курсор от клика (до HOLE_STICK_RANGE), тем выше скорость (но не выше HOLE_MAX_SPEED).
 * Пока курсор не двигается, но смещение от клика сохраняется — дыра продолжает двигаться с той же скоростью.
 *
 * Подробнее: {@link ../../docs/hole-control.md}
 */

import {
  getMapPositionBounds01,
  WORLD_MAP_VIEW_MULTIPLIER,
  COLLECTIBLE_PROGRESS_MAX,
  HOLE_RADIUS_BASE_01,
  HOLE_RADIUS_GROWTH_PER_SIZE_LEVEL_01,
  HOLE_RADIUS_MAX_01,
  HOLE_SPEED_SIZE_SLOWDOWN,
} from './constants.js';

/**
 * @typedef {Object} GameState
 * @property {number} mapNx — позиция на карте, норм. [min,max] из getMapPositionBounds01()
 * @property {number} mapNy
 * @property {number} holeVnX — скорость дыры (норм./с); после отпускания гасится трением
 * @property {number} holeVnY
 * @property {number} pointerTargetNx — текущий курсор (norm)
 * @property {number} pointerTargetNy
 * @property {number} controlCenterNx — точка pointerdown, центр стика
 * @property {number} controlCenterNy
 * @property {number} holeRadius01
 * @property {number} holeSizeLevel — «размер» дыры для геймлея/апгрейдов: 1 + число **полных** заполнений прогресс-бара (по {@link COLLECTIBLE_PROGRESS_MAX} поглощённых на сегмент)
 * @property {boolean} dragging
 */

/**
 * At full stick: max |d(playfieldRoot)/dt| in layout px/s equals
 * `HOLE_MAX_SPEED * min(worldW, worldH)` with `worldW/H = designWidth/Height * WORLD_MAP_VIEW_MULTIPLIER`.
 * `holeVnX/Y` are chosen so X/Y pan match that cap (isotropic on screen).
 */
export const HOLE_MAX_SPEED = 0.16;
/**
 * Cursor offset from click (norm) at which speed reaches HOLE_MAX_SPEED.
 * Closer = slower, farther (up to this) = faster.
 */
export const HOLE_STICK_RANGE = 0.13;
/** Below this offset from click, treat as no deflection (hole stops). */
export const HOLE_STICK_DEAD_ZONE = 0.008;
/** After release, velocity decay (~per second). */
export const HOLE_RELEASE_FRICTION = 6;

/**
 * Сколько поглощений учитывается в **текущем** сегменте бара (после заполнения шаг 0 снова).
 * @param {number} totalConsumed — всего с `phase === 'done'`
 */
export function getProgressSegmentConsumed(totalConsumed) {
  const c = Math.max(0, Math.floor(totalConsumed));
  const m = Math.max(1, COLLECTIBLE_PROGRESS_MAX);
  return c % m;
}

/**
 * Уровень размера дыры: при полном баре (первый раз) → 2, далее +1 за каждое повторное заполнение.
 * @param {number} totalConsumed — всего поглощённых
 */
export function getHoleSizeLevelFromConsumed(totalConsumed) {
  const c = Math.max(0, Math.floor(totalConsumed));
  const m = Math.max(1, COLLECTIBLE_PROGRESS_MAX);
  return 1 + Math.floor(c / m);
}

/**
 * Радиус в долях min стороны от уровня `size` (1 = база, +1 ступень за каждый инкремент `size`).
 * @param {number} sizeLevel — как {@link getHoleSizeLevelFromConsumed}
 */
export function getHoleRadius01FromSizeLevel(sizeLevel) {
  const L = Math.max(1, Math.floor(sizeLevel));
  const steps = L - 1;
  const r = HOLE_RADIUS_BASE_01 + HOLE_RADIUS_GROWTH_PER_SIZE_LEVEL_01 * steps;
  return Math.min(HOLE_RADIUS_MAX_01, r);
}

/**
 * Радиус дыры: меняется только при смене уровня `size`, не на каждое поглощение.
 * @param {number} totalConsumed
 */
export function getHoleRadius01FromConsumed(totalConsumed) {
  return getHoleRadius01FromSizeLevel(getHoleSizeLevelFromConsumed(totalConsumed));
}

/**
 * Множитель к `HOLE_MAX_SPEED`: с каждым уровнем `size` (не с каждым поглощённым объектом) потолок ниже.
 * Шаги по `size` согласованы с ростом радиуса: один инкремент `size` даёт тот же `rel`, что и +`HOLE_RADIUS_GROWTH_PER_SIZE_LEVEL_01` к базовому радиусу.
 * @param {number} sizeLevel — как `GameState.holeSizeLevel` / {@link getHoleSizeLevelFromConsumed}
 */
export function getHoleMaxSpeedScaleFromSizeLevel(sizeLevel) {
  const L = Math.max(1, Math.floor(sizeLevel));
  const steps = L - 1;
  const rel = steps * (HOLE_RADIUS_GROWTH_PER_SIZE_LEVEL_01 / HOLE_RADIUS_BASE_01);
  return 1 / (1 + HOLE_SPEED_SIZE_SLOWDOWN * rel);
}

/** @returns {GameState} */
export function createGameState() {
  return {
    mapNx: 0.5,
    mapNy: 0.5,
    holeVnX: 0,
    holeVnY: 0,
    pointerTargetNx: 0.5,
    pointerTargetNy: 0.5,
    controlCenterNx: 0.5,
    controlCenterNy: 0.5,
    holeRadius01: getHoleRadius01FromSizeLevel(1),
    holeSizeLevel: 1,
    dragging: false,
  };
}

/**
 * Начало перетаскивания: центр стика = точка клика, скорость дыры сбрасывается.
 * @param {GameState} state
 * @param {number} nx
 * @param {number} ny
 */
export function beginPointerDrag(state, nx, ny) {
  state.dragging = true;
  state.controlCenterNx = nx;
  state.controlCenterNy = ny;
  state.pointerTargetNx = nx;
  state.pointerTargetNy = ny;
  state.holeVnX = 0;
  state.holeVnY = 0;
}

/**
 * Конец перетаскивания: стик выключается; остаточная скорость гасится в stepHolePhysics.
 * @param {GameState} state
 */
export function endPointerDrag(state) {
  state.dragging = false;
}

/**
 * Обновить позицию курсора (pointermove); влияет на отклонение стика от controlCenter.
 * @param {GameState} state
 * @param {number} nx
 * @param {number} ny
 */
export function setPointerTarget(state, nx, ny) {
  state.pointerTargetNx = nx;
  state.pointerTargetNy = ny;
}

function clampMapToBounds(x, b) {
  return Math.max(b.min, Math.min(b.max, x));
}

/**
 * While dragging: velocity from (cursor − click): longer offset → higher speed (capped).
 * Stick direction and dead zone use pixel-isotropic space; map speeds match screen pan in px/s.
 * Mouse can stand still at an offset — hole keeps moving at that speed.
 * @param {GameState} state
 * @param {number} dt
 * @param {ReturnType<import('./viewport.js').computeLayout>} layout
 */
export function stepHolePhysics(state, dt, layout) {
  const h = Math.min(dt, 1 / 30);
  const vw = layout.designWidth;
  const vh = layout.designHeight;
  const m = WORLD_MAP_VIEW_MULTIPLIER;
  const worldW = Math.max(vw * m, 1e-6);
  const worldH = Math.max(vh * m, 1e-6);
  const minWorldSpan = Math.max(Math.min(worldW, worldH), 1e-6);
  const speedScale = getHoleMaxSpeedScaleFromSizeLevel(state.holeSizeLevel);
  const pixelMax = HOLE_MAX_SPEED * minWorldSpan * speedScale;
  const minCss = Math.max(Math.min(vw, vh), 1e-6);
  const deadPx = HOLE_STICK_DEAD_ZONE * minCss;
  const rangePx = HOLE_STICK_RANGE * minCss;

  if (state.dragging) {
    const sx = state.pointerTargetNx - state.controlCenterNx;
    const sy = state.pointerTargetNy - state.controlCenterNy;
    const dxPx = sx * vw;
    const dyPx = sy * vh;
    const distPx = Math.hypot(dxPx, dyPx);

    if (distPx < deadPx) {
      state.holeVnX = 0;
      state.holeVnY = 0;
    } else {
      const ux = dxPx / distPx;
      const uy = dyPx / distPx;
      const tilt = Math.min(1, distPx / rangePx);
      const pixPerSec = pixelMax * tilt;
      state.holeVnX = (ux * pixPerSec) / worldW;
      state.holeVnY = (uy * pixPerSec) / worldH;
    }

    state.mapNx += state.holeVnX * h;
    state.mapNy += state.holeVnY * h;
  } else {
    const decay = Math.exp(-HOLE_RELEASE_FRICTION * h);
    state.holeVnX *= decay;
    state.holeVnY *= decay;
    state.mapNx += state.holeVnX * h;
    state.mapNy += state.holeVnY * h;
  }

  const b = getMapPositionBounds01();
  state.mapNx = clampMapToBounds(state.mapNx, b);
  state.mapNy = clampMapToBounds(state.mapNy, b);

  if (state.mapNx <= b.min || state.mapNx >= b.max) state.holeVnX = 0;
  if (state.mapNy <= b.min || state.mapNy >= b.max) state.holeVnY = 0;
}
