import './holeJoystick.css';

/** Диаметр ручки / диаметр базы (как на референсе ~35–40%). */
const KNOB_DIAMETER_FRAC_OF_BASE = 0.38;
/**
 * Доля радиуса ручки: центр ручки может сместиться за окружность базы настолько,
 * сохраняя визуально «держим край», пока база остаётся в точке клика.
 */
const KNOB_MAX_PROTRUSION_FRAC_OF_RADIUS = 0.75;
/** Фиксированный визуальный размер базы джойстика для overlay. */
const JOYSTICK_VISUAL_BASE_RADIUS_FRAC = 0.13;

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

  function sync(state, layout) {
    if (!state.dragging) {
      root.hidden = true;
      return;
    }

    root.hidden = false;

    const vw = layout.designWidth;
    const vh = layout.designHeight;
    const minCss = Math.max(Math.min(vw, vh), 1e-6);
    const baseRadiusPx = JOYSTICK_VISUAL_BASE_RADIUS_FRAC * minCss;
    const baseSizePx = 2 * baseRadiusPx;
    const knobSizePx = baseSizePx * KNOB_DIAMETER_FRAC_OF_BASE;
    const knobRadiusPx = knobSizePx / 2;
    const maxKnobDistPx =
      baseRadiusPx - knobRadiusPx + KNOB_MAX_PROTRUSION_FRAC_OF_RADIUS * knobRadiusPx;

    const ccPx = state.controlCenterNx * vw;
    const ccPy = state.controlCenterNy * vh;
    const ptPx = state.pointerTargetNx * vw;
    const ptPy = state.pointerTargetNy * vh;
    const dx = ptPx - ccPx;
    const dy = ptPy - ccPy;
    const d0 = Math.hypot(dx, dy);

    let kx = dx;
    let ky = dy;
    if (d0 > maxKnobDistPx && d0 > 1e-6) {
      const ux = dx / d0;
      const uy = dy / d0;
      kx = ux * maxKnobDistPx;
      ky = uy * maxKnobDistPx;
    }

    root.style.setProperty('--j-cx', `${state.controlCenterNx * 100}%`);
    root.style.setProperty('--j-cy', `${state.controlCenterNy * 100}%`);
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
