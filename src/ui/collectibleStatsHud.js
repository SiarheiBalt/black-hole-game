import './collectibleStatsHud.css';
import { ROUND_TIME_SEC } from '../core/constants.js';
import { DEFAULT_HUD_ICONS } from '../themes.js';

/**
 * HUD: иконка типа коллектабла + сколько уже провалилось в дыру.
 * @param {HTMLElement} container — `#game-container`
 */
/**
 * @typedef {Object} CollectibleStatsHudOptions
 * @property {{ planar: string, trump: string, poop: string }} [icons]
 */

/**
 * HUD: иконка типа коллектабла + сколько уже провалилось в дыру.
 * @param {HTMLElement} container — `#game-container`
 * @param {CollectibleStatsHudOptions} [options]
 */
export function createCollectibleStatsHud(container, options = {}) {
  const icons = { ...DEFAULT_HUD_ICONS, ...(options.icons ?? {}) };
  const root = document.createElement('div');
  root.className = 'collectible-stats';
  root.setAttribute('aria-label', 'Поглощено по типам');

  const rowsWrap = document.createElement('div');
  rowsWrap.className = 'collectible-stats__rows';

  const rows = [
    { key: 'sphere', iconKind: 'sphere' },
    { key: 'planar', iconKind: 'img', src: icons.planar, alt: '' },
    { key: 'trump', iconKind: 'img', src: icons.trump, alt: '' },
    { key: 'poop', iconKind: 'img', src: icons.poop, alt: '' },
    { key: 'triangle', iconKind: 'triangle' },
    { key: 'box', iconKind: 'box' },
  ];

  /** @type {{ key: string, el: HTMLElement }[]} */
  const countEls = [];

  /** @type {Map<string, { row: HTMLElement, iconEl: HTMLElement, count: HTMLElement }>} */
  const byKind = new Map();

  for (const spec of rows) {
    const row = document.createElement('div');
    row.className = 'collectible-stats__row';
    row.dataset.collectibleKind = spec.key;

    let iconEl;
    if (spec.iconKind === 'sphere') {
      iconEl = document.createElement('div');
      iconEl.className = 'collectible-stats__icon collectible-stats__icon--sphere';
      iconEl.setAttribute('aria-hidden', 'true');
    } else if (spec.iconKind === 'box') {
      iconEl = document.createElement('div');
      iconEl.className = 'collectible-stats__icon collectible-stats__icon--box';
      iconEl.setAttribute('aria-hidden', 'true');
    } else if (spec.iconKind === 'triangle') {
      iconEl = document.createElement('div');
      iconEl.className =
        'collectible-stats__icon collectible-stats__icon--triangle';
      iconEl.setAttribute('aria-hidden', 'true');
    } else {
      const img = document.createElement('img');
      img.className = 'collectible-stats__icon collectible-stats__icon--img';
      img.src = spec.src;
      img.alt = spec.alt;
      img.width = 55;
      img.height = 55;
      iconEl = img;
    }

    const count = document.createElement('span');
    count.className = 'collectible-stats__count';
    count.textContent = '0';

    row.append(iconEl, count);
    rowsWrap.appendChild(row);
    countEls.push({ key: spec.key, el: count });
    byKind.set(spec.key, { row, iconEl, count });
  }

  const timer = document.createElement('div');
  timer.className = 'collectible-stats__timer';
  timer.setAttribute('aria-label', 'Time remaining');
  const timerValue = document.createElement('span');
  timerValue.className = 'collectible-stats__timer-value';
  {
    const s0 = Math.max(0, Math.floor(ROUND_TIME_SEC));
    timerValue.textContent = `${Math.floor(s0 / 60)}:${(s0 % 60).toString().padStart(2, '0')}`;
  }
  timer.appendChild(timerValue);

  root.append(rowsWrap, timer);
  container.appendChild(root);

  let lastLayoutMin = -1;
  let lastCountsSig = '';
  let lastTimerSec = -1;

  /**
   * @param {{ sphere: number, planar: number, trump: number, poop: number, box?: number }} byKindCounts
   * @param {ReturnType<import('../core/viewport.js').computeLayout>} layout
   * @param {number} [secondsLeft] — оставшееся время (сек), по умолчанию `ROUND_TIME_SEC` из `constants`
   */
  function sync(byKindCounts, layout, secondsLeft = ROUND_TIME_SEC) {
    const minCss = Math.max(Math.min(layout.designWidth, layout.designHeight), 1e-6);
    if (minCss !== lastLayoutMin) {
      lastLayoutMin = minCss;
      const pad = Math.max(11, 0.025 * minCss);
      const gap = Math.max(6, 0.0165 * minCss);
      const inset = Math.max(8, 0.021 * minCss);
      const icon = Math.max(23, 0.045 * minCss);
      const font = Math.max(13, 0.03 * minCss);
      root.style.setProperty('--stats-pad', `${pad}px`);
      root.style.setProperty('--stats-gap', `${gap}px`);
      root.style.setProperty('--stats-inset', `${inset}px`);
      root.style.setProperty('--stats-row-gap', `${Math.max(7, 0.018 * minCss)}px`);
      root.style.setProperty('--stats-icon', `${icon}px`);
      root.style.setProperty('--stats-font', `${font}px`);
    }

    const sig = countEls.map(({ key }) => String(byKindCounts[key] ?? 0)).join(',');
    if (sig !== lastCountsSig) {
      lastCountsSig = sig;
      for (const { key, el } of countEls) {
        el.textContent = String(byKindCounts[key] ?? 0);
      }
    }

    const s = Math.max(0, Math.floor(secondsLeft));
    if (s !== lastTimerSec) {
      lastTimerSec = s;
      const m = Math.floor(s / 60);
      const sec = s % 60;
      timerValue.textContent = `${m}:${sec.toString().padStart(2, '0')}`;
      timer.classList.toggle('collectible-stats__timer--warn', s > 0 && s <= 10);
    }
  }

  function destroy() {
    root.remove();
  }

  /**
   * После поглощения в 3D: мини-иконка летит от дыры к строке, при прилёте — пульс иконки.
   * @param {string} kind — `sphere` | `planar` | `trump` | `poop` | `box`
   * @param {{ x: number, y: number }} from — центр дыры в пикселях от `container` (как getBoundingClientRect-разница)
   */
  function playArrival(kind, from) {
    const rec = byKind.get(kind);
    if (!rec) return;

    const cRect = container.getBoundingClientRect();
    const iRect = rec.iconEl.getBoundingClientRect();
    const toX = iRect.left + iRect.width * 0.5 - cRect.left;
    const toY = iRect.top + iRect.height * 0.5 - cRect.top;
    const fromX = from.x;
    const fromY = from.y;

    /** Квадратичная Безье: контрольная точка под хордой (нижняя дуга; Y вниз по экрану). */
    const chord = Math.hypot(toX - fromX, toY - fromY);
    const sag = Math.max(52, Math.min(220, 0.22 * cRect.height + 0.16 * chord));
    const cx = (fromX + toX) * 0.5;
    const cy = (fromY + toY) * 0.5 + sag;
    const quad = (t) => {
      const u = 1 - t;
      return {
        x: u * u * fromX + 2 * u * t * cx + t * t * toX,
        y: u * u * fromY + 2 * u * t * cy + t * t * toY,
      };
    };

    const size = Math.max(28, Math.min(56, (iRect.width + iRect.height) * 0.5));

    const fly = document.createElement('div');
    fly.className = 'collectible-stats__fly';
    fly.setAttribute('aria-hidden', 'true');

    const inner =
      rec.iconEl.tagName === 'IMG'
        ? (() => {
            const img = document.createElement('img');
            img.className = 'collectible-stats__fly-icon collectible-stats__fly-icon--img';
            img.src = /** @type {HTMLImageElement} */ (rec.iconEl).src;
            img.alt = '';
            return img;
          })()
        : (() => {
            const m = document.createElement('div');
            m.className =
              'collectible-stats__fly-icon collectible-stats__icon collectible-stats__icon--sphere';
            return m;
          })();

    fly.appendChild(inner);
    container.appendChild(fly);
    Object.assign(fly.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: `${size}px`,
      height: `${size}px`,
      zIndex: '8',
    });

    const durationMs = 920;
    const nSeg = 12;
    const stops = Array.from({ length: nSeg + 1 }, (_, j) => j / nSeg);
    const kf = stops.map((t) => {
      const p = quad(t);
      const sc = 0.28 + (1 - 0.28) * t;
      return {
        offset: t,
        transform: `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${sc})`,
        opacity: 0.92 - 0.04 * t,
      };
    });
    const anim = fly.animate(kf, {
      duration: durationMs,
      easing: 'cubic-bezier(0.33, 0, 0.2, 1)',
    });
    void anim.finished.then(() => {
      fly.remove();
      rec.iconEl.classList.add('collectible-stats__icon--arrived');
      const onEnd = () => {
        rec.iconEl.removeEventListener('animationend', onEnd);
        rec.iconEl.classList.remove('collectible-stats__icon--arrived');
      };
      rec.iconEl.addEventListener('animationend', onEnd);
    });
  }

  /** Старт отсчёта: вылет подписи в центр игрового поля. */
  function playTimerStartFlyout() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    const x = w * 0.5;
    const y = h * 0.5;
    const upPx = Math.min(52, 0.06 * h);

    const el = document.createElement('div');
    el.className = 'collectible-stats__timer-flyout';
    el.textContent = "Time's running!";
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    Object.assign(el.style, {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      zIndex: '9',
    });
    container.appendChild(el);
    const anim = el.animate(
      [
        { transform: 'translate(-50%, -50%) translate(0, 10px) scale(0.45)', opacity: 0 },
        {
          offset: 0.22,
          opacity: 1,
          transform: 'translate(-50%, -50%) translate(0, 0) scale(1)',
        },
        {
          transform: `translate(-50%, -50%) translate(0, ${-upPx}px) scale(1.04)`,
          opacity: 0,
        },
      ],
      { duration: 900, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' },
    );
    void anim.finished.then(() => {
      el.remove();
    });
  }

  return { sync, destroy, playArrival, playTimerStartFlyout };
}
