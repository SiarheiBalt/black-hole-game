/**
 * Full-bleed layout: playfield matches the container (no letterboxing).
 * @param {HTMLElement} containerEl
 */
export function computeLayout(containerEl) {
  const cssW = containerEl.clientWidth;
  const cssH = containerEl.clientHeight;

  const contentW = cssW;
  const contentH = cssH;
  const offsetX = 0;
  const offsetY = 0;
  const scale = 1;

  const designWidth = cssW;
  const designHeight = cssH;

  const worldHalfW = designWidth / 2;
  const worldHalfH = designHeight / 2;

  return {
    cssW,
    cssH,
    scale,
    contentW,
    contentH,
    offsetX,
    offsetY,
    worldHalfW,
    worldHalfH,
    designWidth,
    designHeight,
  };
}

/**
 * Map pointer normalized to container [0,1] into playfield [0,1].
 * With full-bleed layout this matches container coords.
 * @param {ReturnType<typeof computeLayout>} layout
 * @param {number} nx
 * @param {number} ny
 */
export function containerToDesignNormalized(layout, nx, ny) {
  const tX = (nx * layout.cssW - layout.offsetX) / layout.contentW;
  const tY = (ny * layout.cssH - layout.offsetY) / layout.contentH;
  return {
    dx: Math.max(0, Math.min(1, tX)),
    dy: Math.max(0, Math.min(1, tY)),
  };
}
