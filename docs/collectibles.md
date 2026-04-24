# Собираемые объекты (collectibles)

Логика «что на поле / что втягивается / что съедено» и коллизия с дырой живут в [`src/core/collectibleState.js`](../src/core/collectibleState.js). Отрисовка в Three.js — в [`src/render/three/createHoleView.js`](../src/render/three/createHoleView.js), игровой цикл — [`src/app/bootstrap.js`](../src/app/bootstrap.js).

## Каталог ассетов

| id (логический тип) | Файл | `kind` в коде | Описание |
|---------------------|------|---------------|----------|
| Деньги / валюта | [`src/assets/money.png`](../src/assets/money.png) | `planar` | Плоский спрайт на XZ, текстура `money.png`, масштаб по соотношению сторон; та же анимация падения, что у `trump`. |
| Портрет (демо) | [`src/assets/trump.png`](../src/assets/trump.png) | `trump` | Четыре экземпляра по «углам» внутри кольца сфер: углы квадрата на окружности (`π/4 + k·π/2`), радиус [`COLLECTIBLE_TRUMP_CIRCLE_R01`](../src/core/constants.js). Рендер как у `planar`, отдельная текстура в [`createHoleView`](../src/render/three/createHoleView.js). |
| «Какашка» (демо) | [`src/assets/poop.png`](../src/assets/poop.png) | `poop` | Два экземпляра **снаружи** кольца денег ([`COLLECTIBLE_POOP_CIRCLE_R01`](../src/core/constants.js) > [`COLLECTIBLE_MONEY_CIRCLE_R01`](../src/core/constants.js)), по **горизонтали**: углы `0` и `π`. Рендер как у `trump`. |

Порядок колец и формулы углов — в одном месте: [`COLLECTIBLE_RING_LAYOUT`](../src/core/collectibleState.js) (сумма `count` при старте проверяется на равенство [`COLLECTIBLE_COUNT`](../src/core/constants.js)). [`getCollectibleItems`](../src/core/collectibleState.js) и [`getCollectibleSlotKind`](../src/core/collectibleState.js) строятся из этого массива. PNG для плоских kind — [`COLLECTIBLE_PLANAR_SPRITE_FILES`](../src/core/collectibleState.js); `createHoleView` подгружает их по этой таблице.

## Два уровня данных

1. **`CollectibleItem`** — описание **экземпляра** на уровне: не меняется в рантайме.
   - `id` — строка, удобна для сейвов, аналитики, сопоставления с UI.
   - `kind` — тип визуала/коллайдера: `'sphere'`, `'planar'` ([`money.png`](../src/assets/money.png)), `'trump'`, `'poop'`; зарезервировано `'box'`.
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

Оверлей **прогресс-бар** под визуалом дыры ([`src/ui/holeProgressBar.js`](../src/ui/holeProgressBar.js)): заполнение = `consumed / COLLECTIBLE_PROGRESS_MAX` (сейчас 20 поглощённых = 100% шкалы; значение в [`COLLECTIBLE_PROGRESS_MAX`](../src/core/constants.js)). Обновление в [`bootstrap.js`](../src/app/bootstrap.js) по `getCollectibleZoneSummary(runs).consumed`.

## Раскладка на уровне

Функция **`getCollectibleItems(layout)`** строит список предметов **каждый кадр** (и при смене размера вьюпорта); центр \((0.5, 0.5)\) на карте.

- **Сферы** (`i = 0 … COLLECTIBLE_SPHERE_COUNT − 1`): `a = 2π · i / COLLECTIBLE_SPHERE_COUNT`, `rWorld = COLLECTIBLE_CIRCLE_R01 · minSide`.
- **`planar`** (`j = 0 … COLLECTIBLE_MONEY_COUNT − 1`, слот `i = COLLECTIBLE_SPHERE_COUNT + j`): угол со сдвигом полушага `a = 2π · (j + 0.5) / COLLECTIBLE_MONEY_COUNT`; `rWorld = COLLECTIBLE_MONEY_CIRCLE_R01 · minSide`.
- **`trump`** (`k = 0 … 3`, слот после денег): `a = π/4 + k · π/2` (углы «квадрата» на окружности); `rWorld = COLLECTIBLE_TRUMP_CIRCLE_R01 · minSide`.
- **`poop`** (`q = 0 … 1`, после trump): `a = q · π`; `rWorld = COLLECTIBLE_POOP_CIRCLE_R01 · minSide` (кольцо **шире**, чем у денег).

Далее `mapNx = 0.5 + dx / worldW`, `mapNy = 0.5 + dz / worldH`, где `worldW/H` = `designWidth/Height ×` [`WORLD_MAP_VIEW_MULTIPLIER`](../src/core/constants.js). Радиусы [`COLLECTIBLE_MONEY_CIRCLE_R01`](../src/core/constants.js) и [`COLLECTIBLE_POOP_CIRCLE_R01`](../src/core/constants.js) согласованы с `m`, чтобы слоты оставались в полосе [`getMapPositionBounds01()`](../src/core/constants.js) (см. также [`hole-control.md`](hole-control.md)).

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

В [`createHoleView.js`](../src/render/three/createHoleView.js) у каждого индекса — группа `Group` с мешем. Для `kind === 'sphere'` — общая `SphereGeometry` и `MeshStandardMaterial`. Для плоских PNG (`planar`, `trump`, `poop`) — общая `PlaneGeometry` с отдельными `MeshBasicMaterial` и текстурами (`money.png`, `trump.png`, `poop.png`), плоскость на XZ; высота центра в покое ниже (`idleCenterY`). При падении (`planarCollectibleFall`): та же траектория и `sc` по `p`, что у сфер; масштаб на **группе** (`rObj·sc`), у меша снова `(aspect, 1, 1)` — своё соотношение сторон на kind. Поворот только вокруг **мировой Y** (спин). У материалов `depthTest: false`, у мешей `frustumCulled: false`. Опция `collectibleMoneyShadows` — тени у плоских мешей. `planarCollectibleFall: false` отключает спин для плоских kind.

**Расширение:** ещё один плоский ассет — либо новый `kind` + ветка и текстура в `createHoleView`, либо обобщение загрузки по таблице `kind → url`.

## Константы ([`constants.js`](../src/core/constants.js))

| Имя | Смысл |
|-----|--------|
| `COLLECTIBLE_SPHERE_COUNT` | Число сфер (внутреннее кольцо) |
| `COLLECTIBLE_MONEY_COUNT` | Число объектов `planar` на внешнем кольце (демо — деньги) |
| `COLLECTIBLE_TRUMP_COUNT` | Число объектов `trump` (демо — четыре угла внутри кольца сфер) |
| `COLLECTIBLE_POOP_COUNT` | Число объектов `poop` (демо — два по горизонтали, снаружи денег) |
| `COLLECTIBLE_COUNT` | Всего слотов (`SPHERE` + `MONEY` + `TRUMP` + `POOP`) |
| `COLLECTIBLE_CIRCLE_R01` | Радиус внутреннего круга (сферы) |
| `COLLECTIBLE_TRUMP_CIRCLE_R01` | Радиус круга для `trump` (меньше кольца сфер) |
| `COLLECTIBLE_MONEY_CIRCLE_R01` | Радиус круга `planar` / деньги |
| `COLLECTIBLE_POOP_CIRCLE_R01` | Радиус круга `poop` (больше кольца денег) |
| `COLLECTIBLE_TRUMP_RADIUS_01` | Размер спрайтов `trump` на карте |
| `COLLECTIBLE_POOP_RADIUS_01` | Размер спрайтов `poop` на карте |
| `WORLD_MAP_VIEW_MULTIPLIER` | Множитель размера мира по осям (`worldW/H`); влияет на раскладку и полосу `mapN` ([`hole-control.md`](hole-control.md)) |
| `COLLECTIBLE_RADIUS_01` | Базовый размер сферы, если `item.radius01` нет |
| `COLLECTIBLE_MONEY_RADIUS_01` | Размер `planar` на внешнем кольце (в раскладке задаётся явно) |
| `COLLECTIBLE_FALL_SPEED` | Скорость нарастания `t` в фазе `falling` (выше — быстрее засасывание) |
| `COLLECTIBLE_FALL_POW` | Степень в `p = 1 - (1 - t)^n` для траектории и `sc` (исходно 2.2) |
| `COLLECTIBLE_FALL_MIN_REL_SC` | Целевой относительный масштаб к концу падения (исходно 0.04) |
| `COLLECTIBLE_RENDER_ORDER_IDLE` / `…_FALLING` | На полу меш ниже диска дыры; во время падения — выше (иначе предмет не виден, сжатие не читается) |

## Смена уровня / сейв

Сейчас раскладка **процедурная** в `getCollectibleItems`. Для сцен с фиксированным JSON: заменить/обогатить эту функцию, чтобы отдавать свой список `CollectibleItem` (и при необходимости не пересчитывать `mapNx/mapNy` от круга). Ран-стейты пересоздавать через `createCollectibleRunStates()` или вручную под длину списка предметов.
