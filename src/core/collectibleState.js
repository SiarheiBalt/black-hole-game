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
 * Одно концентрическое кольцо: порядок в массиве = порядок слотов `c-0 …` в игре.
 * @typedef {Object} CollectibleRingSpec
 * @property {number} count
 * @property {CollectibleKind} kind
 * @property {number} circleR01 — доля `min(designWidth, designHeight)`; радиус кольца в мире
 * @property {number} itemRadius01 — `radius01` каждого предмета на кольце
 * @property {(ringIndex: number, ringCount: number) => number} angleRadians
 */

/**
 * Единственный источник правды для порядка слотов и `getCollectibleSlotKind`.
 * @type {readonly CollectibleRingSpec[]}
 */
export const COLLECTIBLE_RING_LAYOUT = Object.freeze([
  {
    count: COLLECTIBLE_SPHERE_COUNT,
    kind: 'sphere',
    circleR01: COLLECTIBLE_CIRCLE_R01,
    itemRadius01: COLLECTIBLE_RADIUS_01,
    angleRadians: (i, n) => (i / n) * Math.PI * 2,
  },
  {
    count: COLLECTIBLE_MONEY_COUNT,
    kind: 'planar',
    circleR01: COLLECTIBLE_MONEY_CIRCLE_R01,
    itemRadius01: COLLECTIBLE_MONEY_RADIUS_01,
    angleRadians: (i, n) => ((i + 0.5) / n) * Math.PI * 2,
  },
  {
    count: COLLECTIBLE_TRUMP_COUNT,
    kind: 'trump',
    circleR01: COLLECTIBLE_TRUMP_CIRCLE_R01,
    itemRadius01: COLLECTIBLE_TRUMP_RADIUS_01,
    angleRadians: (i) => Math.PI / 4 + i * (Math.PI / 2),
  },
  {
    count: COLLECTIBLE_POOP_COUNT,
    kind: 'poop',
    circleR01: COLLECTIBLE_POOP_CIRCLE_R01,
    itemRadius01: COLLECTIBLE_POOP_RADIUS_01,
    angleRadians: (i) => i * Math.PI,
  },
]);

const _layoutSlotTotal = COLLECTIBLE_RING_LAYOUT.reduce((s, r) => s + r.count, 0);
if (_layoutSlotTotal !== COLLECTIBLE_COUNT) {
  throw new Error(
    `COLLECTIBLE_RING_LAYOUT total ${_layoutSlotTotal} !== COLLECTIBLE_COUNT ${COLLECTIBLE_COUNT}`,
  );
}

/**
 * Имя файла в `src/assets/` для плоского спрайта; ключи должны совпадать с kind в {@link COLLECTIBLE_RING_LAYOUT}.
 * @type {Readonly<Record<'planar' | 'trump' | 'poop', string>>}
 */
export const COLLECTIBLE_PLANAR_SPRITE_FILES = Object.freeze({
  planar: 'money.png',
  trump: 'trump.png',
  poop: 'poop.png',
});

for (const ring of COLLECTIBLE_RING_LAYOUT) {
  if (ring.kind === 'sphere') continue;
  if (
    !Object.prototype.hasOwnProperty.call(
      COLLECTIBLE_PLANAR_SPRITE_FILES,
      ring.kind,
    )
  ) {
    throw new Error(
      `COLLECTIBLE_RING_LAYOUT kind "${ring.kind}" missing in COLLECTIBLE_PLANAR_SPRITE_FILES`,
    );
  }
}

const PLANAR_SPRITE_KINDS = new Set(
  /** @type {CollectibleKind[]} */ (
    Object.keys(COLLECTIBLE_PLANAR_SPRITE_FILES)
  ),
);

/**
 * Плоские коллектаблы: та же логика коллизий, в Three.js — `PlaneGeometry` и planar fall.
 * @param {CollectibleKind} kind
 * @returns {boolean}
 */
export function isPlanarCollectibleKind(kind) {
  return PLANAR_SPRITE_KINDS.has(kind);
}

/**
 * Тип предмета для слота по индексу (совпадает с {@link COLLECTIBLE_RING_LAYOUT}).
 * @param {number} index
 * @returns {CollectibleKind}
 */
export function getCollectibleSlotKind(index) {
  let base = 0;
  for (const ring of COLLECTIBLE_RING_LAYOUT) {
    if (index < base + ring.count) return ring.kind;
    base += ring.count;
  }
  return 'sphere';
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
 * Сколько объектов каждого вида уже провалилось (`phase === 'done'`), по слотам уровня.
 * @param {CollectibleRunState[]} states
 * @returns {{ sphere: number, planar: number, trump: number, poop: number }}
 */
export function getConsumedCountsByKind(states) {
  const counts = { sphere: 0, planar: 0, trump: 0, poop: 0 };
  for (let i = 0; i < states.length; i++) {
    if (states[i].phase !== 'done') continue;
    const k = getCollectibleSlotKind(i);
    if (Object.prototype.hasOwnProperty.call(counts, k)) counts[k] += 1;
  }
  return counts;
}

/**
 * Размер логического мира в тех же единицах, что смещения в `getCollectibleItems` / коллизии.
 * @param {ReturnType<import('./viewport.js').computeLayout>} layout
 * @returns {{ worldW: number, worldH: number }}
 */
export function layoutWorldSize(layout) {
  const m = WORLD_MAP_VIEW_MULTIPLIER;
  return {
    worldW: layout.designWidth * m,
    worldH: layout.designHeight * m,
  };
}

/**
 * @param {number} dx
 * @param {number} worldW
 */
function mapNxFromWorldDx(dx, worldW) {
  return 0.5 + dx / worldW;
}

/**
 * @param {number} dz
 * @param {number} worldH
 */
function mapNyFromWorldDz(dz, worldH) {
  return 0.5 + dz / worldH;
}

/**
 * Позиции и метаданные уровня (круг, центр 0.5/0.5). Пересчитывается при смене layout.
 * @param {ReturnType<import('./viewport.js').computeLayout>} layout
 * @returns {CollectibleItem[]}
 */
export function getCollectibleItems(layout) {
  const { worldW, worldH } = layoutWorldSize(layout);
  const minSide = Math.min(layout.designWidth, layout.designHeight);
  const out = /** @type {CollectibleItem[]} */ ([]);
  let globalIndex = 0;
  for (const ring of COLLECTIBLE_RING_LAYOUT) {
    const rWorld = ring.circleR01 * minSide;
    const n = ring.count;
    for (let i = 0; i < n; i++) {
      const a = ring.angleRadians(i, n);
      const dx = rWorld * Math.cos(a);
      const dz = rWorld * Math.sin(a);
      out.push({
        id: `c-${globalIndex}`,
        kind: ring.kind,
        mapNx: mapNxFromWorldDx(dx, worldW),
        mapNy: mapNyFromWorldDz(dz, worldH),
        radius01: ring.itemRadius01,
      });
      globalIndex += 1;
    }
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

  const { designWidth, designHeight } = layout;
  const { worldW, worldH } = layoutWorldSize(layout);
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
