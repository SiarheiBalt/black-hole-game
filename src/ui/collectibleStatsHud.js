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

  for (const spec of rows) {
    const row = document.createElement('div');
    row.className = 'collectible-stats__row';

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

  return { sync, destroy };
}
