/**
 * Игровое состояние дыры и ввод «виртуального стика» от точки клика.
 *
 * Пока зажата ЛКМ, скорость дыры задаётся вектором (курсор − центр клика):
 * чем дальше курсор от клика (до HOLE_STICK_RANGE), тем выше скорость (но не выше HOLE_MAX_SPEED).
 * Пока курсор не двигается, но смещение от клика сохраняется — дыра продолжает двигаться с той же скоростью.
 *
 * Подробнее: {@link ../../docs/hole-control.md}
 */

import { getMapPositionBounds01 } from './constants.js';

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
 * @property {boolean} dragging
 */

/**
 * Max |d(hole)/dt| in normalized container coords / second (at full stick deflection).
 */
export const HOLE_MAX_SPEED = 0.2;
/**
 * Cursor offset from click (norm) at which speed reaches HOLE_MAX_SPEED.
 * Closer = slower, farther (up to this) = faster.
 */
export const HOLE_STICK_RANGE = 0.22;
/** Below this offset from click, treat as no deflection (hole stops). */
export const HOLE_STICK_DEAD_ZONE = 0.008;
/** After release, velocity decay (~per second). */
export const HOLE_RELEASE_FRICTION = 6;

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
    holeRadius01: 0.065,
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
 * Mouse can stand still at an offset — hole keeps moving at that speed.
 * @param {GameState} state
 * @param {number} dt
 */
export function stepHolePhysics(state, dt) {
  const h = Math.min(dt, 1 / 30);

  if (state.dragging) {
    const sx = state.pointerTargetNx - state.controlCenterNx;
    const sy = state.pointerTargetNy - state.controlCenterNy;
    const dist = Math.hypot(sx, sy);

    if (dist < HOLE_STICK_DEAD_ZONE) {
      state.holeVnX = 0;
      state.holeVnY = 0;
    } else {
      const ux = sx / dist;
      const uy = sy / dist;
      const tilt = Math.min(1, dist / HOLE_STICK_RANGE);
      const speed = HOLE_MAX_SPEED * tilt;
      state.holeVnX = ux * speed;
      state.holeVnY = uy * speed;
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
