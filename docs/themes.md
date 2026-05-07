# Темы

Вся логика тем находится в `src/themes.js`. По сути там экспортируются:

- `getThemeConfig(name)` — даёт нормализованную тему по имени, например `space`.
- `DEFAULT_HOLE_THEME` — тема по-умолчанию, которую использует `createHoleView`, если тема не передана.

Каждая тема описывает:

| Параметр | Что значит |
|----------|-----------|
| `sphereColor` | Один цвет для **всех** шаров, если задан явно; иначе берётся первый цвет из палитры пончиков |
| `sphereColors` | Необязательный массив hex — цвета по кругу для каждого из `COLLECTIBLE_SPHERE_COUNT` шаров; если не задан и нет `sphereColor`, используется яркая палитра «пончиков» в `themes.js` |
| `fieldDecorColors` | Массив длины `FIELD_DECOR_CUBE_COUNT + FIELD_DECOR_TRIANGLE_COUNT`, цвета для полевых кубов и треугольников на поле |
| `planarAssets` | Замена `money.webp` / `trump.webp` / `poop.webp` (пути относительно `src/assets/`) |
| `slotOverrides` | Переопределения по позиции: можно указать `kind` и/или `asset` для отдельного слота `c-<N>`; тема работает только с планарными слотами, но ты сам выбираешь номера без привязки к названию типа |
| `assetReplacements` | Карта `<имя_файла> → <путь>` **или** `<номер>` → `<путь>`; число `1` → `trump.webp`, `2` → `money.webp`, `3` → `poop.webp`; слоты, у которых по умолчанию эти файлы, получат новый `asset` из этой карты |
| `hudIcons` | Перезаписывают HUD-иконки (`planar`, `trump`, `poop`) — указывай путь внутри `src/assets/` |
| `playfieldTheme.backgroundImage` | Необязательный полный URL изображения для фона поля (Pixi): PNG / JPEG / **WebP**; см. тему `city` |

`createHoleView` читает тему через `getThemeConfig(import.meta.env.VITE_THEME)` (см. `src/app/bootstrap.js`) и передаёт результат в `createHoleView`. Поэтому:

1. Добавь тему в `src/themes.js`, добавив новую запись `space: createTheme({ ... })`.
2. В теме укажи `planarAssets`, если нужно заменить стандартные WebP-спрайты, `assetReplacements`, чтобы переопределить все слоты, которые используют конкретный файл (или прямо `c-<N>` по ключу), и/или `slotOverrides`, чтобы привязать новый ассет к отдельной позиции. Пример:

```js
slotOverrides: [
  {
    position: 33, // слот `c-33`, независимо от базового типа
    asset: 'themes/space/alien-ship.svg',
  },
  // Можно повторить для других позиций, даже если ассет один и тот же.
],
```

3. Пути в `asset` — относительно `src/assets/`, то есть `themes/space/alien-ship.svg` загружает `src/assets/themes/space/alien-ship.svg`. Можно использовать SVG, PNG, WebP и т.п.

4. Настраивай цвета шаров: **`sphereColors`** (несколько ярких оттенков) или один **`sphereColor`**, и **`fieldDecorColors`** для декора поля.

5. Убедись, что новые ассеты лежат рядом с остальными в `src/assets/...`, чтобы Vite их паковал.

### Пример темы `space`

В `themes.js` уже описана тема `space`. Она:

- по умолчанию даёт шарам **яркую «пончиковую» палитру** (если не задать свой `sphereColor` / `sphereColors`), а `field decor` — тёплые акценты под космос;
- заменяет все слоты, у которых по умолчанию `trump.webp`, `money.webp` и `poop.webp`, на `src/assets/themes/space/alien-ship.svg`, `src/assets/themes/space/sun.svg` и `src/assets/themes/space/planet.svg`;
- задаёт космический фон: тёмный градиент, тёмно-синие блоки и плотные мелкие звёзды (`playfieldTheme`).
- обновляет HUD-иконки (`planar`, `trump`, `poop`) чтобы они соответствовали космической теме.

Если хочешь добавить другие `space`-ассеты, просто добавь новые `slotOverrides`, цвета и/или `playfieldTheme` в тему.

### Тема `city`

Тема **город** (`city`): чёрная дыра засасывает куски пиццы (`trump`), стаканчики кофе (`money`) и дорожные конусы (`poop`). Растровые ассеты темы — сжатый **WebP** (`themes/city/*.webp`), см. `scripts/optimize-images.py`. Фон поля — WebP-панорама квартала сверху (`playfieldTheme.backgroundImage`), подложка — `backgroundColor`, поверх — лёгкие «огоньки» (`starCount` / `starColor`). Сборка: `npm run build:city` при `VITE_THEME=city`.

Опциональное поле **`backgroundImage`** в `playfieldTheme`: строка-URL (как у `new URL(...).href` в `themes.js`), подхватывается Pixi-слоем поля перед звёздами и декором.

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

### Музыка темы

Каждая тема имеет свой фоновый трек: `src/assets/themes/<id>/music.mp3`.
Файлы генерируются локально через `npm run music:gen` (см.
`tools/music-gen/`), который вызывает Python-скрипт `musicgen.py` с
[Meta MusicGen-small](https://huggingface.co/facebook/musicgen-small)
(open-source, бесплатно, никаких ключей). Prompt'ы — в
`tools/music-gen/themes.mjs`, по культурным брифам из
`tools/theme-gen/briefs/<id>.json`. После генерации ffmpeg делает
trim → `acrossfade` → `loudnorm`, чтобы петля была бесшовной.

Установка зависимостей (один раз):

```bash
pip install -r tools/music-gen/requirements.txt
```

Первый запуск скачает модель (~1.5 GB) в `~/.cache/huggingface/hub`. На
Apple Silicon torch автоматически использует MPS. Время на трек ≈ 1–2
минуты (после загрузки модели).

Полезные команды:

```bash
npm run music:gen                                    # все темы (skip существующих)
FORCE=1 npm run music:gen                            # регенерировать все
node tools/music-gen/cli.mjs jp_kawaii kr_sea_pop    # только указанные
node tools/music-gen/cli.mjs --dry-run               # показать prompt'ы
```

Привязка `music.mp3` → теме идёт автоматически через glob в
`src/themes.js` — никакого ручного импорта не нужно.
