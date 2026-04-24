import './holeProgressBar.css';
import {
  COLLECTIBLE_PROGRESS_MAX,
  HOLE_ELLIPSE_X,
  HOLE_ELLIPSE_Z,
  HOLE_RADIUS_BASE_01,
} from '../core/constants.js';
import {
  getHoleSizeLevelFromConsumed,
  getProgressSegmentConsumed,
} from '../core/gameState.js';

/**
 * Горизонтальный прогресс под визуалом дыры: в пределах сегмента — «поглощено mod» / {@link COLLECTIBLE_PROGRESS_MAX}; подпись `size N` — из {@link getHoleSizeLevelFromConsumed}.
 * @param {HTMLElement} container — `#game-container`
 */
export function createHoleProgressBar(container) {
  const root = document.createElement('div');
  root.className = 'hole-progress';
  root.setAttribute('role', 'progressbar');
  root.setAttribute('aria-valuemin', '0');
  root.setAttribute('aria-valuemax', String(COLLECTIBLE_PROGRESS_MAX));

  const track = document.createElement('div');
  track.className = 'hole-progress__track';
  const fill = document.createElement('div');
  fill.className = 'hole-progress__fill';
  const label = document.createElement('span');
  label.className = 'hole-progress__label';
  label.setAttribute('aria-hidden', 'true');
  track.append(fill, label);
  root.append(track);
  container.appendChild(root);

  /**
   * @param {number} totalConsumed — `getCollectibleZoneSummary(...).consumed` (за всю сессию)
   * @param {ReturnType<import('../core/viewport.js').computeLayout>} layout
   * @param {number} holeRadius01 — для вертикального отступа под растущую дыру; ширина/высоты бара не зависят от роста.
   */
  function sync(totalConsumed, layout, holeRadius01) {
    const minCss = Math.max(Math.min(layout.designWidth, layout.designHeight), 1e-6);
    const refBarDiameterCss = 2 * HOLE_ELLIPSE_X * HOLE_RADIUS_BASE_01 * minCss;
    const wPx = 0.72 * refBarDiameterCss;
    const hBase = Math.max(14, 0.044 * minCss);
    const hPx = (2 / 3) * hBase;
    const rExtra = Math.max(0, holeRadius01 - HOLE_RADIUS_BASE_01);
    const yOff =
      0.066 * minCss +
      5 +
      0.08 * hPx +
      HOLE_ELLIPSE_Z * rExtra * minCss;
    root.style.setProperty('--pbar-w', `${wPx}px`);
    root.style.setProperty('--pbar-h', `${hPx}px`);
    root.style.setProperty('--pbar-offset', `${yOff}px`);

    const inSegment = getProgressSegmentConsumed(totalConsumed);
    const level = getHoleSizeLevelFromConsumed(totalConsumed);
    const pct = Math.min(100, (inSegment / COLLECTIBLE_PROGRESS_MAX) * 100);
    fill.style.width = `${pct}%`;
    const labelText = `size ${level}`;
    label.textContent = labelText;
    root.setAttribute('aria-valuenow', String(inSegment));
    root.dataset.holeSizeLevel = String(level);
  }

  function destroy() {
    root.remove();
  }

  return { sync, destroy };
}
