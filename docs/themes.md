# Темы

Вся логика тем находится в `src/themes.js`. По сути там экспортируются:

- `getThemeConfig(name)` — даёт нормализованную тему по имени, например `space`.
- `DEFAULT_HOLE_THEME` — тема по-умолчанию, которую использует `createHoleView`, если тема не передана.

Каждая тема описывает:

| Параметр | Что значит |
|----------|-----------|
| `sphereColor` | Цвет всех шарообразных коллектаблов |
| `fieldDecorColors` | Массив длины `FIELD_DECOR_CUBE_COUNT`, цвета для двух квадратиков на поле |
| `planarAssets` | Замена `money.png` / `trump.png` / `poop.png` (пути относительно `src/assets/`) |
| `slotOverrides` | Переопределения по позиции: можно указать `kind` и/или `asset` для отдельного слота `c-<N>`; тема работает только с планарными слотами, но ты сам выбираешь номера без привязки к названию типа |
| `assetReplacements` | Карта `<имя_файла> → <путь>` **или** `<номер>` → `<путь>`; число `1` → `trump.png`, `2` → `money.png`, `3` → `poop.png`; слоты, у которых по умолчанию эти файлы, получат новый `asset` из этой карты |
| `hudIcons` | Перезаписывают HUD-иконки (`planar`, `trump`, `poop`) — указывай путь внутри `src/assets/` |

`createHoleView` читает тему через `getThemeConfig(import.meta.env.VITE_THEME)` (см. `src/app/bootstrap.js`) и передаёт результат в `createHoleView`. Поэтому:

1. Добавь тему в `src/themes.js`, добавив новую запись `space: createTheme({ ... })`.
2. В теме укажи `planarAssets`, если нужно заменить стандартные PNG, `assetReplacements`, чтобы переопределить все слоты, которые используют конкретный файл (или прямо `c-<N>` по ключу), и/или `slotOverrides`, чтобы привязать новый ассет к отдельной позиции. Пример:

```js
slotOverrides: [
  {
    position: 33, // слот `c-33`, независимо от базового типа
    asset: 'themes/space/alien-ship.svg',
  },
  // Можно повторить для других позиций, даже если ассет один и тот же.
],
```

3. Пути в `asset` — относительно `src/assets/`, то есть `themes/space/alien-ship.svg` загружает `src/assets/themes/space/alien-ship.svg`. Можно использовать SVG, PNG и т.п.

4. В той же теме настраивай `sphereColor` и `fieldDecorColors`, чтобы задать атмосферу (например, тёмный фон и холодные квадраты).

5. Убедись, что новые ассеты лежат рядом с остальными в `src/assets/...`, чтобы Vite их паковал.

### Пример темы `space`

В `themes.js` уже описана тема `space`. Она:

- меняет цвет сфер и `field decor` на холодные оттенки;
- заменяет все слоты, у которых по умолчанию `trump.png`, `money.png` и `poop.png`, на `src/assets/themes/space/alien-ship.svg`, `src/assets/themes/space/sun.svg` и `src/assets/themes/space/planet.svg`;
- задаёт космический фон: тёмный градиент, тёмно-синие блоки и плотные мелкие звёзды (`playfieldTheme`).
- обновляет HUD-иконки (`planar`, `trump`, `poop`) чтобы они соответствовали космической теме.

Если хочешь добавить другие `space`-ассеты, просто добавь новые `slotOverrides`, цвета и/или `playfieldTheme` в тему.

### Нумерация слотов

Номера слотов совпадают с порядком `getCollectibleItems(layout)`:

- `0 … COLLECTIBLE_SPHERE_COUNT−1` — сферы (`kind = 'sphere'`).
- `COLLECTIBLE_SPHERE_COUNT … COLLECTIBLE_SPHERE_COUNT + COLLECTIBLE_MONEY_COUNT−1` — деньги (`kind = 'planar'`).
- Следующие `COLLECTIBLE_TRUMP_COUNT` позиций — `trump` по углам.
- Последние `COLLECTIBLE_POOP_COUNT` — `poop`.

Идентификаторы `CollectibleItem` — `c-0`, `c-1`, …; для темы используется именно числовой слой (`position`), а не UUID.

### Сборка с темой

1. Добавь `.env.<тема>` (например, `.env.space`) с `VITE_THEME=space`.
2. В `package.json` заведён скрипт `npm run build:space`. Он запускает сборку с `VITE_THEME=space`.
3. Можно запускать и `npm run dev` — `getThemeConfig` выбирает `default`, пока ты не задашь `VITE_THEME`.

Дополнительная схема слотов и обход `COLLECTIBLE_RING_LAYOUT` описана в [`docs/collectibles.md`](collectibles.md).
