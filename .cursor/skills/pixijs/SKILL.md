---
name: pixijs
description: >-
  Builds and refactors 2D browser games with PixiJS. Use when the user mentions
  Pixi, PixiJS, sprites, spritesheets, texture atlases, tickers, scenes, cameras,
  particle effects, or canvas game rendering.
---

# PixiJS

## Quick start

1. Confirm target PixiJS version and current rendering setup.
2. Keep gameplay logic, rendering logic, and asset loading separated.
3. Reuse textures and containers; avoid per-frame allocations in hot loops.
4. Verify behavior by running the game and checking FPS or memory regressions.

## Implementation defaults

- Prefer `PIXI.Application` with explicit options (`resizeTo`, `backgroundAlpha`, `antialias`) instead of implicit defaults.
- Load assets through the shared PixiJS asset pipeline and await completion before scene creation.
- Keep update flow deterministic: `deltaMS` input → simulation update → render-side sync.
- Use object pooling for short-lived entities (particles, bullets, floating text).
- Destroy graphics, sprites, and containers when removed from the scene (`destroy({ children: true })` when appropriate).

## Scene and entity structure

- Group code by feature (`scenes/menu`, `scenes/gameplay`, `entities/player`, `ui/hud`).
- Expose scene lifecycle methods: `init`, `enter`, `update`, `exit`, `destroy`.
- Keep entity state in plain objects or classes; keep Pixi display objects as a view layer.
- Route input through a dedicated input module, not directly scattered in scene code.

## Rendering and performance

- Avoid creating new `Text`, `Graphics`, `Sprite`, arrays, or closures each frame.
- Batch where possible: shared textures, stable z-order, and minimal state changes.
- Use `cacheAsBitmap` only for static complex containers; disable if content changes.
- Prefer texture atlases over many standalone files to reduce draw calls and load overhead.
- Throttle expensive debug overlays and logs outside production paths.

## Resize and coordinates

- Implement a single resize handler that updates renderer size and world or UI layout.
- Keep a clear world-vs-screen boundary; convert explicitly.
- For letterboxing, centralize scale calculations to avoid per-scene duplication.

## Debugging checklist

When behavior is wrong or slow:

- Confirm the ticker or update is registered once (no duplicate listeners).
- Check for leaked display objects, listeners, or timers after scene transitions.
- Verify texture keys and atlas frame names match loaded resources.
- Inspect frame-time spikes from allocations, filters, or text regeneration.

## Output requirements

When returning PixiJS changes:

- Explain lifecycle impact (startup, update loop, teardown).
- Note performance-sensitive choices.
- Mention any required asset, path, or config updates.
