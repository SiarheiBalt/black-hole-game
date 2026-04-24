import './holePopScore.css';
import { HOLE_ELLIPSE_Z } from '../core/constants.js';

/**
 * Краткие всплывающие подписи «+1» у центра дыры (см. {@link createHoleView} / контейнер).
 * @param {HTMLElement} container — `#game-container`
 */
export function createHolePopScore(container) {
  const root = document.createElement('div');
  root.className = 'hole-pop-score';
  root.setAttribute('aria-hidden', 'true');
  container.appendChild(root);

  let stagger = 0;

  /**
   * Показать всплывающий «+1» (масштаб и исчезновение в CSS), якорь — верхняя точка эллипса дыры (как в Three.js: {@link HOLE_ELLIPSE_Z}).
   * @param {ReturnType<import('../core/viewport.js').computeLayout>} layout
   * @param {number} holeRadius01 — `GameState.holeRadius01`
   * @param {string} [text='+1'] — подпись
   */
  function pop(layout, holeRadius01, text = '+1') {
    const minCss = Math.max(Math.min(layout.designWidth, layout.designHeight), 1e-6);
    const rimPx = holeRadius01 * minCss * HOLE_ELLIPSE_Z;
    const el = document.createElement('div');
    el.className = 'hole-pop-score__item';
    el.textContent = text;
    el.style.setProperty('--pop-hole-rim-px', `${rimPx}px`);
    const s = (stagger % 5) - 2;
    stagger += 1;
    el.style.setProperty('--pop-dx', `${s * 22}px`);
    root.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  function destroy() {
    root.remove();
  }

  return { pop, destroy };
}
