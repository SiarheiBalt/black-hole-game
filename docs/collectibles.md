# Собираемые объекты (collectibles)

Логика «что на поле / что втягивается / что съедено» и коллизия с дырой живут в [`src/core/collectibleState.js`](../src/core/collectibleState.js). Отрисовка в Three.js — в [`src/render/three/createHoleView.js`](../src/render/three/createHoleView.js), игровой цикл — [`src/app/bootstrap.js`](../src/app/bootstrap.js).

## Каталог ассетов

| id (логический тип) | Файл | `kind` в коде | Описание |
|---------------------|------|---------------|----------|
| Деньги / валюта | [`src/assets/money.png`](../src/assets/money.png) | `planar` | Плоский спрайт на XZ, текстура `money.png`, масштаб по соотношению сторон; та же анимация падения, что у `trump`. |
| Портрет (демо) | [`src/assets/trump.png`](../src/assets/trump.png) | `trump` | Четыре экземпляра по «углам» внутри кольца сфер: углы квадрата на окружности (`π/4 + k·π/2`), радиус [`COLLECTIBLE_TRUMP_CIRCLE_R01`](../src/core/constants.js). Рендер как у `planar`, отдельная текстура в [`createHoleView`](../src/render/three/createHoleView.js). |
| «Какашка» (демо) | [`src/assets/poop.png`](../src/assets/poop.png) | `poop` | Два экземпляра **снаружи** кольца денег ([`COLLECTIBLE_POOP_CIRCLE_R01`](../src/core/constants.js) > [`COLLECTIBLE_MONEY_CIRCLE_R01`](../src/core/constants.js)), по **горизонтали**: углы `0` и `π`. Рендер как у `trump`. |

## Полевые кубы (вне `COLLECTIBLE_RING_LAYOUT`)

Два **процедурных** объекта в Three.js (общая [`BoxGeometry`](../src/render/three/createHoleView.js), без PNG). Стоят на **той же окружности по `rWorld`**, что и `poop` ([`COLLECTIBLE_POOP_CIRCLE_R01`](../src/core/constants.js) · `minSide`), но по **12 и 6 часов**: `dx = 0`, `dz = −rWorld` и `dz = +rWorld` (см. [`getFieldDecorItems`](../src/core/collectibleState.js); экран вверх = −Z в ортокамере [`createHoleView`](../src/render/three/createHoleView.js)).

Идентификаторы `field-decor-0` / `field-decor-1`; длина массива ран-тайма = [`FIELD_DECOR_CUBE_COUNT`](../src/core/collectibleState.js) (константа в [`collectibleState.js`](../src/core/collectibleState.js), не в `constants.js`). Для **`shouldCollectibleBeConsumed`** элементы описаны как **`kind: 'sphere'`** и [`COLLECTIBLE_RADIUS_01`](../src/core/constants.js) — так переиспользуется та же эллиптическая коллизия, что у шаров; визуал и анимация падения — отдельная ветка `applyOneFieldDecorCube` в [`createHoleView`](../src/render/three/createHoleView.js).

Счётчик **`box`** в [`collectibleStatsHud`](../src/ui/collectibleStatsHud.js) заполняется через [`getFieldDecorConsumedCount(fieldDecorRuns)`](../src/core/collectibleState.js) (мердж в `bootstrap` с [`getConsumedCountsByKind`](../src/core/collectibleState.js)); это **не** слот `COLLECTIBLE_RING_LAYOUT`.

Порядок колец и формулы углов — в одном месте: [`COLLECTIBLE_RING_LAYOUT`](../src/core/collectibleState.js) (сумма `count` при старте проверяется на равенство [`COLLECTIBLE_COUNT`](../src/core/constants.js)). [`getCollectibleItems`](../src/core/collectibleState.js) и [`getCollectibleSlotKind`](../src/core/collectibleState.js) строятся из этого массива. PNG для плоских kind — [`COLLECTIBLE_PLANAR_SPRITE_FILES`](../src/core/collectibleState.js); `createHoleView` подгружает их по этой таблице.

## Два уровня данных

1. **`CollectibleItem`** — описание **экземпляра** на уровне: не меняется в рантайме.
   - `id` — строка, удобна для сейвов, аналитики, сопоставления с UI.
   - `kind` — тип визуала/коллайдера для **основных** слотов: `'sphere'`, `'planar'` ([`money.png`](../src/assets/money.png)), `'trump'`, `'poop'`; в типах зарезервировано `'box'`. У **полевых кубов** в данных для коллизии пока стоит `'sphere'` (см. раздел выше), а ключ **`box`** в HUD — отдельный счётчик.
   - `mapNx`, `mapNy` — позиция на **логической карте** в \([0,1]^2\), в том же пространстве, что `gameState.mapNx` / `mapNy`.
   - `radius01` (опционально) — «радиус» объекта как доля `min(ширина, высота)` дизайн-макета; если не задан, берётся [`COLLECTIBLE_RADIUS_01`](../src/core/constants.js).

2. **`CollectibleRunState`** — **состояние** объекта в текущем запуске:
   - `phase`: `idle` → `falling` → `done`.
   - `t` — нормированный прогресс анимации поглощения, \(0 \ldots 1\), в фазе `falling`.
   - `fallSpeed` — скорость роста `t` во время падения.
   - `effectiveMapNx` / `effectiveMapNy` (опционально) — когда дыра в радиусе [`COLLECTIBLE_ATTRACT_RADIUS_PX`](../src/core/constants.js), центр объекта скользит к карте дыры поверх статичной раскладки [`getCollectibleItems`](../src/core/collectibleState.js)/[`getFieldDecorItems`](../src/core/collectibleState.js).

Для **основных** коллектаблов массив [`getCollectibleItems`](../src/core/collectibleState.js) и массив `collectibleRuns` (**длина** [`COLLECTIBLE_COUNT`](../src/core/constants.js)) сопоставляются по индексу: `items[i]` ↔ `collectibleRuns[i]`. Полевые кубы — **отдельные** [`getFieldDecorItems(layout)`](../src/core/collectibleState.js) ↔ `fieldDecorRuns` (длина [`FIELD_DECOR_CUBE_COUNT`](../src/core/collectibleState.js)).

## Сводка «зона / упало»

```js
getCollectibleZoneSummary(runs)
// { onField, falling, consumed, total }
```

- **onField** — `phase === 'idle'`: на поле, ещё можно подобрать.
- **falling** — в процессе анимации втягивания.
- **consumed** — `phase === 'done'`.
- **total** — длина переданного массива (для основного контура — `COLLECTIBLE_COUNT`).

Для **прогресс-бара дыры** и **уровня `size`** используется суммарное число поглощений **основных слотов + полевых кубов**:

```js
getTotalConsumedForProgress(collectibleRuns, fieldDecorRuns)
// = getCollectibleZoneSummary(collectibleRuns).consumed
//   + getFieldDecorConsumedCount(fieldDecorRuns)
```

Оверлей **прогресс-бар** ([`holeProgressBar.js`](../src/ui/holeProgressBar.js)): внутри сегмента значение [`getProgressSegmentConsumed(totalConsumed)`](../src/core/gameState.js) (полный сегмент = [`COLLECTIBLE_PROGRESS_MAX`](../src/core/constants.js), сейчас 20) задаёт долю заполнения; **`totalConsumed`** передаётся из [`bootstrap.js`](../src/app/bootstrap.js). **Радиус** `holeRadius01` и **уровень** `holeSizeLevel` берутся из [`getHoleRadius01FromConsumed`](../src/core/gameState.js) / [`getHoleSizeLevelFromConsumed`](../src/core/gameState.js) с тем же **`totalConsumed`** (ступени размера — не на каждый объект по отдельности). Потолок скорости — [`getHoleMaxSpeedScaleFromSizeLevel`](../src/core/gameState.js) по `holeSizeLevel`.

**Победа** (`Wonderful`): `getCollectibleZoneSummary(collectibleRuns).consumed >= COLLECTIBLE_COUNT` — только основные слоты; полевые кубы **не обязательны**, но ускоряют наполнение бара и переходы `size`.

## Раскладка на уровне

Функция **`getCollectibleItems(layout)`** строит список предметов **каждый кадр** (и при смене размера вьюпорта); центр \((0.5, 0.5)\) на карте.

- **Сферы** (`i = 0 … COLLECTIBLE_SPHERE_COUNT − 1`): `a = 2π · i / COLLECTIBLE_SPHERE_COUNT`, `rWorld = COLLECTIBLE_CIRCLE_R01 · minSide`.
- **`planar`** (`j = 0 … COLLECTIBLE_MONEY_COUNT − 1`, слот `i = COLLECTIBLE_SPHERE_COUNT + j`): угол со сдвигом полушага `a = 2π · (j + 0.5) / COLLECTIBLE_MONEY_COUNT`; `rWorld = COLLECTIBLE_MONEY_CIRCLE_R01 · minSide`.
- **`trump`** (`k = 0 … 3`, слот после денег): `a = π/4 + k · π/2` (углы «квадрата» на окружности); `rWorld = COLLECTIBLE_TRUMP_CIRCLE_R01 · minSide`.
- **`poop`** (`q = 0 … 1`, после trump): `a = q · π`; `rWorld = COLLECTIBLE_POOP_CIRCLE_R01 · minSide` (кольцо **шире**, чем у денег). Полевые кубы используют **тот же** `rWorld`, но не углы `poop`: только смещение по `dz` (см. [`getFieldDecorItems`](../src/core/collectibleState.js)).

Далее `mapNx = 0.5 + dx / worldW`, `mapNy = 0.5 + dz / worldH`, где `worldW/H` = `designWidth/Height ×` [`WORLD_MAP_VIEW_MULTIPLIER`](../src/core/constants.js). Радиусы [`COLLECTIBLE_MONEY_CIRCLE_R01`](../src/core/constants.js) и [`COLLECTIBLE_POOP_CIRCLE_R01`](../src/core/constants.js) согласованы с `m`, чтобы слоты оставались в полосе [`getMapPositionBounds01()`](../src/core/constants.js) (см. также [`hole-control.md`](hole-control.md)).

Идентификаторы сейчас вида `c-0` … `c-(N-1)`.

## Коллизия с дырой

**`shouldCollectibleBeConsumed(game, layout, run, item)`** возвращает `true`, только если `run.phase === 'idle'`. В `bootstrap` в проверке передаётся предмет с **эффективной** позицией после притяжения ([`collectibleItemWithEffective`](../src/core/collectibleState.js)).

Смещение центра объекта относительно центра дыры в мире: те же `worldW`, `worldH`, что у карты. Проверка — попадание в **эллипс** отверстия (как визуал дыры): полуоси пропорциональны `game.holeRadius01` и эллипсу [`HOLE_ELLIPSE_X` / `HOLE_ELLIPSE_Z`](../src/core/constants.js), внутренняя зона съедания — [`HOLE_BALL_EAT_INNER`](../src/core/constants.js). Поправка на размер объекта вшита в сравнение с эллипсом (аналог «радиуса» предмета).

## Тик: порядок операций

В `bootstrap` на каждый кадр (упрощённо):

1. `getCollectibleItems(layout)` — `items` основного контура.
2. Цикл по `i`: при **`idle`** сначала [`stepCollectibleIdleAttract`](../src/core/collectibleState.js); она **сравнивает расстояние** до дыры с суммой её текущего радиуса (в px) и `COLLECTIBLE_ATTRACT_RADIUS_PX`. Если центр ещё вне зоны — смещение сброшено, объект остаётся на слоте; как только нужно притянуть — центр **скользит** к дыре с `COLLECTIBLE_ATTRACT_PULL_PIX_PER_SEC`. Даже если дыра проходит мимо, как только смещение появилось оно **не сбрасывается** и отображается в фактической позиции. По `dt` прокручивается `shouldCollectibleBeConsumed` на `collectibleItemWithEffective(items[i], run)`; при успехе run → `falling`, обнуление смещения, `t = 0`, поп/звук.
3. **`stepCollectibleFall(collectibleRuns[i], …)`**; в **`onDone`** — [`playArrival`](../src/ui/collectibleStatsHud.js) по `kind` слота.
4. `getFieldDecorItems(layout)`; цикл по **`fieldDecorRuns`**: та же схема притягивания по эффективной позиции → **`stepCollectibleFall`**; при старте падения — `holePopScore`, в **`onDone`** — **`playArrival('box', …)`**.
5. **`totalConsumed`** = [`getTotalConsumedForProgress(collectibleRuns, fieldDecorRuns)`](../src/core/collectibleState.js); обновление **`state.holeRadius01`**, **`holeSizeLevel`**, **`holeProgressBar.sync(totalConsumed, …)`**; при **resize** в `applyResizeSync` для всех runs вызывается [`resetCollectibleRunAttractOffset`](../src/core/collectibleState.js), чтобы сбросить смещение притяжения на поле.
6. **`holeView.updateCollectibles(collectibleRuns, layout, g, fieldDecorRuns)`** — Three.js (4-й аргумент опционален в типах, в игре передаётся).

Победа: **`mainConsumed`** = `getCollectibleZoneSummary(collectibleRuns).consumed` ≥ **`COLLECTIBLE_COUNT`**.

`holeVnX` / `holeVnY` участвуют в анимации «утаскивания» при падении (направление движения дыры по карте).

## Рендер

В [`createHoleView.js`](../src/render/three/createHoleView.js) у каждого индекса **основного** списка — группа `Group` с мешем. В `idle` горизонтальная позиция берётся из `effectiveMapNx/Y` стейта, если они заданы, иначе из слотового `item`. Для `kind === 'sphere'` — общая `SphereGeometry` и `MeshStandardMaterial`. Для плоских PNG (`planar`, `trump`, `poop`) — общая `PlaneGeometry` с отдельными `MeshBasicMaterial` и текстурами (`money.png`, `trump.png`, `poop.png`), плоскость на XZ; высота центра в покое ниже (`idleCenterY`). При падении (`planarCollectibleFall`): та же траектория и `sc` по `p`, что у сфер; масштаб на **группе** (`rObj·sc`), у меша снова `(aspect, 1, 1)` — своё соотношение сторон на kind. Поворот только вокруг **мировой Y** (спин). У материалов `depthTest: false`, у мешей `frustumCulled: false`. Опция `collectibleMoneyShadows` — тени у плоских мешей. `planarCollectibleFall: false` отключает спин для плоских kind.

**Полевые кубы:** отдельные группы, ориентация «вершиной вниз», лёгкое вращение вокруг Y в `idle` и при падении, траектория/воронка как у сфер (`applyOneFieldDecorCube`). Позиции задаются **`getFieldDecorItems`** (пересчитывается в `bootstrap` и в `applyFieldDecorCubes`).

**Расширение:** ещё один плоский ассет — либо новый `kind` + ветка и текстура в `createHoleView`, либо обобщение загрузки по таблице `kind → url`.

### Символы в [`collectibleState.js`](../src/core/collectibleState.js) (не в `constants.js`)

| Имя | Смысл |
|-----|--------|
| `FIELD_DECOR_CUBE_COUNT` | Число полевых кубов |
| `getFieldDecorItems` | Псевдо-`CollectibleItem[]` (позиции, коллизия как у шара) |
| `getFieldDecorConsumedCount` | Сколько кубов в `done` |
| `getTotalConsumedForProgress` | Сумма поглощений для бара и `holeSizeLevel` |
| `stepCollectibleIdleAttract` | Притяжение в `idle` внутри радиуса px |
| `collectibleItemWithEffective` | `CollectibleItem` с центром после притяжения для коллизий |
| `resetCollectibleRunAttractOffset` | Сброс `effectiveMapNx`/`effectiveMapNy` при resize |

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
| `COLLECTIBLE_ATTRACT_RADIUS_PX` | Дополнительный запас к текущему `holeRadius01` в px для начала притяжения; после начала смещение не сбрасывается. |
| `COLLECTIBLE_ATTRACT_PULL_PIX_PER_SEC` | Максимальная скорость смещения центра к дыре в `idle` (px/сек). |
| `COLLECTIBLE_FALL_POW` | Степень в `p = 1 - (1 - t)^n` для траектории и `sc` (исходно 2.2) |
| `COLLECTIBLE_FALL_MIN_REL_SC` | Целевой относительный масштаб к концу падения (исходно 0.04) |
| `COLLECTIBLE_RENDER_ORDER_IDLE` / `…_FALLING` | На полу меш ниже диска дыры; во время падения — выше (иначе предмет не виден, сжатие не читается) |

## Смена уровня / сейв

Сейчас раскладка **процедурная** в `getCollectibleItems`; полевые кубы — отдельно в `getFieldDecorItems`. Для сцен с фиксированным JSON: заменить/обогатить эти функции. Ран-стейты основного контура — `createCollectibleRunStates()` или вручную под длину списка; для кубов — **`CollectibleRunState[]` длины `FIELD_DECOR_CUBE_COUNT`**, как в [`bootstrap.js`](../src/app/bootstrap.js).
