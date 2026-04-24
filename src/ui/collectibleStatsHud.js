import './collectibleStatsHud.css';

const MONEY_SRC = new URL('../assets/money.png', import.meta.url).href;
const TRUMP_SRC = new URL('../assets/trump.png', import.meta.url).href;
const POOP_SRC = new URL('../assets/poop.png', import.meta.url).href;

/**
 * HUD: иконка типа коллектабла + сколько уже провалилось в дыру.
 * @param {HTMLElement} container — `#game-container`
 */
export function createCollectibleStatsHud(container) {
  const root = document.createElement('div');
  root.className = 'collectible-stats';
  root.setAttribute('aria-label', 'Поглощено по типам');

  const rows = [
    { key: 'sphere', iconKind: 'sphere' },
    { key: 'planar', iconKind: 'img', src: MONEY_SRC, alt: '' },
    { key: 'trump', iconKind: 'img', src: TRUMP_SRC, alt: '' },
    { key: 'poop', iconKind: 'img', src: POOP_SRC, alt: '' },
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
    root.appendChild(row);
    countEls.push({ key: spec.key, el: count });
    byKind.set(spec.key, { row, iconEl, count });
  }

  container.appendChild(root);

  /**
   * @param {{ sphere: number, planar: number, trump: number, poop: number }} byKind
   * @param {ReturnType<import('../core/viewport.js').computeLayout>} layout
   */
  function sync(byKind, layout) {
    const minCss = Math.max(Math.min(layout.designWidth, layout.designHeight), 1e-6);
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

    for (const { key, el } of countEls) {
      el.textContent = String(byKind[key] ?? 0);
    }
  }

  function destroy() {
    root.remove();
  }

  /**
   * После поглощения в 3D: мини-иконка летит от дыры к строке, при прилёте — пульс иконки.
   * @param {string} kind — `sphere` | `planar` | `trump` | `poop`
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

  return { sync, destroy, playArrival };
}
