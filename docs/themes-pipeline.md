# Themes pipeline (`tools/theme-gen`)

Auto-generates localized themes for the playable ad. One brief (`tools/theme-gen/briefs/<id>.json`) → a complete theme: collectible icons and field decor in `src/assets/themes/<id>/`, a parametric SVG background, `src/themes/generated/<id>.js`, `.env.<id>`, and a `build:<id>` script in `package.json`. During `theme:gen`, a report is written under `tools/theme-gen/runs/<timestamp>/<id>/report.md` (screenshots, QA verdict); that tree and `tools/theme-gen/agent-stage/` are local-only (listed in `.gitignore`).

**How themes enter the app:** In **development**, [`src/themes/registry.dev.js`](../src/themes/registry.dev.js) uses `import.meta.glob` to register every `src/themes/generated/*.js` and every `src/assets/themes/*/music.mp3` so `?theme=` works. In **production**, only the theme for `VITE_THEME` is bundled: [`scripts/vite-plugin-active-theme.mjs`](../scripts/vite-plugin-active-theme.mjs) serves a virtual module `virtual:active-theme` with a single theme file + optional `music.mp3` (see [`src/themes.js`](../src/themes.js), `initThemes()`). Hand-authored `space` / `city` live under [`src/themes/manual/`](../src/themes/manual/); `default` remains in `themes.js`.

Per-theme content:

| asset | purpose | format |
|---|---|---|
| `sphere.webp`, `trump.webp`, `money.webp`, `poop.webp` | collectible icons (see [docs/themes.md](themes.md), `assetReplacements`) | 320 px max, alpha + outline + drop shadow |
| `decor_cube.webp`, `decor_triangle.webp` | planar textures for field decor (previously plain `BoxGeometry` / `ConeGeometry`) | 320 px max, alpha + outline + drop shadow |
| `bg.svg` | playfield background | parametric SVG, rasterized by Pixi `Assets.load` |

## Usage

```sh
# All briefs from tools/theme-gen/briefs/
OPENAI_API_KEY=sk-... npm run theme:gen -- --all

# A single brief by id
npm run theme:gen -- --only jp_kawaii

# A single brief by path
npm run theme:gen -- --brief tools/theme-gen/briefs/jp_kawaii.json

# Offline: icons and decor are already staged in
# tools/theme-gen/agent-stage/<id>/{sphere,trump,money,poop,decor_cube,decor_triangle}.png
# (the background is always parametric SVG — no staged PNG needed for it.)
npm run theme:gen -- --all --from-staged tools/theme-gen/agent-stage --no-vision

# Fine-tuning
npm run theme:gen -- --all --retries 4 --no-vision   # more retries, skip vision rubric
```

`OPENAI_API_KEY` is required for `gpt-image-1` (icon and decor generation) and for the vision rubric (`gpt-4o-mini` by default). Without a key you can only run in `--from-staged` mode.

Environment variables:

- `THEME_GEN_BACKEND` — `openai` (default) or `agent` (reserved).
- `THEME_GEN_IMAGE_MODEL` — override `gpt-image-1`.
- `THEME_GEN_VISION_MODEL` — override `gpt-4o-mini`.

## Brief schema

```json
{
  "id": "jp_kawaii",
  "displayName": "JP female 18-34 — kawaii pastel",
  "audience": "...",
  "icons": {
    "sphere": { "concept": "...", "styleNotes": "..." },
    "trump": { "concept": "...", "styleNotes": "..." },
    "money": { "concept": "...", "styleNotes": "..." },
    "poop":  { "concept": "...", "styleNotes": "..." }
  },
  "decor": {
    "cube":     { "concept": "cherry blossom",  "styleNotes": "..." },
    "triangle": { "concept": "dango skewer",    "styleNotes": "..." }
  },
  "background": {
    "concept": "...",
    "styleNotes": "...",
    "paletteHint": "..."
  },
  "backgroundSvg": {
    "kind": "kawaii_dots",
    "palette": {
      "primary":   "#ffb8d4",
      "secondary": "#ff7aa8",
      "accent":    "#ffd28a"
    }
  },
  "playfield": {
    "starColor": 16777215,
    "starCount": 60,
    "starAlpha": 0.4,
    "starSize": 1.1
  }
}
```

`id` is validated against `^[a-z][a-z0-9_]*$` — it is both the theme filename and the key in `package.json`. `playfield.starColor` is an integer 0xRRGGBB (decimal in JSON).

The `sphere` icon replaces the old `SphereGeometry` ring for generated themes through `sphereAsset`; default/manual themes still fall back to geometry when no `sphereAsset` is set. The `trump` / `money` / `poop` slots map to `assetReplacements` `'1' / '2' / '3'` (see [`docs/themes.md`](themes.md)). `decor.cube` / `decor.triangle` are the two field-decor items; they replace the 2 cubes and 4 triangles built in [`createHoleView.js`](../src/render/three/createHoleView.js) when `fieldDecorAssets` is present on the theme.

`background.*` is kept as a fallback prompt for a raster bg in case we ever want to use `gpt-image-1` again. Right now the whole pipeline goes through `backgroundSvg`.

## SVG bg generators (`tools/theme-gen/svgBg/`)

Each generator is a pure function `(opts) => { svg, dominantHex, accentHex }`. The registry lives in [`tools/theme-gen/svgBg/index.mjs`](../tools/theme-gen/svgBg/index.mjs):

| `kind` | style | used by |
|---|---|---|
| `kawaii_dots` | pastel grid + sakura silhouettes + soft radial glow | `jp_kawaii` |
| `neon_grid` | deep navy + neon perspective grid + scanlines | `kr_sea_pop` |
| `paper_festive` | cinnabar base + gold cloud damask + vignette | `zh_urban` |
| `cafe_cobble` | deep navy + warm cobblestones + cream awning stripes | `fr_chic` |
| `brick_warm` | brick-red bond pattern + cream stones + wet sheen | `uk_pub` |
| `beach_mosaic` | turquoise + sun-yellow waves + radial sun motif | `global_fiesta` |

Default size is 1536×1024. Pixi v8 `Assets.load(bg.svg)` rasterizes the SVG into a texture on the fly; `loadThemeAssets` in [`createPlayfield.js`](../src/render/pixi/createPlayfield.js) works unchanged. The run is deterministic with respect to `seed` (defaults to the theme id), so a repeated `theme:gen` produces an identical SVG.

To add a new style, drop `tools/theme-gen/svgBg/<kind>.mjs` (same interface) and register it in `index.mjs`.

## What the pipeline does

1. **Icons and decor** — for `sphere`/`trump`/`money`/`poop`/`decor_cube`/`decor_triangle` it calls `gpt-image-1` (`size: 1024x1024`, `background: transparent`); or reads from the `--from-staged` directory.
2. **Contrast pass** ([`contrastPostProcess`](../tools/theme-gen/optimize.mjs)) — adds an outline (morphological dilation of the alpha mask) and a soft drop shadow around each icon. Outline color is chosen by the icon's mean luma: dark stroke on light icons, light stroke on dark icons. Defaults: `outlineRadius=3`, `outlineAlpha=0.78`, `shadowOffset=4`, `shadowBlur=4`, `shadowAlpha=0.28`. Each subsequent contrast retry strengthens these values.
3. **Optimize** ([`tools/theme-gen/optimize.mjs`](../tools/theme-gen/optimize.mjs)) — `sharp` resizes icons to 320 px on the long edge and encodes WebP with alpha. If the model returned an icon without alpha (it "painted" a checkerboard background), [`ensureTransparentIcon`](../tools/theme-gen/optimize.mjs) runs k-means over the border, masks out the bg by color similarity, and crops to the subject's bounding box.
4. **SVG bg** — `runSvgBg(brief)` reads `backgroundSvg.kind`/`palette` from the brief and writes `bg.svg` into the run folder.
5. **Palette** ([`tools/theme-gen/palette.mjs`](../tools/theme-gen/palette.mjs)) — k-means over opaque icon pixels yields `sphereColors` (10, most saturated); the rasterized SVG bg yields `fieldDecorColors` (2). `backgroundColor` is the `dominantHex` returned by the SVG generator.
6. **Register** ([`tools/theme-gen/register.mjs`](../tools/theme-gen/register.mjs)) — copies WebPs into `src/assets/themes/<id>/`, copies `bg.svg`, writes `src/themes/generated/<id>.js` (with `fieldDecorAssets` and `playfieldTheme.backgroundImage = bg.svg`), `.env.<id>`, and idempotently adds (sorted) `build:<id>` to `package.json`. Production picks up new ids via `vite-plugin-active-theme` when `generated/<id>.js` exists (no separate registry file).
7. **QA loop** (see below). On failure the pipeline only attempts the recovery that matches the failing layer:
   - **contrast** layer fail → re-optimize the offending asset with a stronger outline/shadow (no image regeneration).
   - **static** layer fail → re-optimize the asset with default parameters.
   - **render / vision** fail → regenerate the image via `gpt-image-1` (only when not `--from-staged`).

## Self-recheck (QA)

A theme passes only if all four layers are green:

1. **Static** ([`runStaticChecks`](../tools/theme-gen/qa.mjs)) — every icon (decor included when present) is ≤80 KB and ≤320 px, has an alpha channel, mean corner alpha <16/255 (no leftover background), and overall content-alpha >0.12 (the subject is actually there). For `bg.webp` — ≤350 KB and ≤960 px wide; for `bg.svg` only successful read is required (sizes are not relevant).
2. **Contrast** ([`runContrastCheck`](../tools/theme-gen/qa.mjs)) — for each of `sphere` / `trump` / `money` / `poop` / `decor_cube` / `decor_triangle` it compares mean luma of opaque pixels against the luma of a central 256×256 region of the background. Requires alpha-weighted `|ΔL| ≥ 0.18`. If individual assets fall short, `cli.mjs` runs a contrast retry: it strengthens outline/shadow up to 3 times. Because the retry works on the already-saved raw PNG, it does not call `gpt-image-1`.
3. **Render** ([`runHeadlessRender`](../tools/theme-gen/qa.mjs)) — `npm run build:<id>` → `playwright` chromium opens `dist/index.html` at 390×844, captures three screenshots (t=0, t=2 after a simulated swipe, t=4). Heuristics: luminance variance >4, mean saturation >0.06, not a black frame.
4. **Vision** ([`runVisionRubric`](../tools/theme-gen/qa.mjs)) — `gpt-4o-mini` compares the t=2 screenshot against the brief and replies with strict JSON `{ pass, issues: [{ asset, note }] }`. Failures land in `assetIssues[asset]` and feed the next iteration.

`--no-vision` disables only the last layer, keeping static + contrast + render. `--no-qa` skips the entire QA block (assets are still generated).

## Adding a market

1. Drop `tools/theme-gen/briefs/<id>.json` (see the template above). Pick `backgroundSvg.kind` from the existing styles (or add a new one — see the SVG bg generators section).
2. (Optional) stage icons and decor into `tools/theme-gen/agent-stage/<id>/{sphere,trump,money,poop,decor_cube,decor_triangle}.png` if you want to bypass `gpt-image-1`.
3. `OPENAI_API_KEY=… npm run theme:gen -- --only <id>` or `npm run theme:gen -- --only <id> --from-staged tools/theme-gen/agent-stage`.
4. Done: run `npm run build:<id>` or `vite --mode <id>`.

If the result doesn't look right, tweak `concept` / `styleNotes` in the brief and rerun. The run is deterministic with respect to `id` for k-means and for the SVG generator (the seed is the id), but `gpt-image-1` image generation is non-deterministic — `--retries 4` catches most deviations.

## Current six markets

- `jp_kawaii` — JP, female 18-34, kawaii pastel — `backgroundSvg=kawaii_dots`.
- `kr_sea_pop` — KR + SEA, 16-30, K-pop / boba — `backgroundSvg=neon_grid`.
- `zh_urban` — zh-CN, urban 18-35, modern festive — `backgroundSvg=paper_festive`.
- `fr_chic` — FR + BE + QC, French chic — `backgroundSvg=cafe_cobble`.
- `uk_pub` — UK + IE, 18-30, pub culture — `backgroundSvg=brick_warm`.
- `global_fiesta` — Global en + LATAM, vibrant fiesta — `backgroundSvg=beach_mosaic`.

Per-theme build:

```sh
npm run build:jp_kawaii      # → dist/index.html (single-file playable)
npm run build:kr_sea_pop
npm run build:zh_urban
npm run build:fr_chic
npm run build:uk_pub
npm run build:global_fiesta
```
