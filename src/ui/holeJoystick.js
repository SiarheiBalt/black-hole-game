import './holeJoystick.css';
import { HOLE_STICK_RANGE } from '../core/gameState.js';

/** Диаметр ручки / диаметр базы (как на референсе ~35–40%). */
const KNOB_DIAMETER_FRAC_OF_BASE = 0.38;
/** Доля радиуса ручки, на которую она может «вылезти» за край базы (остальное — сдвиг базы к ручке). */
const KNOB_MAX_PROTRUSION_FRAC_OF_RADIUS = 0.75;
/** Минимальный шаг указателя (px), чтобы считать направление движения. */
const POINTER_MOVE_MIN_PX_FRAC_MIN_SIDE = 0.008;
/**
 * Если скалярное произведение единичного смещения курсора с предыдущим кадром ниже этого — резкий разворот:
 * внешний круг замирает до согласования (курсор в пределах maxKnobDist от текущей базы).
 */
const POINTER_FLIP_DOT_THRESHOLD = -0.22;

/**
 * Оверлей виртуального джойстика: база в `controlCenter`, ручка по вектору к указателю.
 * @param {HTMLElement} container — `#game-container`
 */
export function createHoleJoystick(container) {
  const root = document.createElement('div');
  root.className = 'hole-joystick';
  root.setAttribute('aria-hidden', 'true');
  root.hidden = true;

  const anchor = document.createElement('div');
  anchor.className = 'hole-joystick__anchor';

  const base = document.createElement('div');
  base.className = 'hole-joystick__base';

  const knob = document.createElement('div');
  knob.className = 'hole-joystick__knob';

  anchor.append(base, knob);
  root.append(anchor);
  container.appendChild(root);

  /** @type {number | null} */
  let visAnchorNx = null;
  /** @type {number | null} */
  let visAnchorNy = null;
  /** @type {number | null} */
  let prevPtrNx = null;
  /** @type {number | null} */
  let prevPtrNy = null;
  let lastMoveUx = 0;
  let lastMoveUy = 0;
  let hasLastMove = false;
  let baseFrozen = false;

  function sync(state, layout) {
    if (!state.dragging) {
      root.hidden = true;
      visAnchorNx = null;
      visAnchorNy = null;
      prevPtrNx = null;
      prevPtrNy = null;
      hasLastMove = false;
      baseFrozen = false;
      return;
    }

    root.hidden = false;

    const vw = layout.designWidth;
    const vh = layout.designHeight;
    const minCss = Math.max(Math.min(vw, vh), 1e-6);
    const baseRadiusPx = HOLE_STICK_RANGE * minCss;
    const baseSizePx = 2 * baseRadiusPx;
    const knobSizePx = baseSizePx * KNOB_DIAMETER_FRAC_OF_BASE;
    const knobRadiusPx = knobSizePx / 2;
    const maxKnobDistPx =
      baseRadiusPx - knobRadiusPx + KNOB_MAX_PROTRUSION_FRAC_OF_RADIUS * knobRadiusPx;
    const moveMinPx = POINTER_MOVE_MIN_PX_FRAC_MIN_SIDE * minCss;

    if (visAnchorNx == null || visAnchorNy == null) {
      visAnchorNx = state.controlCenterNx;
      visAnchorNy = state.controlCenterNy;
      prevPtrNx = state.pointerTargetNx;
      prevPtrNy = state.pointerTargetNy;
      hasLastMove = false;
      baseFrozen = false;
    }

    const ddx = (state.pointerTargetNx - prevPtrNx) * vw;
    const ddy = (state.pointerTargetNy - prevPtrNy) * vh;
    const dLen = Math.hypot(ddx, ddy);
    if (dLen >= moveMinPx) {
      const mux = ddx / dLen;
      const muy = ddy / dLen;
      if (hasLastMove && mux * lastMoveUx + muy * lastMoveUy < POINTER_FLIP_DOT_THRESHOLD) {
        baseFrozen = true;
      }
      lastMoveUx = mux;
      lastMoveUy = muy;
      hasLastMove = true;
    }
    prevPtrNx = state.pointerTargetNx;
    prevPtrNy = state.pointerTargetNy;

    const ccPx = state.controlCenterNx * vw;
    const ccPy = state.controlCenterNy * vh;
    const ptPx = state.pointerTargetNx * vw;
    const ptPy = state.pointerTargetNy * vh;
    const dx = ptPx - ccPx;
    const dy = ptPy - ccPy;
    const d0 = Math.hypot(dx, dy);

    let idealNx = state.controlCenterNx;
    let idealNy = state.controlCenterNy;
    let idealKx = dx;
    let idealKy = dy;

    if (d0 > maxKnobDistPx && d0 > 1e-6) {
      const ux = dx / d0;
      const uy = dy / d0;
      idealKx = ux * maxKnobDistPx;
      idealKy = uy * maxKnobDistPx;
      idealNx = (ptPx - idealKx) / vw;
      idealNy = (ptPy - idealKy) / vh;
    }

    const dPtrVisPx = Math.hypot(
      (state.pointerTargetNx - visAnchorNx) * vw,
      (state.pointerTargetNy - visAnchorNy) * vh,
    );

    let anchorNx;
    let anchorNy;
    let kx;
    let ky;

    if (baseFrozen) {
      if (dPtrVisPx <= maxKnobDistPx) {
        baseFrozen = false;
        visAnchorNx = idealNx;
        visAnchorNy = idealNy;
        anchorNx = idealNx;
        anchorNy = idealNy;
        kx = idealKx;
        ky = idealKy;
      } else {
        anchorNx = visAnchorNx;
        anchorNy = visAnchorNy;
        kx = (state.pointerTargetNx - visAnchorNx) * vw;
        ky = (state.pointerTargetNy - visAnchorNy) * vh;
      }
    } else {
      visAnchorNx = idealNx;
      visAnchorNy = idealNy;
      anchorNx = idealNx;
      anchorNy = idealNy;
      kx = idealKx;
      ky = idealKy;
    }

    root.style.setProperty('--j-cx', `${anchorNx * 100}%`);
    root.style.setProperty('--j-cy', `${anchorNy * 100}%`);
    root.style.setProperty('--j-size', `${baseSizePx}px`);
    root.style.setProperty('--j-knob', `${knobSizePx}px`);
    root.style.setProperty('--j-kx', `${kx}px`);
    root.style.setProperty('--j-ky', `${ky}px`);
  }

  function destroy() {
    root.remove();
  }

  return { sync, destroy };
}
