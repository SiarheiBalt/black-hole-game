import {
  WORLD_MAP_VIEW_MULTIPLIER,
  HOLE_ELLIPSE_X,
  HOLE_ELLIPSE_Z,
  HOLE_BALL_EAT_INNER,
  COLLECTIBLE_RADIUS_01,
  COLLECTIBLE_MONEY_RADIUS_01,
  COLLECTIBLE_TRUMP_RADIUS_01,
  COLLECTIBLE_POOP_RADIUS_01,
  COLLECTIBLE_FALL_SPEED,
  COLLECTIBLE_CIRCLE_R01,
  COLLECTIBLE_MONEY_CIRCLE_R01,
  COLLECTIBLE_TRUMP_CIRCLE_R01,
  COLLECTIBLE_POOP_CIRCLE_R01,
  COLLECTIBLE_SPHERE_COUNT,
  COLLECTIBLE_MONEY_COUNT,
  COLLECTIBLE_TRUMP_COUNT,
  COLLECTIBLE_POOP_COUNT,
  COLLECTIBLE_COUNT,
} from './constants.js';

/**
 * @typedef {'sphere' | 'box' | 'planar' | 'trump' | 'poop'} CollectibleKind
 * — `planar`: [`money.png`](../assets/money.png); `trump` / `poop`: свои PNG; плоский рендер и падение как у `planar`.
 * `box` зарезервирован.
 */

/**
 * Плоские коллектаблы: та же логика коллизий, но в Three.js — `PlaneGeometry` и «planar» fall.
 * @param {CollectibleKind} kind
 * @returns {boolean}
 */
export function isPlanarCollectibleKind(kind) {
  return kind === 'planar' || kind === 'trump' || kind === 'poop';
}

/**
 * Тип предмета для слота по индексу (должен совпадать с раскладкой в `getCollectibleItems`).
 * Сферы → `planar` (деньги) → `trump` → `poop` (вне кольца денег).
 * @param {number} index
 * @returns {CollectibleKind}
 */
export function getCollectibleSlotKind(index) {
  if (index < COLLECTIBLE_SPHERE_COUNT) return 'sphere';
  if (index < COLLECTIBLE_SPHERE_COUNT + COLLECTIBLE_MONEY_COUNT) return 'planar';
  if (
    index <
    COLLECTIBLE_SPHERE_COUNT +
      COLLECTIBLE_MONEY_COUNT +
      COLLECTIBLE_TRUMP_COUNT
  )
    return 'trump';
  return 'poop';
}

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
  const minSide = Math.min(layout.designWidth, layout.designHeight);
  const rSphere = COLLECTIBLE_CIRCLE_R01 * minSide;
  const rMoney = COLLECTIBLE_MONEY_CIRCLE_R01 * minSide;
  const rTrump = COLLECTIBLE_TRUMP_CIRCLE_R01 * minSide;
  const rPoop = COLLECTIBLE_POOP_CIRCLE_R01 * minSide;
  const out = /** @type {CollectibleItem[]} */ ([]);
  for (let i = 0; i < COLLECTIBLE_SPHERE_COUNT; i++) {
    const a = (i / COLLECTIBLE_SPHERE_COUNT) * Math.PI * 2;
    const dx = rSphere * Math.cos(a);
    const dz = rSphere * Math.sin(a);
    out.push({
      id: `c-${i}`,
      kind: 'sphere',
      mapNx: 0.5 + dx / worldW,
      mapNy: 0.5 + dz / worldH,
      radius01: COLLECTIBLE_RADIUS_01,
    });
  }
  for (let j = 0; j < COLLECTIBLE_MONEY_COUNT; j++) {
    const i = COLLECTIBLE_SPHERE_COUNT + j;
    const a = ((j + 0.5) / COLLECTIBLE_MONEY_COUNT) * Math.PI * 2;
    const dx = rMoney * Math.cos(a);
    const dz = rMoney * Math.sin(a);
    out.push({
      id: `c-${i}`,
      kind: 'planar',
      mapNx: 0.5 + dx / worldW,
      mapNy: 0.5 + dz / worldH,
      radius01: COLLECTIBLE_MONEY_RADIUS_01,
    });
  }
  for (let k = 0; k < COLLECTIBLE_TRUMP_COUNT; k++) {
    const i = COLLECTIBLE_SPHERE_COUNT + COLLECTIBLE_MONEY_COUNT + k;
    const a = Math.PI / 4 + k * (Math.PI / 2);
    const dx = rTrump * Math.cos(a);
    const dz = rTrump * Math.sin(a);
    out.push({
      id: `c-${i}`,
      kind: 'trump',
      mapNx: 0.5 + dx / worldW,
      mapNy: 0.5 + dz / worldH,
      radius01: COLLECTIBLE_TRUMP_RADIUS_01,
    });
  }
  for (let q = 0; q < COLLECTIBLE_POOP_COUNT; q++) {
    const i =
      COLLECTIBLE_SPHERE_COUNT +
      COLLECTIBLE_MONEY_COUNT +
      COLLECTIBLE_TRUMP_COUNT +
      q;
    const a = q * Math.PI;
    const dx = rPoop * Math.cos(a);
    const dz = rPoop * Math.sin(a);
    out.push({
      id: `c-${i}`,
      kind: 'poop',
      mapNx: 0.5 + dx / worldW,
      mapNy: 0.5 + dz / worldH,
      radius01: COLLECTIBLE_POOP_RADIUS_01,
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
