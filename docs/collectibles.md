# Собираемые объекты (collectibles)

Логика «что на поле / что втягивается / что съедено» и коллизия с дырой живут в [`src/core/collectibleState.js`](../src/core/collectibleState.js). Отрисовка в Three.js — в [`src/render/three/createHoleView.js`](../src/render/three/createHoleView.js), игровой цикл — [`src/app/bootstrap.js`](../src/app/bootstrap.js).

## Два уровня данных

1. **`CollectibleItem`** — описание **экземпляра** на уровне: не меняется в рантайме.
   - `id` — строка, удобна для сейвов, аналитики, сопоставления с UI.
   - `kind` — тип визуала/коллайдера: сейчас в коде фактически используется `'sphere'`; в typedef зарезервировано `'box'`.
   - `mapNx`, `mapNy` — позиция на **логической карте** в \([0,1]^2\), в том же пространстве, что `gameState.mapNx` / `mapNy`.
   - `radius01` (опционально) — «радиус» объекта как доля `min(ширина, высота)` дизайн-макета; если не задан, берётся [`COLLECTIBLE_RADIUS_01`](../src/core/constants.js).

2. **`CollectibleRunState`** — **состояние** объекта в текущем запуске:
   - `phase`: `idle` → `falling` → `done`.
   - `t` — нормированный прогресс анимации поглощения, \(0 \ldots 1\), в фазе `falling`.

Массив `CollectibleItem[]` и массив `CollectibleRunState[]` **по длине совпадают** и сопоставляются по индексу: `items[i]` ↔ `runs[i]`.

## Сводка «зона / упало»

```js
getCollectibleZoneSummary(runs)
// { onField, falling, consumed, total }
```

- **onField** — `phase === 'idle'`: на поле, ещё можно подобрать.
- **falling** — в процессе анимации втягивания.
- **consumed** — `phase === 'done'`.
- **total** — длина массива = число слотов (см. `COLLECTIBLE_COUNT`).

## Раскладка на уровне

Функция **`getCollectibleItems(layout)`** строит список предметов **каждый кадр** (и при смене размера вьюпорта): объекты стоят **по кругу** в мировых координатах, центр логически в точке \((0.5, 0.5)\) на карте. Радиус круга задаётся константой `COLLECTIBLE_CIRCLE_R01` (доля `min(designWidth, designHeight)`). Позиция \(i\)-го элемента:

- угол `a = 2π · i / COLLECTIBLE_COUNT`;
- смещение в мире `(dx, dz) = rWorld · (cos a, sin a)`;
- `mapNx = 0.5 + dx / worldW`, `mapNy = 0.5 + dz / worldH`, где `worldW/H` учитывают [`WORLD_MAP_VIEW_MULTIPLIER`](../src/core/constants.js).

Идентификаторы сейчас вида `c-0` … `c-(N-1)`.

## Коллизия с дырой

**`shouldCollectibleBeConsumed(game, layout, run, item)`** возвращает `true`, только если `run.phase === 'idle'`.

Смещение центра объекта относительно центра дыры в мире: те же `worldW`, `worldH`, что у карты. Проверка — попадание в **эллипс** отверстия (как визуал дыры): полуоси пропорциональны `game.holeRadius01` и эллипсу [`HOLE_ELLIPSE_X` / `HOLE_ELLIPSE_Z`](../src/core/constants.js), внутренняя зона съедания — [`HOLE_BALL_EAT_INNER`](../src/core/constants.js). Поправка на размер объекта вшита в сравнение с эллипсом (аналог «радиуса» предмета).

## Тик: порядок операций

В `bootstrap` на каждый кадр:

1. `getCollectibleItems(layout)` — актуальные `items`.
2. Для каждого `i`: если `idle` и `shouldCollectibleBeConsumed` — перевести в `falling`, `t = 0`.
3. `stepCollectibleFall` для каждого ран-стейта (рост `t`, переход в `done`).
4. `holeView.updateCollectibles(runs, layout, { mapNx, mapNy, holeRadius01, holeVnX, holeVnY })` — синхронизация с Three.js.

`holeVnX` / `holeVnY` участвуют в анимации «утаскивания» при падении (направление движения дыры по карте).

## Рендер

В [`createHoleView.js`](../src/render/three/createHoleView.js) у каждого индекса — группа `Group` с мешем. Для `kind === 'sphere'` — общая геометрия `SphereGeometry` и один `MeshStandardMaterial`. Масштаб и Y опираются на `objectWorldR(layout, item)`.

**Расширение новым `kind`:** завести ветку в `makeObjectMesh(kind)` и, при отличии коллизии, передавать индивидуальный `radius01` (или вынести проверку в `collectibleState`).

## Константы ([`constants.js`](../src/core/constants.js))

| Имя | Смысл |
|-----|--------|
| `COLLECTIBLE_COUNT` | Сколько объектов на сцене (круг) |
| `COLLECTIBLE_CIRCLE_R01` | Радиус круга раскладки (доля min стороны) |
| `COLLECTIBLE_RADIUS_01` | Базовый размер объекта, если `item.radius01` нет |
| `COLLECTIBLE_FALL_SPEED` | Скорость нарастания `t` в фазе `falling` |

## Смена уровня / сейв

Сейчас раскладка **процедурная** в `getCollectibleItems`. Для сцен с фиксированным JSON: заменить/обогатить эту функцию, чтобы отдавать свой список `CollectibleItem` (и при необходимости не пересчитывать `mapNx/mapNy` от круга). Ран-стейты пересоздавать через `createCollectibleRunStates()` или вручную под длину списка предметов.
