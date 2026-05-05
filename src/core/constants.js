/** Reference aspect (optional tooling); playfield size follows the viewport. */
export const REFERENCE_WIDTH = 390;
export const REFERENCE_HEIGHT = 844;

export const BG_COLOR = 0x88d659;
/** Lighter green splotches on the field. */
export const DECOR_COLOR = 0xa8e879;

export const HOLE_RING_COLOR = 0x55ddff;
export const HOLE_CORE_COLOR = 0x0a0a12;
export const HOLE_INNER_RIM = 0x1a2a4a;
/** Subtle outer stroke (outside the cyan rim), thin and slightly lighter for contrast on the field. */
export const HOLE_OUTLINE_COLOR = 0x4a5c54;

/**
 * Проекция дыры на XZ: слегка эллиптична, как в {@link ../render/three/createHoleView.js}.
 */
export const HOLE_ELLIPSE_X = 1.06;
export const HOLE_ELLIPSE_Z = 0.92;
/** Коэффициент внутри радиуса дыры (около границы тёмного ядра) — для проверки «шар внутри дыры». */
export const HOLE_BALL_EAT_INNER = 0.78;

/**
 * Базовый визуальный/коллайдерный радиус дыры: доля min(designWidth, designHeight) при `size` 1.
 * Рост: `HOLE_RADIUS_GROWTH_PER_SIZE_LEVEL_01` за каждый инкремент уровня `size` (полное заполнение прогресс-бара), верх — `HOLE_RADIUS_MAX_01`.
 */
export const HOLE_RADIUS_BASE_01 = 0.065;
/** Добавка к {@link HOLE_RADIUS_BASE_01} за каждый уровень `size` (не за отдельный собираемый объект). */
export const HOLE_RADIUS_GROWTH_PER_SIZE_LEVEL_01 = 0.0144;
export const HOLE_RADIUS_MAX_01 = 0.108;
/**
 * Замедление от уровня `size`: `speedScale = 1 / (1 + f * steps * (dr/r0))`, где
 * `steps = max(0, sizeLevel - 1)`, `dr` = {@link HOLE_RADIUS_GROWTH_PER_SIZE_LEVEL_01}, `r0` = {@link HOLE_RADIUS_BASE_01}, `f` = это значение.
 */
export const HOLE_SPEED_SIZE_SLOWDOWN = 0.42;
/**
 * Мгновенный вылет визуала дыры при увеличении `holeRadius01`, дальше — сглаживание.
 * `display = target * (1 + HOLE_VISUAL_BUMP_ON_GROW)`.
 */
export const HOLE_VISUAL_BUMP_ON_GROW = 0.18;
/** Скорость сглаживания визуала к целевому r01: `1 - exp(-rate * dt)`. */
export const HOLE_VISUAL_SETTLE_RATE = 7.5;
/**
 * «Отъезд» камеры: frustum/поле ×(1+…* шаг) за каждый уровень `size` &gt; 1; верх, чтобы кадр не уезжал слишком далеко.
 */
export const HOLE_VIEW_ZOOM_PER_SIZE_LEVEL = 0.02;
export const HOLE_VIEW_ZOOM_MAX = 1.2;
/**
 * Сглаживание к целевому зуму: `1 - exp(-rate * dt)`.
 */
export const HOLE_VIEW_ZOOM_SMOOTH_RATE = 2.1;
/** «Удар» при смене целевого зума: сила сотрясения 0..1, амплитуда translate в px, затухание/с. */
export const GAME_VIEW_SHAKE_AMP_PX = 6.5;
export const GAME_VIEW_SHAKE_DECAY = 10;
export const GAME_VIEW_SHAKE_RESONANCE = 1.2;
export const GAME_VIEW_ZOOM_FLASH_MAX = 0.11;
export const GAME_VIEW_ZOOM_FLASH_DECAY = 5.2;

/**
 * Сколько секунд даётся после **первого движения** дыры на сбор **всех** коллектаблов
 * (таймер в HUD стартует в этот момент; до этого показывается полное значение). См. `bootstrap`.
 */
export const ROUND_TIME_SEC = 30;

/**
 * Красные угла и «срочный» режим: последние N секунд таймера; см. `time-urgent-vignette` в `app.css` / `bootstrap`.
 */
export const TIME_URGENT_LAST_SEC = 5;

/** Сферы: внутреннее кольцо вокруг центра карты. */
export const COLLECTIBLE_SPHERE_COUNT = 30;
/** Деньги: внешнее кольцо (дальше от центра, «за» шарами). */
export const COLLECTIBLE_MONEY_COUNT = 40;
/** Портреты `trump.webp`: четыре угла внутри кольца сфер. */
export const COLLECTIBLE_TRUMP_COUNT = 4;
/** `poop.webp`: два слота **снаружи** кольца денег, по горизонтали (0° и 180°). */
export const COLLECTIBLE_POOP_COUNT = 2;
/** Всего слотов = сферы + деньги + trump + poop. */
export const COLLECTIBLE_COUNT =
  COLLECTIBLE_SPHERE_COUNT +
  COLLECTIBLE_MONEY_COUNT +
  COLLECTIBLE_TRUMP_COUNT +
  COLLECTIBLE_POOP_COUNT;
/** Поглощённых объектов (`consumed`) для 100% прогресс-бара под дырой. */
export const COLLECTIBLE_PROGRESS_MAX = 20;
/**
 * Радиус внутреннего круга (сферы): доля min(ширина, высота).
 */
export const COLLECTIBLE_CIRCLE_R01 = 0.38;
/**
 * Радиус круга для `trump`: внутри кольца сфер, доля min стороны; меньше {@link COLLECTIBLE_CIRCLE_R01}.
 */
export const COLLECTIBLE_TRUMP_CIRCLE_R01 = 0.26;
/**
 * Радиус внешнего круга (`planar` / деньги), доля min стороны; больше {@link COLLECTIBLE_CIRCLE_R01}.
 * Согласован с {@link WORLD_MAP_VIEW_MULTIPLIER}, чтобы `mapN` оставались в полосе `getMapPositionBounds01`.
 */
export const COLLECTIBLE_MONEY_CIRCLE_R01 = 0.54;
/**
 * Радиус круга для `poop`: снаружи денег; верхний предел ~`(m−1)/2` при `m =` {@link WORLD_MAP_VIEW_MULTIPLIER}.
 */
export const COLLECTIBLE_POOP_CIRCLE_R01 = 0.68;
/** Базовый радиус объекта (сферы): доля min(ширина, высота). */
export const COLLECTIBLE_RADIUS_01 = 0.023;
/** Размер объектов `planar` на карте (доля min стороны), крупнее сфер; демо — кольцо денег. */
export const COLLECTIBLE_MONEY_RADIUS_01 = 0.09;
/** Размер спрайтов `trump` (доля min стороны). */
export const COLLECTIBLE_TRUMP_RADIUS_01 = 0.085;
/** Размер спрайтов `poop` (доля min стороны). */
export const COLLECTIBLE_POOP_RADIUS_01 = 0.085;
/** Скорость анимации поглощения: рост `t` 0→1 в фазе `falling` (~1/значение ≈ длительность в сек). */
export const COLLECTIBLE_FALL_SPEED = 2.05;
/**
 * Радиус в px (экрана/дизайна), при котором «стоящий» объект начинает тянуться к дыре.
 * Считается в мировых координатах (смещения `mapN` × `worldW/H`), поэтому одинаков для всех лейаутов.
 */
export const COLLECTIBLE_ATTRACT_RADIUS_PX = 20;
/**
 * Скорость скольжения к центру дыры в тех же px, что `mapN × worldW/H`, пока объект `idle`
 * и центр уже внутри радиуса {@link COLLECTIBLE_ATTRACT_RADIUS_PX}.
 */
export const COLLECTIBLE_ATTRACT_PULL_PIX_PER_SEC = 34;
/**
 * Падение: `p = 1 - (1 - t) ** COLLECTIBLE_FALL_POW`, затем позиция и
 * `sc = lerp(1, COLLECTIBLE_FALL_MIN_REL_SC, p)` — как у исходных сфер до `planar`.
 */
export const COLLECTIBLE_FALL_POW = 2.2;
export const COLLECTIBLE_FALL_MIN_REL_SC = 0.04;
/** Порядок отрисовки на полу (дыра рисуется с `renderOrder` до 9). */
export const COLLECTIBLE_RENDER_ORDER_IDLE = 2;
/** Во время падения выше диска дыры, иначе предмет не виден и «сжатие» не читается. */
export const COLLECTIBLE_RENDER_ORDER_FALLING = 14;

/** Procedural decor: count and style. */
export const DECOR_COUNT = 90;
export const DECOR_SEED = 42;

/**
 * World size = viewport size × this (each axis). Logical hole moves on this map; the Pixi
 * playfield scrolls so the hole stays visually centered (Three.js layer).
 */
export const WORLD_MAP_VIEW_MULTIPLIER = 2.4;

/**
 * For a world that is m× the viewport, the hole (camera center) can only use the inner
 * band so the viewport never shows area outside the playfield. mapNx/mapNy in [0,1] are
 * limited to [1/(2m), 1 − 1/(2m)].
 * @returns {{ min: number, max: number }}
 */
export function getMapPositionBounds01() {
  const m = WORLD_MAP_VIEW_MULTIPLIER;
  const t = 1 / (2 * m);
  return { min: t, max: 1 - t };
}
