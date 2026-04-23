import {
  WORLD_MAP_VIEW_MULTIPLIER,
  HOLE_ELLIPSE_X,
  HOLE_ELLIPSE_Z,
  HOLE_BALL_EAT_INNER,
  COLLECTIBLE_RADIUS_01,
  COLLECTIBLE_FALL_SPEED,
  COLLECTIBLE_CIRCLE_R01,
  COLLECTIBLE_COUNT,
} from './constants.js';

/**
 * @typedef {'sphere' | 'box'} CollectibleKind — пока в рендере только `sphere`, дальше — новые ветки
 */

/**
 * Статичное описание предмета на уровне (логич. карта, тип, id для сейвов/аналитики).
 * @typedef {Object} CollectibleItem
 * @property {string} id
 * @property {CollectibleKind} kind
 * @property {number} mapNx
 * @property {number} mapNy
 * @property {number} [radius01] — доля min(ширина, высота); иначе {@link constants.COLLECTIBLE_RADIUS_01}
 */

/**
 * Рантайм одного объекта: на поле, втягивается в дыру, или уже съеден.
 * @typedef {Object} CollectibleRunState
 * @property {'idle' | 'falling' | 'done'} phase
 * @property {number} t
 */

/**
 * @returns {CollectibleRunState}
 */
export function createCollectibleRunState() {
  return { phase: 'idle', t: 0 };
}

/** @returns {CollectibleRunState[]} */
export function createCollectibleRunStates() {
  return Array.from({ length: COLLECTIBLE_COUNT }, () => createCollectibleRunState());
}

/**
 * @param {CollectibleRunState[]} states
 * @returns {{ onField: number, falling: number, consumed: number, total: number }}
 */
export function getCollectibleZoneSummary(states) {
  let onField = 0;
  let falling = 0;
  let consumed = 0;
  for (const s of states) {
    if (s.phase === 'idle') onField += 1;
    else if (s.phase === 'falling') falling += 1;
    else if (s.phase === 'done') consumed += 1;
  }
  return { onField, falling, consumed, total: states.length };
}

/**
 * Позиции и метаданные уровня (круг, центр 0.5/0.5). Пересчитывается при смене layout.
 * @param {ReturnType<import('./viewport.js').computeLayout>} layout
 * @returns {CollectibleItem[]}
 */
export function getCollectibleItems(layout) {
  const m = WORLD_MAP_VIEW_MULTIPLIER;
  const worldW = layout.designWidth * m;
  const worldH = layout.designHeight * m;
  const rWorld = COLLECTIBLE_CIRCLE_R01 * Math.min(layout.designWidth, layout.designHeight);
  const out = /** @type {CollectibleItem[]} */ ([]);
  for (let i = 0; i < COLLECTIBLE_COUNT; i++) {
    const a = (i / COLLECTIBLE_COUNT) * Math.PI * 2;
    const dx = rWorld * Math.cos(a);
    const dz = rWorld * Math.sin(a);
    out.push({
      id: `c-${i}`,
      kind: 'sphere',
      mapNx: 0.5 + dx / worldW,
      mapNy: 0.5 + dz / worldH,
      radius01: COLLECTIBLE_RADIUS_01,
    });
  }
  return out;
}

/**
 * @param {import('./gameState.js').GameState} game
 * @param {ReturnType<import('./viewport.js').computeLayout>} layout
 * @param {CollectibleRunState} run
 * @param {CollectibleItem} item
 * @returns {boolean}
 */
export function shouldCollectibleBeConsumed(game, layout, run, item) {
  if (run.phase !== 'idle') return false;

  const m = WORLD_MAP_VIEW_MULTIPLIER;
  const { designWidth, designHeight } = layout;
  const worldW = designWidth * m;
  const worldH = designHeight * m;
  const mapNx = item.mapNx;
  const mapNy = item.mapNy;
  const dx = (mapNx - game.mapNx) * worldW;
  const dz = (mapNy - game.mapNy) * worldH;

  const base = Math.min(designWidth, designHeight);
  const s = game.holeRadius01 * base;
  const a = s * HOLE_ELLIPSE_X * HOLE_BALL_EAT_INNER;
  const b = s * HOLE_ELLIPSE_Z * HOLE_BALL_EAT_INNER;
  if (a <= 0 || b <= 0) return false;

  const r01 = item.radius01 ?? COLLECTIBLE_RADIUS_01;
  const rObj = r01 * base;
  const safe =
    1 - Math.min(0.25, (rObj / Math.min(a, b)) * 0.55);
  const e = (dx * dx) / (a * a) + (dz * dz) / (b * b);
  return e < safe;
}

/**
 * @param {CollectibleRunState} run
 * @param {number} dt
 * @param {() => void} onDone
 */
export function stepCollectibleFall(run, dt, onDone) {
  if (run.phase !== 'falling') return;
  const h = Math.min(dt, 1 / 30);
  run.t += COLLECTIBLE_FALL_SPEED * h;
  if (run.t >= 1) {
    run.t = 1;
    run.phase = 'done';
    onDone();
  }
}

export { COLLECTIBLE_COUNT, COLLECTIBLE_RADIUS_01 };
