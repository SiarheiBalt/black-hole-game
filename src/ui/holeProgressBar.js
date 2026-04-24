import './holeProgressBar.css';
import { COLLECTIBLE_PROGRESS_MAX, HOLE_ELLIPSE_X } from '../core/constants.js';

/**
 * Горизонтальный прогресс под визуалом дыры: заполнение = «поглощено» / {@link COLLECTIBLE_PROGRESS_MAX}.
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
   * @param {number} consumed — `getCollectibleZoneSummary(...).consumed` (доля заполнения)
   * @param {ReturnType<import('../core/viewport.js').computeLayout>} layout
   * @param {number} holeRadius01 — как в `GameState` / `createHoleView.setRadius01`, ширина ≈ 0.72 визуального диаметра (ось X, {@link HOLE_ELLIPSE_X}).
   * @param {number} [holeSizeLevel=1] — текст в баре: `size 1`, `size 2`… (см. `GameState.holeSizeLevel`)
   */
  function sync(consumed, layout, holeRadius01, holeSizeLevel = 1) {
    const minCss = Math.max(Math.min(layout.designWidth, layout.designHeight), 1e-6);
    const holeDiameterCss = 2 * HOLE_ELLIPSE_X * holeRadius01 * minCss;
    const wPx = 0.72 * holeDiameterCss;
    const hBase = Math.max(14, 0.044 * minCss);
    const hPx = (2 / 3) * hBase;
    const yOff = 0.066 * minCss + 5 + 0.08 * hPx;
    root.style.setProperty('--pbar-w', `${wPx}px`);
    root.style.setProperty('--pbar-h', `${hPx}px`);
    root.style.setProperty('--pbar-offset', `${yOff}px`);

    const c = Math.max(0, Math.min(COLLECTIBLE_PROGRESS_MAX, consumed));
    const pct = Math.min(100, (c / COLLECTIBLE_PROGRESS_MAX) * 100);
    fill.style.width = `${pct}%`;
    const level = Math.max(1, Math.floor(holeSizeLevel)) || 1;
    const labelText = `size ${level}`;
    label.textContent = labelText;
    root.setAttribute('aria-valuenow', String(c));
    root.dataset.holeSizeLevel = String(level);
  }

  function destroy() {
    root.remove();
  }

  return { sync, destroy };
}
